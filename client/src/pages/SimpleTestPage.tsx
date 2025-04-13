import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export default function SimpleTestPage() {
  const [requirement, setRequirement] = useState('Describe your platform\'s document management capabilities');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      // Basic fetch request with simple error handling
      const fetchResponse = await fetch('/api/final-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement })
      });
      
      if (!fetchResponse.ok) {
        throw new Error(`Server error: ${fetchResponse.status}`);
      }
      
      const data = await fetchResponse.json();
      console.log("Raw API response:", data);
      
      if (data && data.final_response) {
        setResponse(data.final_response);
      } else {
        setError("No valid response received from the server");
      }
    } catch (err: any) {
      setError(err.message || 'Error generating response');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Simple Final Response Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test API</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2">Requirement:</label>
              <Textarea
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                rows={4}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Generate Response'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {error && (
        <Card className="mb-6 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
      
      {response && (
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded whitespace-pre-wrap">
              {response}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}