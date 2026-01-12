import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

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
  console.log('=== contact-form function invoked ===');
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for RESEND_API_KEY
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured');
      return new Response(JSON.stringify({ 
        error: 'Email service not configured. Please contact support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    let formData: ContactFormRequest;
    try {
      formData = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { firstName, lastName, email, subject, message } = formData;

    console.log('Received contact form submission from:', email);

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get admin email settings
    const { data: emailSettings } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['admin_contact_email', 'email_logo_url', 'email_sender_name', 'email_from_address']);
    
    let adminEmail = '';
    let logoUrl = '';
    let senderName = 'Trading Platform';
    let senderEmail = 'onboarding@resend.dev';
    
    if (emailSettings) {
      const adminSetting = emailSettings.find(s => s.key === 'admin_contact_email');
      const logoSetting = emailSettings.find(s => s.key === 'email_logo_url');
      const nameSetting = emailSettings.find(s => s.key === 'email_sender_name');
      const emailSetting = emailSettings.find(s => s.key === 'email_from_address');
      
      if (adminSetting?.value) {
        adminEmail = typeof adminSetting.value === 'string' ? adminSetting.value : String(adminSetting.value);
      }
      if (logoSetting?.value) {
        logoUrl = typeof logoSetting.value === 'string' ? logoSetting.value : String(logoSetting.value);
      }
      if (nameSetting?.value) {
        const nameValue = typeof nameSetting.value === 'string' ? nameSetting.value : String(nameSetting.value);
        if (nameValue.trim()) senderName = nameValue.trim();
      }
      if (emailSetting?.value) {
        const emailValue = typeof emailSetting.value === 'string' ? emailSetting.value : String(emailSetting.value);
        // Only use custom email if it's from a custom domain
        const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com'];
        const emailDomain = emailValue.split('@')[1]?.toLowerCase();
        if (emailDomain && !freeProviders.includes(emailDomain)) {
          senderEmail = emailValue;
        }
      }
    }

    const fromEmail = `${senderName} <${senderEmail}>`;
    console.log('Using sender:', fromEmail);

    // Save contact form submission to database
    const { error: dbError } = await supabase
      .from('contact_submissions')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        status: 'new'
      });

    if (dbError) {
      console.error('Error saving contact submission:', dbError);
      // Continue to send email even if DB save fails
    } else {
      console.log('Contact submission saved to database');
    }

    // Build logo HTML
    const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="${senderName}" style="max-width: 150px; max-height: 60px; margin-bottom: 15px;" />` : '';

    // Generate email HTML for admin notification
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header img { max-width: 150px; max-height: 60px; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto; }
          .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #555; }
          .value { margin-top: 5px; padding: 10px; background: #f9f9f9; border-radius: 5px; border-left: 3px solid #667eea; }
          .footer { text-align: center; margin-top: 30px; padding: 20px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoHtml}
            <h1 style="margin: 0; font-size: 24px;">New Contact Form Submission</h1>
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
              <div class="value" style="white-space: pre-wrap;">${message}</div>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from ${senderName}.</p>
            <p>© ${new Date().getFullYear()} ${senderName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate confirmation email for user
    const userEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header img { max-width: 150px; max-height: 60px; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto; }
          .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; }
          .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; padding: 20px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoHtml}
            <h1 style="margin: 0; font-size: 24px;">Thank You for Contacting Us!</h1>
          </div>
          <div class="content">
            <p>Dear ${firstName},</p>
            <div class="success">
              <h3>✓ Message Received</h3>
              <p>We have received your message and will get back to you as soon as possible.</p>
            </div>
            <p><strong>Your message:</strong></p>
            <p style="padding: 15px; background: #f9f9f9; border-radius: 5px; border-left: 3px solid #667eea; white-space: pre-wrap;">${message}</p>
            <p>Our team typically responds within 24-48 hours. For urgent matters, please use our emergency contact line.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from ${senderName}.</p>
            <p>© ${new Date().getFullYear()} ${senderName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    let adminEmailSent = false;
    let userEmailSent = false;

    // Send confirmation to user
    try {
      const { error: userEmailError } = await resend.emails.send({
        from: fromEmail,
        to: [email.trim()],
        subject: `Thank you for contacting us - ${subject}`,
        html: userEmailHtml
      });

      if (userEmailError) {
        console.error('Error sending user confirmation email:', userEmailError);
      } else {
        console.log('Confirmation email sent to user:', email);
        userEmailSent = true;
      }
    } catch (err) {
      console.error('Exception sending user email:', err);
    }

    // Send notification to admin if configured
    if (adminEmail && emailRegex.test(adminEmail)) {
      try {
        const { error: adminEmailError } = await resend.emails.send({
          from: fromEmail,
          to: [adminEmail],
          subject: `Contact Form: ${subject}`,
          html: adminEmailHtml,
          reply_to: email.trim()
        });

        if (adminEmailError) {
          console.error('Error sending admin notification email:', adminEmailError);
        } else {
          console.log('Notification email sent to admin:', adminEmail);
          adminEmailSent = true;
        }
      } catch (err) {
        console.error('Exception sending admin email:', err);
      }
    } else {
      console.log('No admin email configured, skipping admin notification');
    }

    console.log('Contact form processed:', { userEmailSent, adminEmailSent });

    return new Response(JSON.stringify({
      success: true,
      message: 'Your message has been sent successfully!'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Unhandled error in contact-form function:", error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process your request. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);