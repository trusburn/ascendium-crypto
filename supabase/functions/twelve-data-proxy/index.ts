import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    if (!apiKey) {
      console.error('TWELVE_DATA_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { endpoint, symbol, interval, outputsize } = await req.json();

    if (!endpoint || !symbol) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let url: string;

    switch (endpoint) {
      case 'price':
        url = `${TWELVE_DATA_BASE_URL}/price?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
        break;

      case 'time_series':
        url = `${TWELVE_DATA_BASE_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval || '15min'}&outputsize=${outputsize || 100}&apikey=${apiKey}`;
        break;

      case 'quote':
        url = `${TWELVE_DATA_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid endpoint' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`Fetching Twelve Data: ${endpoint} for ${symbol}`);
    
    const response = await fetch(url);
    const data = await response.json();

    // Check for API errors
    if (data.status === 'error' || data.code) {
      console.error('Twelve Data API error:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'API request failed', code: data.code }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
