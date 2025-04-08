import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Loader2, Save, RefreshCw, BookOpen, History, Check, Filter, Search, ChevronRight } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import ReferencePanel from "@/components/ReferencePanel";
import { useToast } from "@/hooks/use-toast";

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
  const [responseText, setResponseText] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [similarResponses, setSimilarResponses] = useState<SimilarResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelProvider, setModelProvider] = useState<string>("openai");
  const [showSimilarResponses, setShowSimilarResponses] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("response");
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | undefined>(undefined);
  
  // States for requirement selection
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<Set<number>>(new Set());
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch the data from the API
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/excel-requirements");
        if (response.ok) {
          const data = await response.json();
          setRequirements(data);
          
          // Extract unique categories for filtering
          const categories = new Set<string>();
          data.forEach((req: ExcelRow) => {
            if (req.category) {
              categories.add(req.category);
            }
          });
          
          setUniqueCategories(Array.from(categories).sort());
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

  // When selecting a requirement in the checkbox, we set the selected requirement ID
  const handleSingleRequirementSelect = (id: number) => {
    setSelectedRequirementId(id);
    
    // Check if it already has a response
    const selectedReq = requirements.find(r => r.id === id);
    
    if (selectedReq) {
      if (selectedReq.finalResponse) {
        setResponseText(selectedReq.finalResponse);
      } else {
        setResponseText("");
      }
      
      // Clear previous similar responses and errors
      setSimilarResponses([]);
      setErrorMessage(null);
      
      // Reset to response tab when changing requirements
      setActiveTab("response");
    }
  };

  // Single response generation is now handled through batch generation
  
  const handleSaveResponse = async () => {
    if (!selectedRequirementId || !responseText) return;
    
    try {
      const selectedReq = requirements.find(r => r.id === selectedRequirementId);
      
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
  
  // Reset selections
  const resetSelections = () => {
    setSelectedRequirementIds(new Set());
    setSelectedRequirementId(undefined);
    setResponseText("");
    setSimilarResponses([]);
    setErrorMessage(null);
  };
  
  // Handle checkbox selection for multiple requirements
  const handleCheckboxChange = (id: number) => {
    setSelectedRequirementIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  
  // Generate responses for multiple selected requirements
  const handleBatchGenerate = async () => {
    if (selectedRequirementIds.size === 0) {
      toast({
        title: "No requirements selected",
        description: "Please select at least one requirement to generate responses.",
        variant: "destructive"
      });
      return;
    }
    
    setBatchGenerating(true);
    setErrorMessage(null);
    
    try {
      const selectedIds = Array.from(selectedRequirementIds);
      let successCount = 0;
      let failCount = 0;
      
      for (const id of selectedIds) {
        const requirement = requirements.find(r => r.id === id);
        
        if (!requirement) continue;
        
        try {
          const response = await fetch("/api/generate-response", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requirement: requirement.requirement,
              provider: modelProvider,
              requirementId: requirement.id
            })
          });
          
          if (!response.ok) {
            failCount++;
            continue;
          }
          
          const result = await response.json();
          
          if (result.error) {
            failCount++;
            continue;
          }
          
          // Update the requirements list with the new response
          setRequirements(prev => prev.map(req => 
            req.id === requirement.id ? { ...req, finalResponse: result.generated_response } : req
          ));
          
          successCount++;
        } catch (error) {
          console.error(`Error generating response for requirement ${id}:`, error);
          failCount++;
        }
      }
      
      // Show summary toast
      toast({
        title: "Batch generation complete",
        description: `Successfully generated ${successCount} responses. Failed: ${failCount}`,
        variant: successCount > 0 ? "default" : "destructive"
      });
      
      // Clear selections after batch processing
      setSelectedRequirementIds(new Set());
      
    } catch (error) {
      console.error("Error in batch generation:", error);
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred during batch generation");
      
      toast({
        title: "Batch generation failed",
        description: "An error occurred while generating multiple responses.",
        variant: "destructive"
      });
    } finally {
      setBatchGenerating(false);
    }
  };
  
  // Filter requirements based on search query and category
  const getFilteredRequirements = () => {
    return requirements.filter(req => {
      // Filter by category if a category is selected
      if (categoryFilter && req.category !== categoryFilter) {
        return false;
      }
      
      // Filter by search query if present
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          req.requirement.toLowerCase().includes(query) ||
          req.category.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  };
  
  // Get requirements that don't have responses yet
  const getRequirementsWithoutResponses = () => {
    return getFilteredRequirements().filter(req => !req.finalResponse);
  };

  return (
    <div className="h-full">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Generate Response</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={resetSelections}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Selections
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <div className="px-6 py-5 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-800">Select Requirements</h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose one or more requirements to generate responses.
              </p>
            </div>
            
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                </div>
              ) : requirements.length > 0 ? (
                <div className="space-y-4">
                  {/* Filter controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="search-query">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                          id="search-query"
                          type="text"
                          placeholder="Search requirements..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 h-10 rounded-md border border-slate-200 w-full"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category-filter">Category</Label>
                      <Select 
                        value={categoryFilter || "all"} 
                        onValueChange={(val) => setCategoryFilter(val === "all" ? null : val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All categories</SelectItem>
                          {uniqueCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* AI Model selection */}
                  <div className="space-y-2">
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
                  
                  {/* Requirements selection */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Requirements without Responses</Label>
                      <div className="text-sm text-slate-500">
                        Selected: {selectedRequirementIds.size} / {getRequirementsWithoutResponses().length}
                      </div>
                    </div>
                    
                    <div className="border border-slate-200 rounded-md max-h-[300px] overflow-y-auto">
                      {getRequirementsWithoutResponses().length > 0 ? (
                        <div className="divide-y divide-slate-200">
                          {getRequirementsWithoutResponses().map((req) => (
                            <div 
                              key={req.id} 
                              className="p-3 hover:bg-slate-50 flex items-start gap-3"
                            >
                              <div className="pt-0.5">
                                <Checkbox 
                                  id={`req-${req.id}`}
                                  checked={req.id ? selectedRequirementIds.has(req.id) : false}
                                  onCheckedChange={() => req.id && handleCheckboxChange(req.id)}
                                />
                              </div>
                              <div className="flex-1">
                                <label 
                                  htmlFor={`req-${req.id}`} 
                                  className="block cursor-pointer"
                                >
                                  <div className="font-medium text-slate-700">{req.category}</div>
                                  <div className="text-sm text-slate-600 mt-1">{req.requirement}</div>
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-slate-500">
                          No requirements without responses found. Try changing the filters.
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {errorMessage && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    onClick={handleBatchGenerate}
                    disabled={selectedRequirementIds.size === 0 || batchGenerating}
                    className="w-full"
                  >
                    {batchGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating {selectedRequirementIds.size} Responses...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Generate {selectedRequirementIds.size} {selectedRequirementIds.size === 1 ? 'Response' : 'Responses'}
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