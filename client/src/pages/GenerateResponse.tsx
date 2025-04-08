import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Loader2, Save, RefreshCw, BookOpen, History } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReferencePanel from "@/components/ReferencePanel";

// Define the structure of our parsed Excel data
interface ExcelRow {
  id?: number;
  category: string;
  requirement: string;
  finalResponse?: string;
  timestamp?: string;
  rating?: number;
}

// Define the structure for similar responses returned by the AI
interface SimilarResponse {
  text: string;
  score: number;
  category: string;
  requirement: string;
  response: string;
  reference?: string;
}

export default function GenerateResponse() {
  const [requirements, setRequirements] = useState<ExcelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequirement, setSelectedRequirement] = useState<string>("");
  const [responseText, setResponseText] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [similarResponses, setSimilarResponses] = useState<SimilarResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelProvider, setModelProvider] = useState<string>("openai");
  const [showSimilarResponses, setShowSimilarResponses] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("response");
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Fetch the data from the API
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/excel-requirements");
        if (response.ok) {
          const data = await response.json();
          setRequirements(data);
        } else {
          console.error("Failed to fetch data");
          setErrorMessage("Failed to fetch requirements from the server");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorMessage("Error connecting to the server");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRequirementChange = (value: string) => {
    setSelectedRequirement(value);
    // When selecting a requirement, check if it already has a response
    const selectedReq = requirements.find(r => r.id?.toString() === value);
    
    if (selectedReq) {
      setSelectedRequirementId(selectedReq.id);
      
      if (selectedReq.finalResponse) {
        setResponseText(selectedReq.finalResponse);
      } else {
        setResponseText("");
      }
    } else {
      setSelectedRequirementId(undefined);
      setResponseText("");
    }
    
    // Clear previous similar responses and errors
    setSimilarResponses([]);
    setErrorMessage(null);
    
    // Reset to response tab when changing requirements
    setActiveTab("response");
  };

  const handleGenerateResponse = async () => {
    if (!selectedRequirement) return;
    
    setGenerating(true);
    setErrorMessage(null);
    setSimilarResponses([]);
    
    try {
      const selectedReq = requirements.find(r => r.id?.toString() === selectedRequirement);
      
      if (!selectedReq) {
        throw new Error("Selected requirement not found");
      }
      
      // Call our API to generate a response
      const response = await fetch("/api/generate-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requirement: selectedReq.requirement,
          provider: modelProvider,
          requirementId: selectedReq.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate response");
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setResponseText(result.generated_response || "");
      
      // Set similar responses if available
      if (result.similar_responses && Array.isArray(result.similar_responses)) {
        setSimilarResponses(result.similar_responses);
      }
      
      // If the response was automatically saved, update the local state
      if (result.saved && result.updatedResponse) {
        // Update the requirements list with the new response
        setRequirements(prev => prev.map(req => 
          req.id === selectedReq.id ? { ...req, finalResponse: result.generated_response } : req
        ));
      }
      
    } catch (error) {
      console.error("Error generating response:", error);
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setGenerating(false);
    }
  };
  
  const handleSaveResponse = async () => {
    if (!selectedRequirement || !responseText) return;
    
    try {
      const selectedReq = requirements.find(r => r.id?.toString() === selectedRequirement);
      
      if (selectedReq?.id) {
        const saveResponse = await fetch(`/api/excel-requirements/${selectedReq.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            finalResponse: responseText
          })
        });
        
        if (saveResponse.ok) {
          // Update the local requirements array with the new response
          setRequirements(prev => prev.map(req => 
            req.id === selectedReq.id ? { ...req, finalResponse: responseText } : req
          ));
          
          alert("Response saved successfully!");
        } else {
          console.error("Failed to save response");
          setErrorMessage("Failed to save response to the database");
        }
      }
    } catch (error) {
      console.error("Error saving response:", error);
      setErrorMessage("An error occurred while saving the response");
    }
  };
  
  const toggleSimilarResponses = () => {
    setShowSimilarResponses(!showSimilarResponses);
  };

  return (
    <div className="h-full">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Generate Response</h2>
        
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <div className="px-6 py-5 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-800">Select Requirement</h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose a requirement to generate a response.
              </p>
            </div>
            
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                </div>
              ) : requirements.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="requirement-select">Requirement</Label>
                    <Select value={selectedRequirement} onValueChange={handleRequirementChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a requirement" />
                      </SelectTrigger>
                      <SelectContent>
                        {requirements.map((req) => (
                          <SelectItem key={req.id} value={req.id?.toString() || ""}>
                            <span className="truncate block max-w-[400px]">
                              {req.category}: {req.requirement.length > 40 
                                ? `${req.requirement.substring(0, 40)}...` 
                                : req.requirement}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedRequirement && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-md border border-slate-200">
                      <h4 className="font-medium text-slate-700 mb-2">Selected Requirement:</h4>
                      <p className="text-slate-600">
                        {requirements.find(r => r.id?.toString() === selectedRequirement)?.requirement}
                      </p>
                    </div>
                  )}
                  
                  {selectedRequirement && (
                    <div className="space-y-2 mt-4">
                      <Label>AI Model</Label>
                      <RadioGroup 
                        value={modelProvider}
                        onValueChange={setModelProvider}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="openai" id="openai" />
                          <Label htmlFor="openai" className="cursor-pointer">OpenAI</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="anthropic" id="anthropic" />
                          <Label htmlFor="anthropic" className="cursor-pointer">Anthropic</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                  
                  {errorMessage && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    onClick={handleGenerateResponse}
                    disabled={!selectedRequirement || generating}
                    className="w-full"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Generate Response
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-500">No requirements available. Please upload Excel files first.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {responseText && (
            <Card>
              <div className="px-6 py-5 border-b border-slate-200">
                <h3 className="text-lg font-medium text-slate-800">Response & References</h3>
                <p className="mt-1 text-sm text-slate-500">
                  View and edit your response and reference information.
                </p>
              </div>
              
              <CardContent className="px-6 py-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="response" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Response
                    </TabsTrigger>
                    <TabsTrigger value="references" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      References
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="response" className="space-y-4">
                    <Textarea 
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="min-h-[250px]"
                    />
                    
                    <div className="flex justify-between space-x-3">
                      {similarResponses.length > 0 && (
                        <Button 
                          onClick={toggleSimilarResponses}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          {showSimilarResponses ? "Hide Similar Responses" : "Show Similar Responses"}
                        </Button>
                      )}
                      
                      <Button 
                        onClick={handleSaveResponse}
                        disabled={!responseText}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save Response
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="references" className="min-h-[300px]">
                    <ReferencePanel responseId={selectedRequirementId} showTitle={false} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
          
          {showSimilarResponses && similarResponses.length > 0 && (
            <Card>
              <div className="px-6 py-5 border-b border-slate-200">
                <h3 className="text-lg font-medium text-slate-800">Similar Responses</h3>
                <p className="mt-1 text-sm text-slate-500">
                  These similar requirements were used to generate the response.
                </p>
              </div>
              
              <CardContent className="p-6">
                <div className="space-y-6">
                  {similarResponses.map((item, index) => (
                    <div key={index} className="p-4 border border-slate-200 rounded-md">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-slate-800">Similar Requirement {index + 1}</h4>
                        <span className="text-sm bg-slate-100 px-2 py-1 rounded-full">
                          Score: {(item.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="mb-3 p-3 bg-slate-50 rounded-md">
                        <span className="block text-xs text-slate-500 mb-1">Requirement:</span>
                        <p className="text-sm text-slate-700">{item.requirement}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-md">
                        <span className="block text-xs text-slate-500 mb-1">Response:</span>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.response}</p>
                      </div>
                      
                      {item.reference && (
                        <div className="p-3 bg-slate-50 rounded-md mt-3">
                          <span className="block text-xs text-slate-500 mb-1">Reference:</span>
                          <p className="text-sm text-slate-700">{item.reference}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}