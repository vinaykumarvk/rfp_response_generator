import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  similar_responses?: SimilarResponse[];
  error?: string;
  pythonLogs?: string;
}

export default function LlmTestPage() {
  const [requirement, setRequirement] = useState("");
  const [provider, setProvider] = useState("openai");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<LlmResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requirement.trim()) {
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
      const res = await fetch("/api/test-llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requirement, provider }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to test LLM connectivity");
      }
      
      setResponse(data);
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
          <h2 className="text-xl font-semibold mb-4">Test Input</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  <SelectItem value="deepseek">Deepseek</SelectItem>
                  <SelectItem value="moa">Mixture of Agents</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
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
            
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test LLM Connectivity"
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
        
        {response?.pythonLogs && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Python Logs</h2>
            <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded overflow-auto text-sm whitespace-pre-wrap">
              {response.pythonLogs}
            </pre>
          </Card>
        )}
      </div>
    </div>
  );
}