import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMediaEmailRequest {
  email: string;
  fileUrls: string[];
  mediaType: 'photo' | 'gif' | 'video';
  count: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fileUrls, mediaType, count }: SendMediaEmailRequest = await req.json();
    
    console.log('📧 Sending media email to:', email);
    console.log('📎 Media type:', mediaType);
    console.log('📷 Number of files:', count);

    if (!email || !fileUrls || !Array.isArray(fileUrls) || fileUrls.length === 0) {
      throw new Error('Missing required fields');
    }

    const mediaTypeHebrew = {
      'photo': 'תמונה',
      'gif': 'GIF',
      'video': 'סרטון'
    };

    const mediaTypeEmoji = {
      'photo': '📸',
      'gif': '🎬',
      'video': '✨'
    };

    // Build media preview for multiple images
    const mediaPreviewsHtml = fileUrls.map((url, index) => {
      if (mediaType === 'video') {
        return `
          <div class="media-preview" style="margin: 20px 0;">
            <p style="font-weight: bold; margin-bottom: 10px;">סרטון ${index + 1}</p>
            <video controls style="width: 100%;">
              <source src="${url}" type="video/mp4">
            </video>
          </div>
        `;
      } else if (mediaType === 'gif') {
        return `
          <div class="media-preview" style="margin: 20px 0;">
            <p style="font-weight: bold; margin-bottom: 10px;">GIF ${index + 1}</p>
            <video autoplay loop muted playsinline style="width: 100%;">
              <source src="${url}" type="video/webm">
            </video>
          </div>
        `;
      } else {
        return `
          <div class="media-preview" style="margin: 20px 0;">
            <p style="font-weight: bold; margin-bottom: 10px; color: #333;">תמונה ${index + 1}</p>
            <img src="${url}" alt="תמונה ${index + 1}" style="width: 100%; border-radius: 10px;" />
          </div>
        `;
      }
    }).join('');

    const pluralTitle = count > 1 
      ? `${count} ${mediaTypeHebrew[mediaType]}${mediaType === 'photo' ? 'ות' : 'ים'} שלך`
      : `ה${mediaTypeHebrew[mediaType]} שלך`;

    // Send email using Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Beer Buddy <onboarding@resend.dev>",
        to: [email],
        subject: `${mediaTypeEmoji[mediaType]} ${pluralTitle} מ-Beer Buddy ${count > 1 ? 'מוכנים' : 'מוכן'}!`,
        html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: bold;
            }
            .content {
              padding: 40px 30px;
              text-align: center;
            }
            .content h2 {
              color: #333;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .content p {
              color: #666;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 30px;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #999;
              font-size: 14px;
            }
            .media-preview {
              margin: 30px 0;
              border-radius: 15px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .media-preview img, .media-preview video {
              max-width: 100%;
              height: auto;
              display: block;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${mediaTypeEmoji[mediaType]} Beer Buddy ${mediaTypeEmoji[mediaType]}</h1>
            </div>
            <div class="content">
              <h2>${pluralTitle} ${count > 1 ? 'מוכנים' : 'מוכן'}! 🎉</h2>
              <p>
                תודה שהשתמשת ב-Beer Buddy!<br>
                ${count > 1 ? `${count} ${mediaTypeHebrew[mediaType]}${mediaType === 'photo' ? 'ות' : 'ים'} מדהימים` : `ה${mediaTypeHebrew[mediaType]} המדהים`} שלך ממתינ${count > 1 ? 'ים' : mediaType === 'photo' ? 'ה' : ''} לך למטה.
              </p>
              
              ${mediaPreviewsHtml}
              
              <p style="margin-top: 30px; font-size: 14px; color: #999;">
                ${count > 1 ? 'הקישורים תקפים' : 'הקישור תקף'} למשך 7 ימים
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">
                נוצר עם ❤️ על ידי Beer Buddy<br>
                <strong>L'Chaim! 🍻</strong>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${emailResponse.status} - ${errorText}`);
    }

    const emailData = await emailResponse.json();

    console.log("✅ Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in send-media-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
