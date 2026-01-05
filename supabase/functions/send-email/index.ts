import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: isAdminData } = await supabase.rpc('is_admin', { check_user_id: user.id });
    if (!isAdminData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailRequest: EmailRequest = await req.json();
    const { type, to, userId, subject, message, data } = emailRequest;

    console.log('Received email request:', { type, to, userId, subject: subject?.substring(0, 50), hasMessage: !!message });

    // Validate required fields
    if (!type) {
      return new Response(JSON.stringify({ error: 'Email type is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!subject || !message) {
      return new Response(JSON.stringify({ error: 'Subject and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let recipients: string[] = [];

    // Get admin email settings
    const { data: emailSettings } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['email_from_address', 'email_logo_url']);
    
    let fromEmail = 'Trading Platform <onboarding@resend.dev>';
    let logoUrl = '';
    
    if (emailSettings) {
      const emailSetting = emailSettings.find(s => s.key === 'email_from_address');
      const logoSetting = emailSettings.find(s => s.key === 'email_logo_url');
      
      if (emailSetting?.value) {
        const emailValue = typeof emailSetting.value === 'string' ? emailSetting.value : String(emailSetting.value);
        fromEmail = `Trading Platform <${emailValue}>`;
      }
      if (logoSetting?.value) {
        logoUrl = typeof logoSetting.value === 'string' ? logoSetting.value : String(logoSetting.value);
      }
    }

    // Determine recipients based on email type
    if (type === 'broadcast') {
      // Send to all users
      console.log('Fetching all users for broadcast...');
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) {
        console.error('Error fetching users for broadcast:', usersError);
        throw usersError;
      }
      recipients = users.users.map(u => u.email!).filter(Boolean);
      console.log(`Found ${recipients.length} users for broadcast`);
    } else if ((type === 'targeted' || type === 'custom' || type === 'deposit' || type === 'withdrawal' || type === 'attention' || type === 'verification') && userId) {
      // Send to specific user by userId
      console.log('Fetching user by ID:', userId);
      const { data: targetUser, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError) {
        console.error('Error fetching user by ID:', userError);
        throw userError;
      }
      if (targetUser.user.email) {
        recipients = [targetUser.user.email];
        console.log('Found user email:', targetUser.user.email);
      }
    } else if (to) {
      // Direct email addresses provided
      const emailList = Array.isArray(to) ? to : [to];
      recipients = emailList.filter(email => isValidEmail(email));
      console.log('Using provided email addresses:', recipients);
    }

    if (recipients.length === 0) {
      console.error('No valid recipients found', { type, to, userId });
      return new Response(JSON.stringify({ error: 'No valid recipients found. Please provide a valid email address or select a user.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate HTML based on email type
    const htmlContent = generateEmailHTML(type, subject, message, data, logoUrl);

    // Send emails
    const emailPromises = recipients.map(email =>
      resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: subject,
        html: htmlContent,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Email batch sent: ${successful} successful, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      sent: successful,
      failed: failed,
      total: recipients.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
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
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
      .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
      .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
      .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; }
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
      `;
      break;
    case 'withdrawal':
      content = `
        <div class="success">
          <h3>✓ Withdrawal Processed</h3>
          <p>Your withdrawal of <strong>${data?.amount || 'N/A'}</strong> has been processed successfully.</p>
          <p>Transaction ID: <code>${data?.transactionId || 'N/A'}</code></p>
        </div>
      `;
      break;
    case 'attention':
      content = `
        <div class="alert">
          <h3>⚠️ Important Notice</h3>
          <p>${message}</p>
        </div>
      `;
      break;
    case 'verification':
      content = `
        <div class="success">
          <h3>✓ Account Verified</h3>
          <p>Congratulations! Your account has been successfully verified.</p>
          <p>You now have full access to all trading features.</p>
        </div>
      `;
      break;
    default:
      content = `<p>${message}</p>`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      ${styles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width: 150px; margin-bottom: 10px;" />` : ''}
          <h1>Trading Platform</h1>
        </div>
        <div class="content">
          <h2>${subject}</h2>
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
