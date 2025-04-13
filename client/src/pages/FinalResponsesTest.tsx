import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, BrainCircuit } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function FinalResponsesTest() {
  const [requirement, setRequirement] = useState('Describe your platform\'s document management capabilities and how they enhance advisor efficiency.');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      // Call the final-responses endpoint
      const response = await apiRequest('POST', '/api/final-responses', {
        requirement
      });
      
      // Parse the JSON response
      const result = await response.json();
      
      // Debug logging
      console.log("API Response received:", result);
      
      setResponse(result);
    } catch (err: any) {
      setError(err.message || 'Error generating response');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card className="w-full mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6" />
            <span>Final Responses Test</span>
          </CardTitle>
          <CardDescription>
            Test the new get_final_responses implementation which generates responses from multiple AI models
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="requirement" className="block text-sm font-medium mb-1">
                Requirement Text
              </label>
              <Textarea
                id="requirement"
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="Enter the RFP requirement text"
                className="min-h-32"
                required
              />
            </div>
            
            <Button type="submit" disabled={loading || !requirement.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Response'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {error && (
        <Card className="w-full mb-8 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Response debug info */}
      <Card className="w-full mb-8">
        <CardHeader>
          <CardTitle>Response Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p>Response object exists: {response ? 'Yes' : 'No'}</p>
            {response && (
              <>
                <p>Has final_response: {response.final_response ? 'Yes' : 'No'}</p>
                <p>Has model_responses: {response.model_responses ? 'Yes' : 'No'}</p>
                <p>Has metrics: {response.metrics ? 'Yes' : 'No'}</p>
              </>
            )}
          </div>
          <pre className="text-xs bg-gray-100 p-4 rounded-md overflow-auto">
            Response State: {JSON.stringify(response, null, 2)}
          </pre>
        </CardContent>
      </Card>
      
      {response && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Generated Response</CardTitle>
            <CardDescription>
              Completed in {response.metrics?.total_time.toFixed(2)}s with {response.metrics?.models_succeeded} of {response.metrics?.models_attempted} models
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="final">
              <TabsList>
                <TabsTrigger value="final">Final Response</TabsTrigger>
                <TabsTrigger value="openai">OpenAI</TabsTrigger>
                <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
                <TabsTrigger value="deepseek">DeepSeek</TabsTrigger>
                <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              </TabsList>
              
              <TabsContent value="final" className="mt-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Final Synthesized Response:</h3>
                  <div className="whitespace-pre-wrap">{response.final_response}</div>
                </div>
              </TabsContent>
              
              <TabsContent value="openai" className="mt-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">OpenAI Response:</h3>
                  <div className="whitespace-pre-wrap">
                    {response.model_responses?.openai_response || "No OpenAI response received"}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="anthropic" className="mt-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Anthropic (Claude) Response:</h3>
                  <div className="whitespace-pre-wrap">
                    {response.model_responses?.anthropic_response || "No Anthropic response received"}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="deepseek" className="mt-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">DeepSeek Response:</h3>
                  <div className="whitespace-pre-wrap">
                    {response.model_responses?.deepseek_response || "No DeepSeek response received"}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="raw" className="mt-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Raw JSON Response:</h3>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <div className="text-sm text-gray-500">
              Response ID: {response.id || 'N/A'}
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}