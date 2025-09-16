import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Setting up hotel_data table...');

    // Create the hotel_data table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS hotel_data (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (createError) {
      console.error('Error creating table:', createError);
      throw new Error(`Failed to create table: ${createError.message}`);
    }

    // Create indexes
    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_hotel_data_updated ON hotel_data(last_updated);
      CREATE INDEX IF NOT EXISTS idx_hotel_data_jsonb ON hotel_data USING GIN (data);
    `;

    const { error: indexError } = await supabase.rpc('exec_sql', { sql: createIndexSQL });
    
    if (indexError) {
      console.error('Error creating indexes:', indexError);
      throw new Error(`Failed to create indexes: ${indexError.message}`);
    }

    // Insert initial empty record
    const { error: insertError } = await supabase
      .from('hotel_data')
      .upsert({
        id: 1,
        data: {
          destinations: [],
          hotels: [],
          hotelsByDestination: {},
          hotelCodes: {}
        },
        last_updated: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      });

    if (insertError) {
      console.error('Error inserting initial record:', insertError);
      throw new Error(`Failed to insert initial record: ${insertError.message}`);
    }

    console.log('Hotel data table setup completed successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Hotel data table created successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in setup-hotel-data-table function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
