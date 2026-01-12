import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'deposit_approved' | 'deposit_rejected' | 'withdrawal_approved' | 'withdrawal_rejected' | 'verification_required' | 'balance_credit' | 'balance_debit';
  userId: string;
  data?: {
    amount?: number;
    cryptoType?: string;
    reason?: string;
    transactionId?: string;
    balanceType?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log('=== send-notification function invoked ===');
  
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

    // Verify request authorization
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('No authorization provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if admin
    const { data: isAdmin } = await supabase.rpc('is_admin', { check_user_id: user.id });
    if (!isAdmin) {
      console.error('User is not admin:', user.id);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let notification: NotificationRequest;
    try {
      notification = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, userId, data } = notification;

    console.log('Received notification request:', { type, userId, data });

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
      return new Response(JSON.stringify({ error: 'User not found or has no email' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userEmail = userData.user.email;
    console.log('Sending notification to:', userEmail);

    // Get email settings
    const { data: emailSettings } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['email_logo_url', 'email_sender_name', 'email_from_address']);
    
    let logoUrl = '';
    let senderName = 'Trading Platform';
    let senderEmail = 'onboarding@resend.dev';
    
    if (emailSettings) {
      const logoSetting = emailSettings.find(s => s.key === 'email_logo_url');
      const nameSetting = emailSettings.find(s => s.key === 'email_sender_name');
      const emailSetting = emailSettings.find(s => s.key === 'email_from_address');
      
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

    // Generate email content based on type
    const emailContent = generateEmailContent(type, data, logoUrl, senderName);

    // Send email
    const { data: sendData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [userEmail],
      subject: emailContent.subject,
      html: emailContent.html
    });

    if (emailError) {
      console.error('Error sending notification email:', emailError);
      return new Response(JSON.stringify({ 
        error: 'Failed to send email', 
        details: emailError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Notification email sent successfully: ${type} to ${userEmail}, ID: ${sendData?.id}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Notification sent successfully',
      emailId: sendData?.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Unhandled error in send-notification function:", error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

function generateEmailContent(type: string, data?: any, logoUrl?: string, senderName?: string): { subject: string; html: string } {
  const platformName = senderName || 'Trading Platform';
  
  const styles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .header img { max-width: 150px; max-height: 60px; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto; }
      .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; }
      .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; border-radius: 5px; }
      .error { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0; border-radius: 5px; }
      .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 5px; }
      .info { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 15px 0; border-radius: 5px; }
      .footer { text-align: center; margin-top: 30px; padding: 20px; color: #888; font-size: 12px; }
      .amount { font-size: 24px; font-weight: bold; color: #333; }
    </style>
  `;

  const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="${platformName}" style="max-width: 150px; max-height: 60px; margin-bottom: 15px;" />` : '';
  const footerHtml = `
    <div class="footer">
      <p>This is an automated message from ${platformName}.</p>
      <p>© ${new Date().getFullYear()} ${platformName}. All rights reserved.</p>
    </div>
  `;

  let subject = '';
  let bodyContent = '';
  const amount = data?.amount ? `$${Number(data.amount).toFixed(2)}` : 'N/A';

  switch (type) {
    case 'deposit_approved':
      subject = 'Deposit Approved - Funds Credited';
      bodyContent = `
        <div class="success">
          <h2>✓ Deposit Approved!</h2>
          <p>Your deposit has been approved and credited to your account.</p>
        </div>
        <p class="amount">Amount: ${amount}</p>
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
        <p class="amount">Amount: ${amount}</p>
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
        <p class="amount">Amount: ${amount}</p>
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
        <p class="amount">Amount: ${amount}</p>
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

    case 'balance_credit':
      subject = 'Funds Added to Your Account';
      bodyContent = `
        <div class="success">
          <h2>✓ Balance Credited</h2>
          <p>Funds have been added to your account.</p>
        </div>
        <p class="amount">Amount: ${amount}</p>
        <p><strong>Balance Type:</strong> ${data?.balanceType || 'Account'}</p>
        ${data?.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
        <p>Log in to your dashboard to view your updated balance.</p>
      `;
      break;

    case 'balance_debit':
      subject = 'Balance Adjustment Notice';
      bodyContent = `
        <div class="info">
          <h2>ℹ️ Balance Adjusted</h2>
          <p>Your account balance has been adjusted.</p>
        </div>
        <p class="amount">Amount: ${amount}</p>
        <p><strong>Balance Type:</strong> ${data?.balanceType || 'Account'}</p>
        ${data?.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
        <p>If you have questions about this adjustment, please contact support.</p>
      `;
      break;

    default:
      subject = 'Account Notification';
      bodyContent = `<p>You have a new notification regarding your account.</p>`;
  }

  const html = `
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
          ${logoHtml}
          <h1 style="margin: 0; font-size: 24px;">${platformName}</h1>
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