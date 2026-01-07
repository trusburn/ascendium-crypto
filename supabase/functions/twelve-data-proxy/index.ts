import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

// Simple in-memory cache for rate limiting
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API key from Supabase secrets
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    if (!apiKey) {
      console.error('TWELVE_DATA_API_KEY not configured in Supabase secrets');
      return new Response(
        JSON.stringify({ error: 'API key not configured. Please add TWELVE_DATA_API_KEY to Supabase secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { endpoint, symbol, interval, outputsize } = body;

    if (!endpoint || !symbol) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: endpoint and symbol are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create cache key
    const cacheKey = `${endpoint}-${symbol}-${interval || ''}-${outputsize || ''}`;
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Cache hit for ${cacheKey}`);
      return new Response(
        JSON.stringify(cached.data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          JSON.stringify({ error: `Invalid endpoint: ${endpoint}. Use 'price', 'time_series', or 'quote'` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`Twelve Data API call: ${endpoint} for ${symbol} (interval: ${interval || 'N/A'})`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.error(`Twelve Data HTTP error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: `API returned status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const data = await response.json();

    // Check for API errors (Twelve Data specific error format)
    if (data.status === 'error' || data.code) {
      console.error('Twelve Data API error:', data);
      
      // Rate limit error - return cached data if available
      if (data.code === 429 && cached) {
        console.log('Rate limited, returning stale cache');
        return new Response(
          JSON.stringify(cached.data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: data.message || 'API request failed', 
          code: data.code,
          details: data.status 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store in cache
    cache.set(cacheKey, { data, timestamp: Date.now() });
    
    // Clean old cache entries
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_TTL * 2) {
        cache.delete(key);
      }
    }

    console.log(`Twelve Data success: ${endpoint} for ${symbol}`);
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Twelve Data proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
