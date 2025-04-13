import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function QuickMoaTest() {
  const [requirement, setRequirement] = useState<string>(
    "The system shall provide a comprehensive dashboard for wealth managers to track client portfolios in real-time."
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleTestMoa = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await apiRequest("POST", "/api/quick-moa-test", {
        requirement
      });
      
      // Parse the JSON response
      const result = await response.json();
      
      setResult(result);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      console.error("Error testing MOA:", err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Quick MOA Test</h1>
      <p className="text-muted-foreground mb-6">
        This page allows you to quickly test the MOA functionality with simplified mock responses.
      </p>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Requirements Input</CardTitle>
          <CardDescription>
            Enter the RFP requirement text to test the MOA functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="Enter requirement text here..."
            className="min-h-[100px]"
          />
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleTestMoa}
            disabled={loading || !requirement.trim()}
            className="w-full md:w-auto"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Processing..." : "Test MOA Response"}
          </Button>
        </CardFooter>
      </Card>
      
      {error && (
        <Card className="mb-6 border-destructive">
          <CardHeader className="bg-destructive/10">
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <pre className="bg-muted p-4 rounded overflow-auto text-sm">{error}</pre>
          </CardContent>
        </Card>
      )}
      
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>
              Mock MOA response generated for testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="final">
              <TabsList className="mb-4">
                <TabsTrigger value="final">Final Response</TabsTrigger>
                <TabsTrigger value="all">All Responses</TabsTrigger>
                <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              </TabsList>
              
              <TabsContent value="final">
                <div className="bg-muted p-4 rounded">
                  <h3 className="text-lg font-semibold mb-2">Synthesized Response</h3>
                  <p className="whitespace-pre-wrap">{result.result?.final_response || "No response generated"}</p>
                </div>
              </TabsContent>
              
              <TabsContent value="all">
                <div className="space-y-4">
                  {result.result?.model_responses && (
                    <>
                      <div className="bg-muted p-4 rounded">
                        <h3 className="text-lg font-semibold mb-2">OpenAI</h3>
                        <p className="whitespace-pre-wrap">{result.result.model_responses.openai_response || "No response"}</p>
                      </div>
                      
                      <div className="bg-muted p-4 rounded">
                        <h3 className="text-lg font-semibold mb-2">Anthropic</h3>
                        <p className="whitespace-pre-wrap">{result.result.model_responses.anthropic_response || "No response"}</p>
                      </div>
                      
                      <div className="bg-muted p-4 rounded">
                        <h3 className="text-lg font-semibold mb-2">DeepSeek</h3>
                        <p className="whitespace-pre-wrap">{result.result.model_responses.deepseek_response || "No response"}</p>
                      </div>
                      
                      <div className="bg-muted p-4 rounded">
                        <h3 className="text-lg font-semibold mb-2">MOA</h3>
                        <p className="whitespace-pre-wrap">{result.result.model_responses.moa_response || "No response"}</p>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="raw">
                <pre className="bg-muted p-4 rounded overflow-auto text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
            
            {result.result?.metrics && (
              <div className="mt-6 bg-muted/50 p-4 rounded">
                <h3 className="text-lg font-semibold mb-2">Metrics</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Time</p>
                    <p className="font-medium">{result.result.metrics.total_time.toFixed(2)}s</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Models Succeeded</p>
                    <p className="font-medium">{result.result.metrics.models_succeeded} / {result.result.metrics.models_attempted}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}