import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, backgroundData, backgroundType = 'image' } = await req.json();
    console.log('Received background change request, type:', backgroundType);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let prompt: string;
    if (backgroundType === 'solid') {
      prompt = `Replace the background of this image with a clean, solid colored background (${backgroundData}). Keep the person/subject perfectly intact and sharp. Make the background uniform and smooth with the specified color.`;
    } else if (backgroundType === 'preset') {
      // Preset backgrounds
      const presets: Record<string, string> = {
        beach: 'a beautiful sunny beach with turquoise ocean and white sand',
        mountain: 'stunning snow-capped mountains with blue sky',
        city: 'a modern city skyline at sunset',
        nature: 'a lush green forest with sunlight filtering through trees',
        party: 'a festive party atmosphere with colorful decorations and lights',
        office: 'a modern professional office space',
        cafe: 'a cozy coffee shop interior with warm lighting',
        studio: 'a professional photography studio with soft lighting'
      };
      const backgroundDesc = presets[backgroundData] || presets.beach;
      prompt = `Replace the background of this image with ${backgroundDesc}. Keep the person/subject perfectly intact, sharp, and naturally lit to match the new background. Make it look photorealistic and professionally edited.`;
    } else {
      // Custom background image
      prompt = 'Analyze both images. Replace the background of the first image with the background from the second image. Keep the person/subject from the first image perfectly intact and sharp. Blend the lighting naturally so the person looks like they were actually photographed in the new background. Make it look photorealistic.';
    }

    const content: any[] = [
      {
        type: 'text',
        text: prompt
      },
      {
        type: 'image_url',
        image_url: {
          url: imageData
        }
      }
    ];

    // Add custom background image if provided
    if (backgroundType === 'image' && backgroundData) {
      content.push({
        type: 'image_url',
        image_url: {
          url: backgroundData
        }
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!editedImageUrl) {
      throw new Error('No image returned from AI');
    }

    return new Response(
      JSON.stringify({ editedImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in change-background function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
