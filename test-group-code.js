// Test script for get-group-code function
const testGroupCode = async () => {
  const url = 'https://ynlnrvuqypmwpevabtdc.supabase.co/functions/v1/get-group-code';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlubG5ydnVxeXBtd3BldmFidGRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NzM0NjQsImV4cCI6MjA2ODE0OTQ2NH0.dvRTW9S7ZRCcjYJgEx-Adw1QnRV2Gv6jqCpAhPt-qoE';
  
  try {
    console.log('Testing get-group-code function...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'apikey': apiKey
      },
      body: JSON.stringify({
        creditCard: '377361',
        voucherCode: 'Q981338UEX',
        destination: 'Singapore',
        hotel: 'SINOR',
        arrivalDate: '2025-07-20'
      })
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