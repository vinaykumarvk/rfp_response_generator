import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SimilarResponse {
  text: string;
  score: number;
  category: string;
  requirement: string;
  response: string;
  reference: string;
}

interface LlmResponse {
  generated_response?: string;
  openai_response?: string;
  anthropic_response?: string;
  deepseek_response?: string;
  response?: string; // For test mode
  message?: string; // For test mode
  success?: boolean; // For test mode
  similar_responses?: SimilarResponse[];
  error?: string;
  pythonLogs?: string;
  stdout?: string; // Raw stdout for debugging
  stderr?: string; // Raw stderr for debugging
}

export default function LlmTestPage() {
  const [requirement, setRequirement] = useState("");
  const [provider, setProvider] = useState("openai");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<LlmResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testModeOnly, setTestModeOnly] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testModeOnly && !requirement.trim()) {
      toast({
        title: "Error",
        description: "Please enter a requirement",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setResponse(null);
    setError(null);
    
    try {
      // In test mode, we use a special requirement text that triggers API testing only
      const reqPayload = testModeOnly ? "test_connection_only" : requirement;
      
      const res = await fetch("/api/test-llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requirement: reqPayload, provider }),
      });
      
      // Handle JSON parsing issues separately
      let data;
      try {
        const text = await res.text();
        // Check if it's an HTML response (common error case)
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          console.error("Received HTML instead of JSON", text.substring(0, 100));
          setError("Server returned HTML instead of JSON. This usually means a server error occurred.");
          // Create a fallback response object with the error
          setResponse({
            error: "Server returned HTML instead of JSON",
            stdout: "Error: HTML response received",
            stderr: text.substring(0, 500) // Include part of the HTML for debugging
          });
          return;
        }
        
        // Parse JSON
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("JSON Parse error:", parseError);
        // We can't read the response text twice - it's already been consumed
        setError(`Failed to parse response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        return;
      }
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to test LLM connectivity");
      }
      
      setResponse(data);
      
      // Show success notification for test mode
      if (testModeOnly && data.success) {
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${provider.toUpperCase()} API`,
          variant: "default",
        });
      }
    } catch (err) {
      console.error("Error testing LLM:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">LLM Connectivity Test</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Settings</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="test-mode" 
                  checked={testModeOnly} 
                  onCheckedChange={setTestModeOnly} 
                />
                <Label htmlFor="test-mode">Connection Test Mode Only</Label>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {testModeOnly 
                  ? "Quick API connectivity check without loading embeddings" 
                  : "Full test with embeddings and response generation"}
              </div>
            </div>
            
            <div>
              <Label htmlFor="provider">AI Provider</Label>
              <Select
                value={provider}
                onValueChange={setProvider}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {!testModeOnly && (
              <div>
                <Label htmlFor="requirement">Requirement</Label>
                <Textarea
                  id="requirement"
                  placeholder="Enter your question or requirement here..."
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>
            )}
            
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                `Test ${provider.toUpperCase()} Connectivity`
              )}
            </Button>
          </form>
        </Card>
        
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {response?.error && (
          <Alert variant="destructive">
            <AlertTitle>LLM Error</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{response.error}</AlertDescription>
          </Alert>
        )}
        
        {response?.success !== undefined && (
          <Alert variant={response.success ? "default" : "destructive"}>
            <div className="flex items-center gap-2">
              {response.success ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5" />}
              <AlertTitle>{response.success ? "Connection Successful" : "Connection Failed"}</AlertTitle>
            </div>
            <AlertDescription className="mt-2 ml-7">
              {response.message || (response.success ? `Successfully connected to ${provider.toUpperCase()} API` : `Failed to connect to ${provider.toUpperCase()} API`)}
              {response.response && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                  <strong>Response:</strong> {response.response}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {response && (response.stdout || response.stderr || response.pythonLogs) && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Logs</h2>
            
            <Tabs defaultValue="logs">
              <TabsList>
                <TabsTrigger value="logs">Formatted Logs</TabsTrigger>
                <TabsTrigger value="stdout">Raw Stdout</TabsTrigger>
                <TabsTrigger value="stderr">Raw Stderr</TabsTrigger>
              </TabsList>
              
              <TabsContent value="logs">
                {response.pythonLogs && (
                  <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded overflow-auto text-sm whitespace-pre-wrap">
                    {response.pythonLogs}
                  </pre>
                )}
              </TabsContent>
              
              <TabsContent value="stdout">
                {response.stdout ? (
                  <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded overflow-auto text-sm whitespace-pre-wrap">
                    {response.stdout}
                  </pre>
                ) : (
                  <p className="text-gray-500 italic">No stdout data available</p>
                )}
              </TabsContent>
              
              <TabsContent value="stderr">
                {response.stderr ? (
                  <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded overflow-auto text-sm whitespace-pre-wrap">
                    {response.stderr}
                  </pre>
                ) : (
                  <p className="text-gray-500 italic">No stderr data available</p>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        )}
        
        {/* Only show response data for full test mode */}
        {!testModeOnly && (
          <>
            {response?.similar_responses && response.similar_responses.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Similar Requirements</h2>
                <div className="space-y-4">
                  {response.similar_responses.map((similar, index) => (
                    <div key={index} className="border p-4 rounded-md">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Category: {similar.category}</span>
                        <span className="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-100">
                          Score: {(similar.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="mb-2"><strong>Requirement:</strong> {similar.requirement}</p>
                      {similar.reference && (
                        <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                          <strong>Reference:</strong> {similar.reference}
                        </p>
                      )}
                      <div className="mt-2 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <strong>Response:</strong>
                        <div className="mt-1 whitespace-pre-wrap">
                          {similar.response}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
            {response?.generated_response && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Generated Response</h2>
                <div className="prose dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: response.generated_response.replace(/\n/g, '<br/>') }} />
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}