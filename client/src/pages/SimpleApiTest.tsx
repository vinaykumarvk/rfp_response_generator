import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SimpleApiTest() {
  const [provider, setProvider] = useState("openai");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
    response?: string;
    response_time_ms?: number;
  } | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    setResults(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/simple-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider })
      });
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({
        success: false,
        error: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Simple API Connectivity Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select API Provider</label>
              <Select
                value={provider}
                onValueChange={setProvider}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={runTest} 
              disabled={isLoading} 
              size="lg" 
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                `Test ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API Connection`
              )}
            </Button>
          </div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          
          {!results && !isLoading && (
            <div className="text-center text-gray-500 py-10">
              Run a test to see results
            </div>
          )}
          
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p>Testing API connection...</p>
            </div>
          )}
          
          {results && (
            <div className="space-y-4">
              <Alert variant={results.success ? "default" : "destructive"}>
                <div className="flex items-center gap-2">
                  {results.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <AlertTitle>
                    {results.success ? "Connection Successful" : "Connection Failed"}
                  </AlertTitle>
                </div>
                <AlertDescription className="mt-2">
                  {results.message || results.error || "No details available"}
                </AlertDescription>
              </Alert>
              
              {results.response && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <h3 className="text-sm font-medium mb-2">Response:</h3>
                  <p className="text-sm">{results.response}</p>
                </div>
              )}
              
              {results.response_time_ms && (
                <div className="text-sm text-gray-500">
                  Response time: {results.response_time_ms}ms
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}