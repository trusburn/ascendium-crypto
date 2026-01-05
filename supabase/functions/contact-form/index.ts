import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactFormRequest {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData: ContactFormRequest = await req.json();
    const { firstName, lastName, email, subject, message } = formData;

    // Validate required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get admin email settings
    const { data: emailSettings } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['email_from_address', 'email_logo_url', 'admin_contact_email']);
    
    let fromEmail = 'noreply@resend.dev';
    let adminEmail = 'admin@example.com';
    let logoUrl = '';
    
    if (emailSettings) {
      const fromSetting = emailSettings.find(s => s.key === 'email_from_address');
      const adminSetting = emailSettings.find(s => s.key === 'admin_contact_email');
      const logoSetting = emailSettings.find(s => s.key === 'email_logo_url');
      
      if (fromSetting?.value) {
        fromEmail = typeof fromSetting.value === 'string' ? fromSetting.value : String(fromSetting.value);
      }
      if (adminSetting?.value) {
        adminEmail = typeof adminSetting.value === 'string' ? adminSetting.value : String(adminSetting.value);
      } else if (fromSetting?.value) {
        // Fallback to from address if no admin contact email set
        adminEmail = typeof fromSetting.value === 'string' ? fromSetting.value : String(fromSetting.value);
      }
      if (logoSetting?.value) {
        logoUrl = typeof logoSetting.value === 'string' ? logoSetting.value : String(logoSetting.value);
      }
    }

    // Save contact form submission to database
    const { error: dbError } = await supabase
      .from('contact_submissions')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email,
        subject: subject,
        message: message,
        status: 'new'
      });

    if (dbError) {
      console.error('Error saving contact submission:', dbError);
      // Continue to send email even if DB save fails
    }

    // Send email to admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #555; }
          .value { margin-top: 5px; padding: 10px; background: white; border-radius: 5px; border-left: 3px solid #667eea; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width: 150px; margin-bottom: 10px;" />` : ''}
            <h1>New Contact Form Submission</h1>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Name:</div>
              <div class="value">${firstName} ${lastName}</div>
            </div>
            <div class="field">
              <div class="label">Email:</div>
              <div class="value">${email}</div>
            </div>
            <div class="field">
              <div class="label">Subject:</div>
              <div class="value">${subject}</div>
            </div>
            <div class="field">
              <div class="label">Message:</div>
              <div class="value">${message}</div>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from your trading platform.</p>
            <p>© ${new Date().getFullYear()} Trading Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to admin
    const { error: adminEmailError } = await resend.emails.send({
      from: `Trading Platform <${fromEmail}>`,
      to: [adminEmail],
      subject: `Contact Form: ${subject}`,
      html: adminEmailHtml,
      reply_to: email
    });

    if (adminEmailError) {
      console.error('Error sending admin email:', adminEmailError);
    }

    // Send confirmation to user
    const userEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width: 150px; margin-bottom: 10px;" />` : ''}
            <h1>Thank You for Contacting Us!</h1>
          </div>
          <div class="content">
            <p>Dear ${firstName},</p>
            <div class="success">
              <h3>✓ Message Received</h3>
              <p>We have received your message and will get back to you as soon as possible.</p>
            </div>
            <p><strong>Your message:</strong></p>
            <p style="padding: 15px; background: white; border-radius: 5px; border-left: 3px solid #667eea;">${message}</p>
            <p>Our team typically responds within 24-48 hours. For urgent matters, please use our emergency contact line.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Trading Platform.</p>
            <p>© ${new Date().getFullYear()} Trading Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error: userEmailError } = await resend.emails.send({
      from: `Trading Platform <${fromEmail}>`,
      to: [email],
      subject: `Thank you for contacting us - ${subject}`,
      html: userEmailHtml
    });

    if (userEmailError) {
      console.error('Error sending user confirmation email:', userEmailError);
    }

    console.log('Contact form processed successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Your message has been sent successfully!'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Error in contact-form function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
