import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'deposit' | 'withdrawal' | 'attention' | 'broadcast' | 'targeted' | 'verification' | 'custom';
  to?: string | string[];
  userId?: string;
  subject: string;
  message: string;
  data?: Record<string, any>;
}

// Helper to validate email format
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const handler = async (req: Request): Promise<Response> => {
  console.log('=== send-email function invoked ===');
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for RESEND_API_KEY
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured');
      return new Response(JSON.stringify({ 
        error: 'Email service not configured. Please add RESEND_API_KEY to edge function secrets.' 
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

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized - No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin', { check_user_id: user.id });
    if (adminError) {
      console.error('Admin check error:', adminError);
    }
    if (!isAdminData) {
      console.error('User is not admin:', user.id);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let emailRequest: EmailRequest;
    try {
      emailRequest = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, to, userId, subject, message, data } = emailRequest;

    console.log('Received email request:', { 
      type, 
      to, 
      userId, 
      subject: subject?.substring(0, 50), 
      hasMessage: !!message 
    });

    // Validate required fields
    if (!type) {
      return new Response(JSON.stringify({ error: 'Email type is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!subject?.trim()) {
      return new Response(JSON.stringify({ error: 'Subject is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let recipients: string[] = [];

    // Get admin email settings for branding
    const { data: emailSettings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['email_from_address', 'email_logo_url']);
    
    if (settingsError) {
      console.error('Error fetching email settings:', settingsError);
    }

    // Use Resend's test domain for sending - this works with any recipient
    // In production, replace with your verified domain
    let fromEmail = 'Trading Platform <onboarding@resend.dev>';
    let logoUrl = '';
    
    if (emailSettings) {
      const logoSetting = emailSettings.find(s => s.key === 'email_logo_url');
      if (logoSetting?.value) {
        logoUrl = typeof logoSetting.value === 'string' ? logoSetting.value : String(logoSetting.value);
      }
      // Note: email_from_address from admin settings is stored but Resend test mode requires onboarding@resend.dev
      // Once you verify your domain in Resend, uncomment the following:
      // const emailSetting = emailSettings.find(s => s.key === 'email_from_address');
      // if (emailSetting?.value) {
      //   const emailValue = typeof emailSetting.value === 'string' ? emailSetting.value : String(emailSetting.value);
      //   fromEmail = `Trading Platform <${emailValue}>`;
      // }
    }

    // Determine recipients based on email type
    if (type === 'broadcast') {
      // Send to all users
      console.log('Fetching all users for broadcast...');
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) {
        console.error('Error fetching users for broadcast:', usersError);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch users for broadcast',
          details: usersError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      recipients = users.users.map(u => u.email!).filter(Boolean);
      console.log(`Found ${recipients.length} users for broadcast`);
    } else if (userId) {
      // Send to specific user by userId
      console.log('Fetching user by ID:', userId);
      const { data: targetUser, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError) {
        console.error('Error fetching user by ID:', userError);
        return new Response(JSON.stringify({ 
          error: 'Failed to find user',
          details: userError.message 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (targetUser.user.email) {
        recipients = [targetUser.user.email];
        console.log('Found user email:', targetUser.user.email);
      } else {
        return new Response(JSON.stringify({ error: 'User has no email address' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (to) {
      // Direct email addresses provided
      const emailList = Array.isArray(to) ? to : [to];
      recipients = emailList.filter(email => {
        if (!email || typeof email !== 'string') return false;
        return isValidEmail(email.trim());
      }).map(e => e.trim());
      console.log('Using provided email addresses:', recipients);
    }

    if (recipients.length === 0) {
      console.error('No valid recipients found', { type, to, userId });
      return new Response(JSON.stringify({ 
        error: 'No valid recipients found. Please select a user or enter a valid email address.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate HTML based on email type
    const htmlContent = generateEmailHTML(type, subject, message, data, logoUrl);

    console.log(`Sending email to ${recipients.length} recipient(s)...`);

    // Send emails
    const results: { email: string; success: boolean; error?: string }[] = [];
    
    for (const email of recipients) {
      try {
        const { data: sendData, error: sendError } = await resend.emails.send({
          from: fromEmail,
          to: [email],
          subject: subject,
          html: htmlContent,
        });

        if (sendError) {
          console.error(`Failed to send to ${email}:`, sendError);
          results.push({ email, success: false, error: sendError.message });
        } else {
          console.log(`Successfully sent to ${email}, ID:`, sendData?.id);
          results.push({ email, success: true });
        }
      } catch (sendErr: any) {
        console.error(`Exception sending to ${email}:`, sendErr);
        results.push({ email, success: false, error: sendErr.message });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Email batch complete: ${successful} successful, ${failed} failed`);

    if (successful === 0) {
      const firstError = results.find(r => r.error)?.error || 'Unknown error';
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to send emails: ${firstError}`,
        sent: 0,
        failed: failed,
        details: results
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      sent: successful,
      failed: failed,
      total: recipients.length,
      message: `Email sent successfully to ${successful} recipient(s)`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Unhandled error in send-email function:", error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

function generateEmailHTML(
  type: string,
  subject: string,
  message: string,
  data?: Record<string, any>,
  logoUrl?: string
): string {
  const styles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
      .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
      .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 5px; }
      .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; border-radius: 5px; }
      .error { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0; border-radius: 5px; }
    </style>
  `;

  let content = '';
  
  switch (type) {
    case 'deposit':
      content = `
        <div class="success">
          <h3>✓ Deposit Approved</h3>
          <p>Your deposit of <strong>${data?.amount || 'N/A'}</strong> has been approved and added to your account.</p>
        </div>
        <p>${message}</p>
      `;
      break;
    case 'withdrawal':
      content = `
        <div class="success">
          <h3>✓ Withdrawal Processed</h3>
          <p>Your withdrawal of <strong>${data?.amount || 'N/A'}</strong> has been processed successfully.</p>
          ${data?.transactionId ? `<p>Transaction ID: <code>${data.transactionId}</code></p>` : ''}
        </div>
        <p>${message}</p>
      `;
      break;
    case 'attention':
      content = `
        <div class="alert">
          <h3>⚠️ Important Notice</h3>
        </div>
        <p>${message}</p>
      `;
      break;
    case 'verification':
      content = `
        <div class="success">
          <h3>✓ Account Verified</h3>
          <p>Congratulations! Your account has been successfully verified.</p>
          <p>You now have full access to all trading features.</p>
        </div>
        <p>${message}</p>
      `;
      break;
    default:
      // Custom, broadcast, targeted - just show the message
      content = `<p style="white-space: pre-wrap;">${message}</p>`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${styles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width: 150px; margin-bottom: 10px;" />` : ''}
          <h1 style="margin: 0;">Trading Platform</h1>
        </div>
        <div class="content">
          <h2 style="margin-top: 0;">${subject}</h2>
          ${content}
          ${data?.additionalInfo ? `<p>${data.additionalInfo}</p>` : ''}
        </div>
        <div class="footer">
          <p>This is an automated message from Trading Platform.</p>
          <p>© ${new Date().getFullYear()} Trading Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
