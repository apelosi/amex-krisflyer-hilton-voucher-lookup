// Test script for get-group-code function
const testGroupCode = async () => {
  const baseUrl = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_ANON_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  }

  try {
    console.log('Testing get-group-code function...');

    const response = await fetch(`${baseUrl}/functions/v1/get-group-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        apikey: apiKey,
      },
      body: JSON.stringify({
        creditCard: '377361',
        voucherCode: 'Q981338UEX',
        destination: 'Singapore',
        hotel: 'SINOR',
        arrivalDate: '2025-07-20',
      }),
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);

    return data;
  } catch (error) {
    console.error('Test failed:', error);
    return { error: error.message };
  }
};

testGroupCode();
