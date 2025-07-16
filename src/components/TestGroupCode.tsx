import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export function TestGroupCode() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testFunction = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('Testing get-group-code function...');
      
      const { data, error } = await supabase.functions.invoke('get-group-code', {
        body: {
          creditCard: '377361',
          voucherCode: 'Q981338UEX',
          destination: 'Singapore',
          hotel: 'SINOR',
          arrivalDate: '2025-07-20'
        }
      });

      if (error) {
        console.error('Function error:', error);
        setResult({ error: error.message });
      } else {
        console.log('Function result:', data);
        setResult(data);
      }
    } catch (error) {
      console.error('Test error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Test get-group-code Function</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={testFunction} 
          disabled={loading}
          className="w-full mb-4"
        >
          {loading ? 'Testing...' : 'Test Function'}
        </Button>
        
        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}