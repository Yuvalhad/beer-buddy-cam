import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMediaEmailRequest {
  email: string;
  fileUrl: string;
  mediaType: 'photo' | 'gif' | 'video';
  fileData?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fileUrl, mediaType, fileData }: SendMediaEmailRequest = await req.json();
    
    console.log('📧 Sending media email to:', email);
    console.log('📎 Media type:', mediaType);
    console.log('🔗 File URL:', fileUrl);

    if (!email || !fileUrl || !mediaType) {
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
        subject: `${mediaTypeEmoji[mediaType]} היצירה שלך מ-Beer Buddy מוכנה!`,
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
            .download-btn {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 16px 40px;
              border-radius: 50px;
              font-weight: bold;
              font-size: 18px;
              box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
              transition: transform 0.2s;
            }
            .download-btn:hover {
              transform: translateY(-2px);
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
              <h2>ה${mediaTypeHebrew[mediaType]} שלך מוכן${mediaType === 'photo' ? 'ה' : ''}! 🎉</h2>
              <p>
                תודה שהשתמשת ב-Beer Buddy!<br>
                ה${mediaTypeHebrew[mediaType]} המדהים${mediaType === 'photo' ? 'ה' : ''} שלך ממתין${mediaType === 'photo' ? 'ה' : ''} לך למטה.
              </p>
              
              ${mediaType === 'video' ? `
                <div class="media-preview">
                  <video controls style="width: 100%;">
                    <source src="${fileUrl}" type="video/mp4">
                  </video>
                </div>
              ` : mediaType === 'gif' ? `
                <div class="media-preview">
                  <video autoplay loop muted playsinline style="width: 100%;">
                    <source src="${fileUrl}" type="video/webm">
                  </video>
                </div>
              ` : fileData ? `
                <div class="media-preview">
                  <img src="${fileData}" alt="התמונה שלך" />
                </div>
              ` : ''}
              
              <a href="${fileUrl}" class="download-btn" download>
                📥 הורד עכשיו
              </a>
              
              <p style="margin-top: 30px; font-size: 14px; color: #999;">
                הקישור תקף למשך 7 ימים
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
