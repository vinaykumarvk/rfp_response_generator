import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type SimilarResponse = {
  text: string;
  score: number;
  category: string;
  requirement: string;
  response: string;
  reference: string;
};

type ApiResponse = {
  similar_responses?: SimilarResponse[];
  openai_response?: string;
  anthropic_response?: string;
  deepseek_response?: string;
  generated_response?: string;
  error?: string;
};

export default function LlmResponseViewer() {
  const [isLoading, setIsLoading] = useState(false);
  const [requirement, setRequirement] = useState("How do you perform portfolio rebalancing?");
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [rawOutput, setRawOutput] = useState<string>("");
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!requirement.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a requirement",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/test-llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requirement_text: requirement, model_provider: 'openai' }),
      });

      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      // Store the raw response text
      setRawOutput(responseText);

      let jsonResponse;
      try {
        // Try to parse the entire response as JSON first
        jsonResponse = JSON.parse(responseText);
      } catch (err) {
        // If parsing fails, try to extract the JSON object
        try {
          // Look for a complete JSON object in the response
          const match = responseText.match(/\{[\s\S]*\}/);
          if (match) {
            jsonResponse = JSON.parse(match[0]);
          } else {
            throw new Error('Could not find JSON object in response');
          }
        } catch (extractErr) {
          // Create a simple error response object
          jsonResponse = { 
            error: `Failed to parse response: ${responseText.substring(0, 100)}...` 
          };
        }
      }
      
      // Store any raw stdout/stderr if present in the response
      if (jsonResponse.stdout) {
        setRawOutput(jsonResponse.stdout);
      } else if (jsonResponse.raw_stdout) {
        setRawOutput(jsonResponse.raw_stdout);
      } else if (jsonResponse.raw) {
        setRawOutput(jsonResponse.raw);
      }
      
      setApiResponse(jsonResponse);
    } catch (error: any) {
      console.error('Error:', error);
      setApiResponse({ error: error?.message || String(error) || "Unknown error occurred" });
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch response",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderFinalResponse = () => {
    if (!apiResponse) return <p>No response yet</p>;
    if (apiResponse.error) return <p className="text-red-500">{apiResponse.error}</p>;

    // Priority order: generated_response > openai_response > anthropic_response > deepseek_response
    const finalResponse = apiResponse.generated_response || 
                          apiResponse.openai_response || 
                          apiResponse.anthropic_response || 
                          apiResponse.deepseek_response;

    if (!finalResponse) return <p>No response content available</p>;

    // Clean up escaped characters first
    let cleanedResponse = finalResponse
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');

    return (
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanedResponse}</ReactMarkdown>
      </div>
    );
  };

  const SimilarResponseCard = ({ item }: { item: SimilarResponse }) => {
    const [isResponseVisible, setIsResponseVisible] = useState(false);
    
    return (
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-2">
          <div className="font-bold mb-2">Category: {item.category}</div>
          <div className="text-base mb-2">{item.text || 'Unnamed Response'}</div>
          <CardDescription className="text-xs">
            Score: {(item.score * 100).toFixed(2)}%
            {item.reference && ` | Ref: ${item.reference}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full flex items-center justify-between"
            onClick={() => setIsResponseVisible(!isResponseVisible)}
          >
            <span>Response</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className={`transition-transform ${isResponseVisible ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </Button>
          
          {isResponseVisible && (
            <div className="whitespace-pre-wrap text-sm mt-3 border p-3 rounded-md bg-slate-50 dark:bg-slate-800">
              {item.response}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSimilarResponses = () => {
    if (!apiResponse) return <p>No response yet</p>;
    if (apiResponse.error) return <p className="text-red-500">{apiResponse.error}</p>;
    if (!apiResponse.similar_responses || apiResponse.similar_responses.length === 0) {
      return <p>No similar responses found</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {apiResponse.similar_responses.map((item, index) => (
          <SimilarResponseCard key={index} item={item} />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">Standalone Response</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Query</CardTitle>
          <CardDescription>Enter your requirement to test the LLM response</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea 
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="Enter your requirement here..."
            className="min-h-[100px]"
          />
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? 'Generating...' : 'Generate Response'}
          </Button>
        </CardFooter>
      </Card>

      {apiResponse && (
        <Card>
          <CardHeader>
            <CardTitle>LLM Response</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="final" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="final">Final Response</TabsTrigger>
                <TabsTrigger value="similar">Similar Questions</TabsTrigger>
                <TabsTrigger value="raw">Raw Output</TabsTrigger>
              </TabsList>
              <TabsContent value="final" className="mt-4 p-4 border rounded-md">
                {renderFinalResponse()}
              </TabsContent>
              <TabsContent value="similar" className="mt-4">
                {renderSimilarResponses()}
              </TabsContent>
              <TabsContent value="raw" className="mt-4 p-4 border rounded-md">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-auto">
                  <pre className="text-xs whitespace-pre-wrap">{rawOutput || "No raw output available"}</pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}