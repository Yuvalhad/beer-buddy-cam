import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Themed prompts -------------------------------------------------------
// The whole point of the booth: the captured person is dropped into a scene.
// Add new themes here and pass `theme` from the client to switch.
const THEMES: Record<string, { label: string; prompt: string }> = {
  pilot: {
    label: "טייס אל על",
    prompt:
      "Transform this photograph: place the EXACT SAME person in the cockpit of a commercial passenger airplane, " +
      "dressed as an El Al airline captain wearing a dark navy pilot uniform with golden epaulettes and a pilot's cap. " +
      "The person is sitting in the captain's seat, hands near the controls, looking directly at the camera with a confident smile. " +
      "Cockpit instruments, glowing buttons and the windshield with sky visible in the background. " +
      "CRITICAL: keep the person's face, identity and features EXACTLY the same and clearly recognizable. " +
      "Photorealistic, sharp, cinematic professional lighting.",
  },
  astronaut: {
    label: "אסטרונאוט",
    prompt:
      "Transform this photograph: place the EXACT SAME person inside a spaceship as an astronaut wearing a white NASA-style " +
      "space suit with the helmet off, floating in zero gravity, looking directly at the camera. Earth and stars visible " +
      "through a window behind. CRITICAL: keep the person's face and identity EXACTLY the same and recognizable. " +
      "Photorealistic, cinematic lighting.",
  },
  chef: {
    label: "שף",
    prompt:
      "Transform this photograph: place the EXACT SAME person in a professional restaurant kitchen as a master chef wearing " +
      "a white chef jacket and hat, holding a pan with flames, looking directly at the camera with a confident smile. " +
      "CRITICAL: keep the person's face and identity EXACTLY the same and recognizable. Photorealistic, warm cinematic lighting.",
  },
};

const DEFAULT_THEME = "pilot";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, email, theme } = await req.json();

    if (!imageData) {
      throw new Error("imageData is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const selectedTheme = THEMES[theme] ?? THEMES[DEFAULT_THEME];
    console.log(`📸 Photo booth request | theme: ${theme ?? DEFAULT_THEME} | email: ${email ?? "—"}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Run the slow AI generation and the original-image upload at the same time.
    const aiGenPromise = generateThemedImage(LOVABLE_API_KEY, selectedTheme.prompt, imageData);
    const originalUploadPromise = uploadDataUrl(supabase, imageData, "original");

    const [aiImageDataUrl, originalUrl] = await Promise.all([aiGenPromise, originalUploadPromise]);

    // AI image is ready as a base64 data URL — upload it too.
    const aiUrl = await uploadDataUrl(supabase, aiImageDataUrl, "ai");

    // Record both in the DB (best effort, don't block the response).
    supabase
      .from("shared_media")
      .insert([
        { file_path: originalUrl.fileName, media_type: "photo", email: email ?? null },
        { file_path: aiUrl.fileName, media_type: "photo", email: email ?? null },
      ])
      .then(({ error }) => error && console.error("DB insert error:", error));

    // Fire the email in the background so the user gets their result immediately.
    if (email) {
      const emailPromise = sendBoothEmail(email, originalUrl.publicUrl, aiUrl.publicUrl, selectedTheme.label);
      // @ts-ignore - EdgeRuntime is provided by the Supabase runtime
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(emailPromise.catch((e) => console.error("Email send failed:", e)));
      } else {
        emailPromise.catch((e) => console.error("Email send failed:", e));
      }
    }

    return new Response(
      JSON.stringify({
        originalUrl: originalUrl.publicUrl,
        aiUrl: aiUrl.publicUrl,
        theme: selectedTheme.label,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ Error in photo-booth function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// --- Helpers --------------------------------------------------------------

async function generateThemedImage(apiKey: string, prompt: string, imageData: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageData } },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    if (response.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    if (response.status === 402) throw new Error("Payment required. Please add credits to your workspace.");
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!editedImageUrl) throw new Error("No image returned from AI");
  return editedImageUrl;
}

async function uploadDataUrl(
  supabase: ReturnType<typeof createClient>,
  dataUrl: string,
  kind: "original" | "ai",
): Promise<{ publicUrl: string; fileName: string }> {
  const blob = await (await fetch(dataUrl)).blob();
  const fileName = `booth-${kind}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;

  const { error } = await supabase.storage.from("shared-media").upload(fileName, blob, {
    contentType: "image/jpeg",
    cacheControl: "604800",
  });
  if (error) throw error;

  const { data } = supabase.storage.from("shared-media").getPublicUrl(fileName);
  return { publicUrl: data.publicUrl, fileName };
}

async function sendBoothEmail(email: string, originalUrl: string, aiUrl: string, themeLabel: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured — skipping email");
    return;
  }

  const html = `
  <!DOCTYPE html>
  <html dir="rtl" lang="he">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body style="font-family: 'Segoe UI', Tahoma, sans-serif; background:#0f172a; margin:0; padding:24px;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:20px; overflow:hidden;">
      <div style="background:linear-gradient(135deg,#dc2626,#7f1d1d); color:#fff; padding:32px 20px; text-align:center;">
        <h1 style="margin:0; font-size:28px;">📸 עמדת הצילום</h1>
        <p style="margin:8px 0 0; opacity:.9;">תמה: ${themeLabel}</p>
      </div>
      <div style="padding:28px 24px; text-align:center;">
        <h2 style="color:#111; margin:0 0 6px;">🤖 התמונה שנוצרה ב-AI</h2>
        <img src="${aiUrl}" alt="AI" style="width:100%; border-radius:14px; margin:8px 0 28px;" />
        <h2 style="color:#111; margin:0 0 6px;">📷 התמונה המקורית</h2>
        <img src="${originalUrl}" alt="Original" style="width:100%; border-radius:14px; margin:8px 0;" />
        <p style="margin-top:24px; font-size:13px; color:#999;">הקישורים תקפים למשך 7 ימים</p>
      </div>
    </div>
  </body>
  </html>`;

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Photo Booth <onboarding@resend.dev>",
      to: [email],
      subject: `📸 התמונות שלך מעמדת הצילום (${themeLabel}) מוכנות!`,
      html,
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    throw new Error(`Resend API error: ${emailResponse.status} - ${errorText}`);
  }
  console.log("✅ Booth email sent to", email);
}
