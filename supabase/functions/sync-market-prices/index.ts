import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CoinGecko ID mapping for crypto assets
const CRYPTO_ID_MAP: { [key: string]: string } = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'SOL': 'solana',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LTC': 'litecoin',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
};

interface PriceData {
  [symbol: string]: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('=== sync-market-prices function invoked ===');
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optionally verify secret for scheduled jobs
    const authHeader = req.headers.get('Authorization');
    const syncSecret = Deno.env.get('PRICE_SYNC_SECRET');
    
    // Allow both: authenticated users OR valid sync secret
    let isAuthorized = false;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      
      // Check if it's the sync secret
      if (syncSecret && token === syncSecret) {
        isAuthorized = true;
        console.log('Authorized via PRICE_SYNC_SECRET');
      } else {
        // Try to validate as user token
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          isAuthorized = true;
          console.log('Authorized via user token:', user.id);
        }
      }
    }

    if (!isAuthorized) {
      console.error('Unauthorized request');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📊 Fetching real market prices from APIs...');

    // Fetch crypto prices from CoinGecko
    let cryptoPrices: PriceData = {};
    try {
      const ids = Object.values(CRYPTO_ID_MAP).join(',');
      const cryptoResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
      );
      
      if (cryptoResponse.ok) {
        const data = await cryptoResponse.json();
        Object.entries(CRYPTO_ID_MAP).forEach(([symbol, id]) => {
          if (data[id]?.usd) {
            cryptoPrices[symbol] = data[id].usd;
          }
        });
        console.log('✅ CoinGecko prices fetched:', Object.keys(cryptoPrices).length, 'assets');
      } else {
        console.warn('⚠️ CoinGecko API response not OK:', cryptoResponse.status);
      }
    } catch (error) {
      console.error('❌ Error fetching crypto prices:', error);
    }

    // Fetch forex rates from Exchange Rate API
    let forexPrices: PriceData = {};
    try {
      const forexResponse = await fetch('https://open.er-api.com/v6/latest/USD');
      
      if (forexResponse.ok) {
        const data = await forexResponse.json();
        const rates = data.rates || {};
        
        // Calculate forex pair prices
        if (rates.EUR) forexPrices['EUR/USD'] = 1 / rates.EUR;
        if (rates.GBP) forexPrices['GBP/USD'] = 1 / rates.GBP;
        if (rates.JPY) forexPrices['USD/JPY'] = rates.JPY;
        if (rates.CHF) forexPrices['USD/CHF'] = rates.CHF;
        if (rates.AUD) forexPrices['AUD/USD'] = 1 / rates.AUD;
        if (rates.CAD) forexPrices['USD/CAD'] = rates.CAD;
        if (rates.NZD) forexPrices['NZD/USD'] = 1 / rates.NZD;
        
        // Cross pairs
        if (rates.EUR && rates.GBP) forexPrices['EUR/GBP'] = rates.GBP / rates.EUR;
        if (rates.EUR && rates.JPY) forexPrices['EUR/JPY'] = rates.JPY / rates.EUR;
        if (rates.GBP && rates.JPY) forexPrices['GBP/JPY'] = rates.JPY / rates.GBP;
        if (rates.EUR && rates.CHF) forexPrices['EUR/CHF'] = rates.CHF / rates.EUR;
        if (rates.AUD && rates.JPY) forexPrices['AUD/JPY'] = rates.JPY / rates.AUD;
        if (rates.GBP && rates.CHF) forexPrices['GBP/CHF'] = rates.CHF / rates.GBP;
        if (rates.EUR && rates.AUD) forexPrices['EUR/AUD'] = rates.AUD / rates.EUR;
        if (rates.NZD && rates.JPY) forexPrices['NZD/JPY'] = rates.JPY / rates.NZD;
        
        console.log('✅ Exchange rate API prices fetched:', Object.keys(forexPrices).length, 'pairs');
      } else {
        console.warn('⚠️ Exchange Rate API response not OK:', forexResponse.status);
      }
    } catch (error) {
      console.error('❌ Error fetching forex rates:', error);
    }

    // Fetch all tradeable assets
    const { data: assets, error: assetsError } = await supabase
      .from('tradeable_assets')
      .select('id, symbol, asset_type');
    
    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch assets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update each asset with real price using service role (bypasses RLS)
    let updatedCount = 0;
    const updates: { symbol: string; price: number }[] = [];
    
    for (const asset of assets || []) {
      let newPrice: number | null = null;
      
      if (asset.asset_type === 'crypto') {
        // Extract base symbol (e.g., "BTC/USDT" -> "BTC")
        const baseSymbol = asset.symbol.split('/')[0];
        newPrice = cryptoPrices[baseSymbol];
      } else if (asset.asset_type === 'forex') {
        newPrice = forexPrices[asset.symbol];
      }
      
      if (newPrice && newPrice > 0) {
        const { error: updateError } = await supabase
          .from('tradeable_assets')
          .update({ 
            current_price: newPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', asset.id);
        
        if (!updateError) {
          updatedCount++;
          updates.push({ symbol: asset.symbol, price: newPrice });
        } else {
          console.error(`Failed to update ${asset.symbol}:`, updateError);
        }
      }
    }

    console.log(`✅ Updated ${updatedCount} asset prices in database`);

    // Now sync trading profits (this will use the updated prices)
    console.log('🔄 Syncing trading profits...');
    const { error: syncError } = await supabase.rpc('sync_trading_profits');
    if (syncError) {
      console.error('Error syncing profits:', syncError);
    } else {
      console.log('✅ Trading profits synced');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Updated ${updatedCount} asset prices`,
      cryptoCount: Object.keys(cryptoPrices).length,
      forexCount: Object.keys(forexPrices).length,
      updates: updates.slice(0, 10), // Return first 10 updates for debugging
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
