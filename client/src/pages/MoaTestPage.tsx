import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Requirement {
  id: number;
  requirement: string;
  category: string;
}

export default function MoaTestPage() {
  const [requirement, setRequirement] = useState("Please describe your solution's financial reporting capabilities with examples of standard and custom reports.");
  const [provider, setProvider] = useState("moa");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch available requirements on component mount
  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const response = await apiRequest("GET", "/api/excel-requirements");
        const data = await response.json();
        if (data && Array.isArray(data)) {
          setRequirements(data);
          if (data.length > 0) {
            setSelectedRequirementId(data[0].id);
            setRequirement(data[0].requirement);
          }
        }
      } catch (error) {
        console.error("Failed to fetch requirements:", error);
        toast({
          title: "Error",
          description: "Failed to fetch requirements. Using sample requirement instead.",
          variant: "destructive",
        });
      }
    };

    fetchRequirements();
  }, [toast]);

  const handleTest = async () => {
    if (!requirement.trim()) {
      toast({
        title: "Error",
        description: "Please enter a requirement",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRequirementId) {
      toast({
        title: "Error",
        description: "Please select a requirement from the list",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await apiRequest(
        "POST",
        "/api/simple-model-test",
        {
          provider,
          requirementId: selectedRequirementId,
          text: requirement,
        }
      );

      const responseData = await response.json();
      setResult(responseData);
      toast({
        title: "Success",
        description: `${provider.toUpperCase()} test completed successfully`,
      });
    } catch (error) {
      console.error("API Test Error:", error);
      toast({
        title: "Error",
        description: `Failed to test ${provider}: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">MOA Testing Interface</h1>
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Parameters</CardTitle>
            <CardDescription>
              Configure the model provider and requirement text
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Provider
                </label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="moa">MOA (Mixture of Agents)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Select Requirement
                </label>
                <Select 
                  value={selectedRequirementId?.toString() || ""} 
                  onValueChange={(value) => {
                    const id = parseInt(value);
                    setSelectedRequirementId(id);
                    const selected = requirements.find(r => r.id === id);
                    if (selected) {
                      setRequirement(selected.requirement);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    {requirements.map((req) => (
                      <SelectItem key={req.id} value={req.id.toString()}>
                        {req.category} - {req.requirement.substring(0, 40)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Requirement Text
                </label>
                <Textarea
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  placeholder="Enter requirement text..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleTest}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Run Test"
              )}
            </Button>
          </CardFooter>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Response from {provider.toUpperCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="response">
                <TabsList className="mb-4">
                  <TabsTrigger value="response">Response</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                  {provider === "moa" && (
                    <>
                      <TabsTrigger value="openai">OpenAI</TabsTrigger>
                      <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
                      <TabsTrigger value="deepseek">DeepSeek</TabsTrigger>
                    </>
                  )}
                </TabsList>
                
                <TabsContent value="response" className="space-y-4">
                  <div className="rounded-md bg-muted p-4">
                    <pre className="whitespace-pre-wrap">
                      {result.response || 
                       result.generated_response || 
                       result.moa_response || 
                       (result.saved_data?.finalResponse) ||
                       (result.model_output?.generated_response) ||
                       (result.saved_data?.moaResponse) ||
                       "No response available"}
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="raw">
                  <div className="rounded-md bg-muted p-4">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
                
                {provider === "moa" && (
                  <>
                    <TabsContent value="openai">
                      <div className="rounded-md bg-muted p-4">
                        <pre className="whitespace-pre-wrap">
                          {result.openai_response || 
                           result.saved_data?.openaiResponse || 
                           result.model_output?.openai_response || 
                           "No OpenAI response available"}
                        </pre>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="anthropic">
                      <div className="rounded-md bg-muted p-4">
                        <pre className="whitespace-pre-wrap">
                          {result.anthropic_response || 
                           result.saved_data?.anthropicResponse || 
                           result.model_output?.anthropic_response || 
                           "No Anthropic response available"}
                        </pre>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="deepseek">
                      <div className="rounded-md bg-muted p-4">
                        <pre className="whitespace-pre-wrap">
                          {result.deepseek_response || 
                           result.saved_data?.deepseekResponse || 
                           result.model_output?.deepseek_response || 
                           "No DeepSeek response available"}
                        </pre>
                      </div>
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}