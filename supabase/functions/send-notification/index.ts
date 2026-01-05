import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'deposit_approved' | 'deposit_rejected' | 'withdrawal_approved' | 'withdrawal_rejected' | 'verification_required';
  userId: string;
  data?: {
    amount?: number;
    cryptoType?: string;
    reason?: string;
    transactionId?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify request comes from internal service (webhook secret or service role)
    const authHeader = req.headers.get('Authorization');
    const webhookSecret = req.headers.get('X-Webhook-Secret');
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET') || 'internal-notification-service';
    
    // Allow service role token or webhook secret
    let isAuthorized = false;
    if (webhookSecret === expectedSecret) {
      isAuthorized = true;
    } else if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        // Check if admin
        const { data: isAdmin } = await supabase.rpc('is_admin', { check_user_id: user.id });
        isAuthorized = !!isAdmin;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notification: NotificationRequest = await req.json();
    const { type, userId, data } = notification;

    if (!type || !userId) {
      return new Response(JSON.stringify({ error: 'type and userId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) {
      console.error('Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userEmail = userData.user.email;

    // Get email settings
    const { data: emailSettings } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['email_from_address', 'email_logo_url']);
    
    let fromEmail = 'noreply@resend.dev';
    let logoUrl = '';
    
    if (emailSettings) {
      const fromSetting = emailSettings.find(s => s.key === 'email_from_address');
      const logoSetting = emailSettings.find(s => s.key === 'email_logo_url');
      
      if (fromSetting?.value) {
        fromEmail = typeof fromSetting.value === 'string' ? fromSetting.value : String(fromSetting.value);
      }
      if (logoSetting?.value) {
        logoUrl = typeof logoSetting.value === 'string' ? logoSetting.value : String(logoSetting.value);
      }
    }

    // Generate email content based on type
    const emailContent = generateEmailContent(type, data, logoUrl);

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: `Trading Platform <${fromEmail}>`,
      to: [userEmail],
      subject: emailContent.subject,
      html: emailContent.html
    });

    if (emailError) {
      console.error('Error sending notification email:', emailError);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: emailError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Notification email sent: ${type} to ${userEmail}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Notification sent successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

function generateEmailContent(type: string, data?: any, logoUrl?: string): { subject: string; html: string } {
  const styles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
      .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; border-radius: 5px; }
      .error { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0; border-radius: 5px; }
      .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 5px; }
      .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
      .amount { font-size: 24px; font-weight: bold; color: #333; }
    </style>
  `;

  const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width: 150px; margin-bottom: 10px;" />` : '';
  const footerHtml = `
    <div class="footer">
      <p>This is an automated message from Trading Platform.</p>
      <p>© ${new Date().getFullYear()} Trading Platform. All rights reserved.</p>
    </div>
  `;

  let subject = '';
  let bodyContent = '';

  switch (type) {
    case 'deposit_approved':
      subject = 'Deposit Approved - Funds Credited';
      bodyContent = `
        <div class="success">
          <h2>✓ Deposit Approved!</h2>
          <p>Your deposit has been approved and credited to your account.</p>
        </div>
        <p class="amount">Amount: $${data?.amount?.toFixed(2) || '0.00'}</p>
        <p><strong>Cryptocurrency:</strong> ${data?.cryptoType || 'N/A'}</p>
        <p>You can now use these funds to start trading. Log in to your dashboard to begin!</p>
      `;
      break;

    case 'deposit_rejected':
      subject = 'Deposit Request Rejected';
      bodyContent = `
        <div class="error">
          <h2>✗ Deposit Rejected</h2>
          <p>Unfortunately, your deposit request has been rejected.</p>
        </div>
        <p class="amount">Amount: $${data?.amount?.toFixed(2) || '0.00'}</p>
        <p><strong>Cryptocurrency:</strong> ${data?.cryptoType || 'N/A'}</p>
        ${data?.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
        <p>If you believe this is an error, please contact our support team.</p>
      `;
      break;

    case 'withdrawal_approved':
      subject = 'Withdrawal Processed Successfully';
      bodyContent = `
        <div class="success">
          <h2>✓ Withdrawal Approved!</h2>
          <p>Your withdrawal request has been processed successfully.</p>
        </div>
        <p class="amount">Amount: $${data?.amount?.toFixed(2) || '0.00'}</p>
        <p><strong>Cryptocurrency:</strong> ${data?.cryptoType || 'N/A'}</p>
        ${data?.transactionId ? `<p><strong>Transaction ID:</strong> ${data.transactionId}</p>` : ''}
        <p>The funds should arrive in your wallet within 24 hours depending on network conditions.</p>
      `;
      break;

    case 'withdrawal_rejected':
      subject = 'Withdrawal Request Rejected';
      bodyContent = `
        <div class="error">
          <h2>✗ Withdrawal Rejected</h2>
          <p>Your withdrawal request has been rejected.</p>
        </div>
        <p class="amount">Amount: $${data?.amount?.toFixed(2) || '0.00'}</p>
        <p><strong>Cryptocurrency:</strong> ${data?.cryptoType || 'N/A'}</p>
        ${data?.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
        <p>The funds remain in your account. If you believe this is an error, please contact support.</p>
      `;
      break;

    case 'verification_required':
      subject = 'Account Verification Required';
      bodyContent = `
        <div class="warning">
          <h2>⚠️ Verification Required</h2>
          <p>Your account requires verification to continue.</p>
        </div>
        <p>To ensure the security of your funds and comply with regulations, we need you to verify your account.</p>
        <p>Please log in to your dashboard and complete the verification process.</p>
      `;
      break;

    default:
      subject = 'Account Notification';
      bodyContent = `<p>You have a new notification regarding your account.</p>`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          ${logoHtml}
          <h1>Trading Platform</h1>
        </div>
        <div class="content">
          ${bodyContent}
        </div>
        ${footerHtml}
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

serve(handler);
