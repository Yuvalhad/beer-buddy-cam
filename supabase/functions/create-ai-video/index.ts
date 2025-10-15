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
    const { imageData } = await req.json();
    console.log('Received video generation request');

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    // VEO API endpoint - using Vertex AI
    // Note: This is a placeholder - actual VEO API might differ
    const response = await fetch('https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT/locations/us-central1/publishers/google/models/veo-3:predict', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{
          prompt: 'אנשים מחזיקים כוס בירה ביד ורוקדים בשמחה, סגנון ריאליסטי, תנועות טבעיות, תאורה חגיגית',
          image: imageData,
          duration: 5, // 5 seconds
          aspectRatio: '16:9'
        }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('VEO API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`VEO API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('VEO response received');
    
    const videoUrl = data.predictions?.[0]?.videoUri;
    
    if (!videoUrl) {
      throw new Error('No video returned from VEO');
    }

    return new Response(
      JSON.stringify({ videoUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-ai-video function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
