import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Loader2, Save, RefreshCw, BookOpen, History, Check, Filter, Search, ChevronRight, RotateCw, Eye } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReferencePanel from "@/components/ReferencePanel";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';

// Define the structure of our parsed Excel data
interface ExcelRow {
  id?: number;
  category: string;
  requirement: string;
  finalResponse?: string;
  openaiResponse?: string;
  anthropicResponse?: string;
  deepseekResponse?: string;
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
  const [openaiResponseText, setOpenaiResponseText] = useState<string>("");
  const [anthropicResponseText, setAnthropicResponseText] = useState<string>("");
  const [deepseekResponseText, setDeepseekResponseText] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [similarResponses, setSimilarResponses] = useState<SimilarResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelProvider, setModelProvider] = useState<string>("openai");
  const [useModelMixture, setUseModelMixture] = useState<boolean>(true); // Whether to use MOA (Mixture of Agents)
  const [showSimilarResponses, setShowSimilarResponses] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("response");
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | undefined>(undefined);
  
  // States for requirement selection
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<Set<number>>(new Set());
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [viewFilter, setViewFilter] = useState<"all" | "pending">("pending");
  const [progressValue, setProgressValue] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [moaPhase, setMoaPhase] = useState<1 | 2 | null>(null); // Tracks MOA processing phase
  const [moaPhaseProgress, setMoaPhaseProgress] = useState(0); // Progress within the current MOA phase
  const [currentModelFetching, setCurrentModelFetching] = useState<string | null>(null); // Current model being fetched
  const [showReprocessModal, setShowReprocessModal] = useState(false);
  const [reprocessModelProvider, setReprocessModelProvider] = useState<string>("openai");
  const [reprocessUseModelMixture, setReprocessUseModelMixture] = useState<boolean>(true);
  const [reprocessing, setReprocessing] = useState(false);
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
      // Set the main response
      if (selectedReq.finalResponse) {
        setResponseText(selectedReq.finalResponse);
      } else {
        setResponseText("");
      }
      
      // Set individual model responses
      setOpenaiResponseText(selectedReq.openaiResponse || "");
      setAnthropicResponseText(selectedReq.anthropicResponse || "");
      setDeepseekResponseText(selectedReq.deepseekResponse || "");
      
      // Clear previous similar responses and errors
      setSimilarResponses([]);
      setErrorMessage(null);
      
      // Reset to response tab when changing requirements
      setActiveTab("response");
    }
  };

  // Single response generation is now handled through batch generation
  
  // Function to handle reprocessing a response with a different model
  const handleReprocess = async () => {
    if (!selectedRequirementId) return;
    
    setReprocessing(true);
    setErrorMessage(null);
    
    try {
      const selectedReq = requirements.find(r => r.id === selectedRequirementId);
      
      if (selectedReq?.id) {
        const response = await fetch("/api/generate-response", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requirement: selectedReq.requirement,
            provider: reprocessUseModelMixture ? "moa" : reprocessModelProvider,
            requirementId: selectedReq.id // Same ID for replacing the existing response
          })
        });
        
        if (!response.ok) {
          throw new Error("Failed to reprocess response");
        }
        
        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        // Update the response text and the local requirements array
        setResponseText(result.generated_response);
        setOpenaiResponseText(result.openai_response || "");
        setAnthropicResponseText(result.anthropic_response || "");
        setDeepseekResponseText(result.deepseek_response || "");
        
        setRequirements(prev => prev.map(req => 
          req.id === selectedReq.id ? { 
            ...req, 
            finalResponse: result.generated_response,
            openaiResponse: result.openai_response || req.openaiResponse,
            anthropicResponse: result.anthropic_response || req.anthropicResponse,
            deepseekResponse: result.deepseek_response || req.deepseekResponse
          } : req
        ));
        
        // Close the modal
        setShowReprocessModal(false);
        
        toast({
          title: "Response reprocessed",
          description: "The response has been regenerated using " + 
            (reprocessUseModelMixture ? "Mixture of Agents" : reprocessModelProvider),
          variant: "default"
        });
        
        // Add toast with View Generated Responses link
        toast({
          title: "View All Responses",
          description: "Click here to view all your generated responses",
          action: (
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/generated-responses"}>
              View All
            </Button>
          )
        });
      }
    } catch (error) {
      console.error("Error reprocessing response:", error);
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred during reprocessing");
      
      toast({
        title: "Reprocessing failed",
        description: "An error occurred while regenerating the response.",
        variant: "destructive"
      });
    } finally {
      setReprocessing(false);
    }
  };
  
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
          
          // Use toast instead of alert
          toast({
            title: "Response saved successfully!",
            description: "Your response has been saved to the database.",
            variant: "default"
          });
          
          // Add toast with View Generated Responses link
          toast({
            title: "View All Responses",
            description: "Click here to view all your generated responses",
            action: (
              <Button variant="outline" size="sm" onClick={() => window.location.href = "/generated-responses"}>
                View All
              </Button>
            )
          });
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
    setOpenaiResponseText("");
    setAnthropicResponseText("");
    setDeepseekResponseText("");
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
  
  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Add all filtered requirements without responses to selection
      const requirementsToSelect = getRequirementsForDisplay()
        .filter(req => !req.finalResponse); // Only select requirements without responses
      
      const idsToAdd = requirementsToSelect
        .filter(req => req.id !== undefined)
        .map(req => req.id as number);
      
      setSelectedRequirementIds(new Set(idsToAdd));
    } else {
      // Clear all selections
      setSelectedRequirementIds(new Set());
    }
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
    
    // Initialize progress tracking
    const selectedIds = Array.from(selectedRequirementIds);
    setTotalToProcess(selectedIds.length);
    setProcessedCount(0);
    setProgressValue(0);
    
    // Reset MOA phase tracking
    setMoaPhase(null);
    setMoaPhaseProgress(0);
    setCurrentModelFetching(null);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < selectedIds.length; i++) {
        const id = selectedIds[i];
        const requirement = requirements.find(r => r.id === id);
        
        if (!requirement) {
          // Update progress even for skipped items
          const newProcessedCount = i + 1;
          setProcessedCount(newProcessedCount);
          setProgressValue(Math.round((newProcessedCount / selectedIds.length) * 100));
          continue;
        }
        
        try {
          // If using MOA, we need to handle the two-phase process
          if (useModelMixture) {
            // Phase 1: Collect responses from all models
            setMoaPhase(1);
            
            // Start with OpenAI
            setCurrentModelFetching("OpenAI");
            setMoaPhaseProgress(0);
            
            const phase1Response = await fetch("/api/generate-response", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                requirement: requirement.requirement,
                provider: "moa",
                requirementId: requirement.id,
                phase: 1
              })
            });
            
            if (!phase1Response.ok) {
              throw new Error("Failed to generate responses in Phase 1");
            }
            
            const phase1Result = await phase1Response.json();
            
            if (phase1Result.error) {
              throw new Error(phase1Result.error);
            }
            
            // Simulate progress through different models in Phase 1
            // In a real implementation, the backend would provide this information
            setMoaPhaseProgress(33);
            setCurrentModelFetching("Anthropic");
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to show UI update
            
            setMoaPhaseProgress(66);
            setCurrentModelFetching("Deepseek");
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to show UI update
            
            // Check if phase 1 completed successfully and synthesis is ready
            if (phase1Result.phase === 1 && phase1Result.synthesisReady) {
              // Update MOA phase progress
              setCurrentModelFetching("Synthesis");
              setMoaPhaseProgress(100);
              
              // Phase 2: Synthesize responses
              setMoaPhase(2);
              setMoaPhaseProgress(0);
              
              // Show incremental progress in synthesis phase
              const progressInterval = setInterval(() => {
                setMoaPhaseProgress(prev => {
                  if (prev >= 90) {
                    clearInterval(progressInterval);
                    return prev;
                  }
                  return prev + 10;
                });
              }, 400);
              
              const phase2Response = await fetch("/api/generate-response", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  requirement: requirement.requirement,
                  provider: "moa",
                  requirementId: requirement.id,
                  phase: 2,
                  modelResponses: phase1Result.modelResponses
                })
              });
              
              if (!phase2Response.ok) {
                throw new Error("Failed to synthesize responses in Phase 2");
              }
              
              const phase2Result = await phase2Response.json();
              
              if (phase2Result.error) {
                throw new Error(phase2Result.error);
              }
              
              // Clear the interval and set progress to 100%
              clearInterval(progressInterval);
              setMoaPhaseProgress(100);
              
              // Update the requirements list with the new response
              setRequirements(prev => prev.map(req => 
                req.id === requirement.id ? { 
                  ...req, 
                  finalResponse: phase2Result.generated_response || phase2Result.moa_response,
                  openaiResponse: phase1Result.modelResponses?.openaiResponse || req.openaiResponse,
                  anthropicResponse: phase1Result.modelResponses?.anthropicResponse || req.anthropicResponse,
                  deepseekResponse: phase1Result.modelResponses?.deepseekResponse || req.deepseekResponse,
                  moaResponse: phase2Result.moa_response
                } : req
              ));
              
              successCount++;
            } else {
              // If synthesis isn't ready, consider it a failure
              failCount++;
            }
          } else {
            // Standard single-model processing
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
            } else {
              const result = await response.json();
              
              if (result.error) {
                failCount++;
              } else {
                // Update the requirements list with the new response
                setRequirements(prev => prev.map(req => 
                  req.id === requirement.id ? { 
                    ...req, 
                    finalResponse: result.generated_response,
                    openaiResponse: result.openai_response || req.openaiResponse,
                    anthropicResponse: result.anthropic_response || req.anthropicResponse,
                    deepseekResponse: result.deepseek_response || req.deepseekResponse
                  } : req
                ));
                
                successCount++;
              }
            }
          }
        } catch (error) {
          console.error(`Error generating response for requirement ${id}:`, error);
          failCount++;
        }
        
        // Reset MOA phase tracking for next item
        setMoaPhase(null);
        setMoaPhaseProgress(0);
        setCurrentModelFetching(null);
        
        // Update progress after each item is processed
        const newProcessedCount = i + 1;
        setProcessedCount(newProcessedCount);
        setProgressValue(Math.round((newProcessedCount / selectedIds.length) * 100));
      }
      
      // Show summary toast
      toast({
        title: "Batch generation complete",
        description: `Successfully generated ${successCount} responses. Failed: ${failCount}`,
        variant: successCount > 0 ? "default" : "destructive"
      });
      
      // Clear selections after batch processing
      setSelectedRequirementIds(new Set());
      
      // Add toast with View Generated Responses link
      if (successCount > 0) {
        toast({
          title: "View Generated Responses",
          description: "Click here to view all your generated responses",
          action: (
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/generated-responses"}>
              View All
            </Button>
          )
        });
      }
      
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
      setMoaPhase(null);
      setMoaPhaseProgress(0);
      setCurrentModelFetching(null);
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
  
  // Get requirements based on view filter
  const getRequirementsForDisplay = () => {
    return viewFilter === "pending" 
      ? getRequirementsWithoutResponses() 
      : getFilteredRequirements();
  };

  return (
    <div className="h-full">
      {/* Reprocess Modal */}
      <Dialog open={showReprocessModal} onOpenChange={setShowReprocessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reprocess Response</DialogTitle>
            <DialogDescription>
              Regenerate this response using different AI models. The new response will replace the current one.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>AI Model</Label>
              <Select 
                defaultValue="moa" 
                onValueChange={(value) => {
                  if (value === "moa") {
                    setReprocessUseModelMixture(true);
                  } else {
                    setReprocessUseModelMixture(false);
                    setReprocessModelProvider(value);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moa">Mixture of Agents (MOA)</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="deepseek">Deepseek</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Simple explanation for selected model */}
              <div className="text-xs text-slate-500 mt-1">
                {reprocessUseModelMixture ? (
                  <p>Combines responses from multiple AI models for optimal results</p>
                ) : (
                  <p>Using {reprocessModelProvider === "openai" ? "OpenAI" : 
                           reprocessModelProvider === "anthropic" ? "Anthropic/Claude" : 
                           reprocessModelProvider === "deepseek" ? "Deepseek" : ""} model only</p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setShowReprocessModal(false)}
              disabled={reprocessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReprocess}
              disabled={reprocessing}
              className="flex items-center gap-2"
            >
              {reprocessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
              {reprocessing ? "Processing..." : "Reprocess"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
                  
                  {/* AI Model selection - Simplified dropdown */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>AI Model</Label>
                      <Select 
                        defaultValue="moa" 
                        onValueChange={(value) => {
                          if (value === "moa") {
                            setUseModelMixture(true);
                          } else {
                            setUseModelMixture(false);
                            setModelProvider(value);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select AI model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="moa">Mixture of Agents (MOA)</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="deepseek">Deepseek</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Simple explanation for selected model */}
                      <div className="text-xs text-slate-500 mt-1">
                        {useModelMixture ? (
                          <p>Combines responses from multiple AI models for optimal results</p>
                        ) : (
                          <p>Using {modelProvider === "openai" ? "OpenAI" : 
                                   modelProvider === "anthropic" ? "Anthropic/Claude" : 
                                   modelProvider === "deepseek" ? "Deepseek" : ""} model only</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Requirements selection */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <Label>Requirements</Label>
                        <div className="flex items-center border rounded-md overflow-hidden">
                          <button 
                            className={`px-3 py-1 text-sm ${viewFilter === 'pending' ? 'bg-primary text-white' : 'bg-transparent text-slate-700'}`}
                            onClick={() => setViewFilter("pending")}
                          >
                            Pending
                          </button>
                          <button 
                            className={`px-3 py-1 text-sm ${viewFilter === 'all' ? 'bg-primary text-white' : 'bg-transparent text-slate-700'}`}
                            onClick={() => setViewFilter("all")}
                          >
                            All
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-slate-500">
                        Selected: {selectedRequirementIds.size} / {getRequirementsForDisplay().length}
                      </div>
                    </div>
                    
                    {/* Select All option */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200">
                      <Checkbox 
                        id="select-all"
                        checked={
                          getRequirementsForDisplay().filter(req => !req.finalResponse).length > 0 && 
                          selectedRequirementIds.size === getRequirementsForDisplay().filter(req => !req.finalResponse).length
                        }
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                      />
                      <label 
                        htmlFor="select-all" 
                        className="text-sm font-medium text-slate-700 cursor-pointer"
                      >
                        Select All Pending Requirements
                      </label>
                    </div>
                    
                    <div className="border border-slate-200 rounded-md max-h-[300px] overflow-y-auto">
                      {getRequirementsForDisplay().length > 0 ? (
                        <div className="divide-y divide-slate-200">
                          {getRequirementsForDisplay().map((req) => (
                            <div 
                              key={req.id} 
                              className="p-3 hover:bg-slate-50 flex items-start gap-3"
                            >
                              <div className="pt-0.5">
                                {!req.finalResponse ? (
                                  <Checkbox 
                                    id={`req-${req.id}`}
                                    checked={req.id ? selectedRequirementIds.has(req.id) : false}
                                    onCheckedChange={() => req.id && handleCheckboxChange(req.id)}
                                  />
                                ) : (
                                  <div className="flex h-4 w-4 items-center justify-center rounded-sm border border-green-500 bg-green-50">
                                    <Check className="h-3 w-3 text-green-500" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div 
                                  className="block cursor-pointer"
                                  onClick={() => handleSingleRequirementSelect(req.id as number)}
                                >
                                  <div className="font-medium text-slate-700 break-words">{req.category}</div>
                                  <div className="text-sm text-slate-600 mt-1 break-words">{req.requirement}</div>
                                </div>
                              </div>
                              {req.finalResponse && (
                                <div className="flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      handleSingleRequirementSelect(req.id as number);
                                      setShowReprocessModal(true);
                                    }}
                                    className="h-8 px-2"
                                  >
                                    <RotateCw className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline">Reprocess</span>
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-slate-500">
                          No requirements found. Try changing the filters.
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
                  
                  {/* Progress bar for batch generation */}
                  {batchGenerating && (
                    <div className="space-y-2 mt-4">
                      {/* Overall progress */}
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>Processing: {processedCount} of {totalToProcess}</span>
                        <span>{progressValue}%</span>
                      </div>
                      <Progress value={progressValue} className="h-2" />
                      
                      {/* MOA phase-specific progress */}
                      {useModelMixture && moaPhase && (
                        <div className="mt-4 border border-slate-200 rounded-md p-3 bg-slate-50">
                          <div className="flex justify-between text-sm font-medium mb-1">
                            <span>MOA Phase {moaPhase}: {moaPhase === 1 ? "Collecting Responses" : "Synthesizing"}</span>
                            <span>{moaPhaseProgress}%</span>
                          </div>
                          
                          <Progress value={moaPhaseProgress} className="h-2 mb-3" />
                          
                          {moaPhase === 1 && (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <div className={`text-xs py-1 px-2 rounded-md flex items-center justify-center ${
                                currentModelFetching === "OpenAI" ? "bg-blue-100 text-blue-800" : "bg-slate-100"
                              }`}>
                                <div className={`w-2 h-2 rounded-full mr-1 ${
                                  currentModelFetching === "OpenAI" ? "bg-blue-500 animate-pulse" : "bg-slate-300"
                                }`}></div>
                                OpenAI
                              </div>
                              <div className={`text-xs py-1 px-2 rounded-md flex items-center justify-center ${
                                currentModelFetching === "Anthropic" ? "bg-purple-100 text-purple-800" : "bg-slate-100"
                              }`}>
                                <div className={`w-2 h-2 rounded-full mr-1 ${
                                  currentModelFetching === "Anthropic" ? "bg-purple-500 animate-pulse" : "bg-slate-300"
                                }`}></div>
                                Anthropic
                              </div>
                              <div className={`text-xs py-1 px-2 rounded-md flex items-center justify-center ${
                                currentModelFetching === "Deepseek" ? "bg-green-100 text-green-800" : "bg-slate-100"
                              }`}>
                                <div className={`w-2 h-2 rounded-full mr-1 ${
                                  currentModelFetching === "Deepseek" ? "bg-green-500 animate-pulse" : "bg-slate-300"
                                }`}></div>
                                Deepseek
                              </div>
                            </div>
                          )}
                          
                          {moaPhase === 2 && (
                            <div className={`text-xs py-1 px-2 rounded-md flex items-center justify-center ${
                              currentModelFetching === "Synthesis" ? "bg-amber-100 text-amber-800" : "bg-slate-100"
                            }`}>
                              <div className={`w-2 h-2 rounded-full mr-1 ${
                                currentModelFetching === "Synthesis" ? "bg-amber-500 animate-pulse" : "bg-slate-300"
                              }`}></div>
                              Synthesizing with OpenAI
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
                  <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-6">
                    <TabsTrigger value="response" className="flex items-center gap-1 sm:gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="sm:inline">Final</span>
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex items-center gap-1 sm:gap-2">
                      <Eye className="h-4 w-4" />
                      <span className="sm:inline">Preview</span>
                    </TabsTrigger>
                    <TabsTrigger value="openai" className="flex items-center gap-1 sm:gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="sm:inline">OpenAI</span>
                    </TabsTrigger>
                    <TabsTrigger value="anthropic" className="flex items-center gap-1 sm:gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">Anthropic</span>
                      <span className="sm:hidden">Claude</span>
                    </TabsTrigger>
                    <TabsTrigger value="deepseek" className="flex items-center gap-1 sm:gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="sm:inline">Deepseek</span>
                    </TabsTrigger>
                    <TabsTrigger value="references" className="flex items-center gap-1 sm:gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span className="hidden sm:inline">References</span>
                      <span className="sm:hidden">Refs</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="response" className="space-y-4">
                    <Textarea 
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="min-h-[250px]"
                    />
                    
                    <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-3">
                      <div className="flex flex-wrap gap-2">
                        {similarResponses.length > 0 && (
                          <Button 
                            onClick={toggleSimilarResponses}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            <span className="hidden sm:inline">{showSimilarResponses ? "Hide Similar Responses" : "Show Similar Responses"}</span>
                            <span className="sm:hidden">{showSimilarResponses ? "Hide References" : "Show References"}</span>
                          </Button>
                        )}
                        
                        {selectedRequirementId && (
                          <Button 
                            onClick={() => setShowReprocessModal(true)}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <RotateCw className="h-4 w-4" />
                            Reprocess
                          </Button>
                        )}
                      </div>
                      
                      <Button 
                        onClick={handleSaveResponse}
                        disabled={!responseText}
                        className="flex items-center gap-2 sm:mt-0"
                      >
                        <Save className="h-4 w-4" />
                        Save Response
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="preview" className="min-h-[300px]">
                    <div className="border rounded-md p-4 bg-white min-h-[250px]">
                      <div className="prose max-w-none">
                        {responseText ? (
                          <ReactMarkdown>{responseText}</ReactMarkdown>
                        ) : (
                          <div className="text-slate-400 italic">No content to preview</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
                      <div className="flex flex-wrap gap-2">
                        {similarResponses.length > 0 && (
                          <Button 
                            onClick={toggleSimilarResponses}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            <span className="hidden sm:inline">{showSimilarResponses ? "Hide Similar Responses" : "Show Similar Responses"}</span>
                            <span className="sm:hidden">{showSimilarResponses ? "Hide References" : "Show References"}</span>
                          </Button>
                        )}
                      </div>
                      
                      <Button 
                        onClick={handleSaveResponse}
                        disabled={!responseText}
                        className="flex items-center gap-2 sm:mt-0"
                      >
                        <Save className="h-4 w-4" />
                        Save Response
                      </Button>
                    </div>
                  </TabsContent>
                  
                  {/* OpenAI Response Tab */}
                  <TabsContent value="openai" className="min-h-[300px]">
                    <div className="border rounded-md p-4 bg-white min-h-[250px]">
                      <div className="prose max-w-none">
                        {openaiResponseText ? (
                          <ReactMarkdown>{openaiResponseText}</ReactMarkdown>
                        ) : (
                          <div className="text-slate-400 italic">No OpenAI response available</div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* Anthropic Response Tab */}
                  <TabsContent value="anthropic" className="min-h-[300px]">
                    <div className="border rounded-md p-4 bg-white min-h-[250px]">
                      <div className="prose max-w-none">
                        {anthropicResponseText ? (
                          <ReactMarkdown>{anthropicResponseText}</ReactMarkdown>
                        ) : (
                          <div className="text-slate-400 italic">No Anthropic/Claude response available</div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* Deepseek Response Tab */}
                  <TabsContent value="deepseek" className="min-h-[300px]">
                    <div className="border rounded-md p-4 bg-white min-h-[250px]">
                      <div className="prose max-w-none">
                        {deepseekResponseText ? (
                          <ReactMarkdown>{deepseekResponseText}</ReactMarkdown>
                        ) : (
                          <div className="text-slate-400 italic">No Deepseek response available</div>
                        )}
                      </div>
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