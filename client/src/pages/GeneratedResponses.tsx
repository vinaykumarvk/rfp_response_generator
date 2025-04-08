import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Eye, 
  RefreshCw, 
  Search,
  BookOpen,
  MessageSquare,
  Filter,
  Edit,
  Save,
  X,
  RotateCw,
  Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import ReferencePanel from "@/components/ReferencePanel";

interface ExcelRow {
  id?: number;
  category: string;
  requirement: string;
  finalResponse?: string;
  timestamp?: string;
  rating?: number;
  modelProvider?: string;
}

export default function GeneratedResponses() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [responses, setResponses] = useState<ExcelRow[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<ExcelRow | null>(null);
  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editedResponse, setEditedResponse] = useState("");
  const [showReprocessModal, setShowReprocessModal] = useState(false);
  const [reprocessModelProvider, setReprocessModelProvider] = useState<string>("openai");
  const [reprocessUseModelMixture, setReprocessUseModelMixture] = useState<boolean>(false);
  const [reprocessing, setReprocessing] = useState(false);
  const { toast } = useToast();

  // Fetch generated responses
  const fetchResponses = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/excel-requirements");
      if (response.ok) {
        const data: ExcelRow[] = await response.json();
        // Filter to only show responses that have finalResponse
        const generatedData = data.filter(item => item.finalResponse);
        setResponses(generatedData);
        
        // Extract unique categories for filtering
        const categoriesSet = new Set<string>();
        generatedData.forEach(item => {
          if (item.category) categoriesSet.add(item.category);
        });
        setUniqueCategories(Array.from(categoriesSet));
      } else {
        console.error("Failed to fetch responses");
      }
    } catch (error) {
      console.error("Error fetching responses:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchResponses();
  }, []);

  // Handle viewing a response detail
  const handleViewDetail = (response: ExcelRow) => {
    if (!response.id) return;
    setSelectedResponse(response);
    setSelectedResponseId(response.id);
    setShowDetailView(true);
  };
  
  // Handle direct editing from table
  const handleDirectEdit = (response: ExcelRow) => {
    if (!response.id) return;
    
    // First view the detail
    setSelectedResponse(response);
    setSelectedResponseId(response.id);
    setShowDetailView(true);
    
    // Then enable edit mode (need to use a timeout to ensure the state is updated properly)
    setTimeout(() => {
      if (response.finalResponse) {
        setEditedResponse(response.finalResponse);
        setEditMode(true);
      }
    }, 100);
  };

  // Handle going back to the list view
  const handleBackToList = () => {
    setShowDetailView(false);
    setSelectedResponse(null);
    setSelectedResponseId(null);
    setEditMode(false);
    setEditedResponse("");
  };

  // Enable edit mode
  const enableEditMode = () => {
    if (selectedResponse && selectedResponse.finalResponse) {
      setEditedResponse(selectedResponse.finalResponse);
      setEditMode(true);
    }
  };

  // Cancel edit mode
  const cancelEditMode = () => {
    setEditMode(false);
    setEditedResponse("");
  };

  // Function to handle reprocessing a response with a different model
  const handleReprocess = async () => {
    if (!selectedResponse || !selectedResponseId) return;
    
    setReprocessing(true);
    
    try {
      const response = await fetch("/api/generate-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requirement: selectedResponse.requirement,
          provider: reprocessUseModelMixture ? "moa" : reprocessModelProvider,
          requirementId: selectedResponseId // Same ID for replacing the existing response
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to reprocess response");
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update the selected response with the new generated response
      setSelectedResponse({
        ...selectedResponse,
        finalResponse: result.generated_response,
        modelProvider: reprocessUseModelMixture ? "Mixture of Agents (MOA)" : reprocessModelProvider
      });
      
      // Update the response in the list
      setResponses(prevResponses => prevResponses.map(response => 
        response.id === selectedResponseId 
          ? { 
              ...response, 
              finalResponse: result.generated_response,
              modelProvider: reprocessUseModelMixture ? "Mixture of Agents (MOA)" : reprocessModelProvider
            } 
          : response
      ));
      
      // Close the modal
      setShowReprocessModal(false);
      
      toast({
        title: "Response reprocessed",
        description: "The response has been regenerated using " + 
          (reprocessUseModelMixture ? "Mixture of Agents" : reprocessModelProvider),
        variant: "default"
      });
    } catch (error) {
      console.error("Error reprocessing response:", error);
      
      toast({
        title: "Reprocessing failed",
        description: error instanceof Error ? error.message : "An error occurred while regenerating the response.",
        variant: "destructive"
      });
    } finally {
      setReprocessing(false);
    }
  };
  
  // Save the edited response
  const saveEditedResponse = async () => {
    if (!selectedResponse || !selectedResponseId) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/excel-requirements/${selectedResponseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finalResponse: editedResponse
        }),
      });
      
      if (response.ok) {
        const updatedResponse = await response.json();
        
        // Update the selected response with the new data
        setSelectedResponse({
          ...selectedResponse,
          finalResponse: updatedResponse.finalResponse
        });
        
        // Update the response in the list
        setResponses(prevResponses => prevResponses.map(response => 
          response.id === selectedResponseId 
            ? { ...response, finalResponse: updatedResponse.finalResponse } 
            : response
        ));
        
        // Exit edit mode
        setEditMode(false);
        
        // Show success toast
        toast({
          title: "Response updated",
          description: "Your changes have been saved successfully.",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update response');
      }
    } catch (error) {
      console.error('Error updating response:', error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An error occurred while saving changes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter responses based on search query and category
  const filteredResponses = responses.filter(response => {
    const matchesSearch = searchQuery === "" || 
      response.requirement.toLowerCase().includes(searchQuery.toLowerCase()) ||
      response.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (response.finalResponse && response.finalResponse.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === null || response.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const isMobile = useIsMobile();

  return (
    <div className="h-full overflow-auto">
      {!showDetailView ? (
        // List View
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Generated Responses</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchResponses} 
              disabled={loading}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className={isMobile ? "sr-only" : ""}>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          </div>
          
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="relative w-full md:w-2/3">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isMobile ? "Search..." : "Search by requirement or content..."}
                    className="w-full pl-8 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 w-full md:w-1/3">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <select
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    value={categoryFilter || ""}
                    onChange={(e) => setCategoryFilter(e.target.value === "" ? null : e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {uniqueCategories.map((category, index) => (
                      <option key={index} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Responses</TabsTrigger>
              <TabsTrigger value="openai">OpenAI Generated</TabsTrigger>
              <TabsTrigger value="anthropic">Anthropic Generated</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              <ResponsesTable 
                responses={filteredResponses} 
                loading={loading} 
                onViewDetail={handleViewDetail}
                onEditResponse={handleDirectEdit}
              />
            </TabsContent>
            
            <TabsContent value="openai" className="mt-0">
              <ResponsesTable 
                responses={filteredResponses.filter(r => r.modelProvider?.toLowerCase()?.includes('openai'))} 
                loading={loading} 
                onViewDetail={handleViewDetail}
                onEditResponse={handleDirectEdit}
              />
            </TabsContent>
            
            <TabsContent value="anthropic" className="mt-0">
              <ResponsesTable 
                responses={filteredResponses.filter(r => r.modelProvider?.toLowerCase()?.includes('anthropic'))} 
                loading={loading} 
                onViewDetail={handleViewDetail}
                onEditResponse={handleDirectEdit}
              />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        // Detail View
        <div className="p-6">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              onClick={handleBackToList} 
              className="mr-4"
            >
              ← Back to List
            </Button>
            <h2 className="text-2xl font-bold text-slate-800">Response Details</h2>
          </div>
          
          {selectedResponse && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-1">Category:</h3>
                      <p className="text-slate-800 text-lg">{selectedResponse.category}</p>
                    </div>
                    {selectedResponse.modelProvider && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">Generated with:</h3>
                        <p className="text-slate-800 text-lg">{selectedResponse.modelProvider}</p>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-1">Date Generated:</h3>
                      <p className="text-slate-800">
                        {selectedResponse.timestamp ? (
                          <span title={selectedResponse.timestamp}>
                            {
                              (() => {
                                try {
                                  return format(new Date(selectedResponse.timestamp), 'MMM d, yyyy HH:mm');
                                } catch (e) {
                                  return selectedResponse.timestamp;
                                }
                              })()
                            }
                          </span>
                        ) : "—"}
                      </p>
                    </div>
                    {selectedResponse.rating !== undefined && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">Rating:</h3>
                        <p className="text-slate-800 text-lg">{selectedResponse.rating}/5</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Requirement:</h3>
                    <div className="p-4 bg-slate-50 rounded-md">
                      <p className="text-slate-800">{selectedResponse.requirement}</p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-sm font-medium text-slate-500">Generated Response:</h3>
                      <div className="flex space-x-2">
                        {!editMode ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setShowReprocessModal(true)}
                              className="flex items-center gap-1"
                            >
                              <RotateCw className="h-4 w-4" />
                              <span className={isMobile ? "sr-only" : ""}>Reprocess</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={enableEditMode}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-4 w-4" />
                              <span className={isMobile ? "sr-only" : ""}>Edit</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={cancelEditMode}
                              className="flex items-center gap-1"
                            >
                              <X className="h-4 w-4" />
                              <span className={isMobile ? "sr-only" : ""}>Cancel</span>
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={saveEditedResponse}
                              disabled={saving}
                              className="flex items-center gap-1"
                            >
                              <Save className="h-4 w-4" />
                              <span className={isMobile ? "sr-only" : ""}>{saving ? 'Saving...' : 'Save'}</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {editMode ? (
                      <Textarea
                        className="w-full h-64 p-4 bg-slate-50 rounded-md font-mono text-sm"
                        value={editedResponse}
                        onChange={(e) => setEditedResponse(e.target.value)}
                        placeholder="Edit the generated response..."
                      />
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-md">
                        <p className="text-slate-800 whitespace-pre-wrap">{selectedResponse.finalResponse}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <div className="px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-slate-500" />
                    <h3 className="text-lg font-medium text-slate-800">Reference Information</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Similar responses that were used to generate this response.
                  </p>
                </div>
                <CardContent className="p-6">
                  <ReferencePanel responseId={selectedResponseId || undefined} showTitle={false} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
      
      {/* Reprocess Dialog Modal */}
      <Dialog open={showReprocessModal} onOpenChange={setShowReprocessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reprocess Response</DialogTitle>
            <DialogDescription>
              Regenerate this response using a different AI model. This will replace the current response.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="use-model-mixture"
                  checked={reprocessUseModelMixture}
                  onChange={(e) => setReprocessUseModelMixture(e.target.checked)}
                  className="h-4 w-4 border-gray-300 rounded text-primary focus:ring-primary"
                />
                <label htmlFor="use-model-mixture" className="text-sm font-medium text-gray-900">
                  Use Mixture of Agents (MOA)
                </label>
              </div>
              
              {!reprocessUseModelMixture && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Model:</label>
                  <RadioGroup 
                    value={reprocessModelProvider} 
                    onValueChange={setReprocessModelProvider}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="openai" id="openai" />
                      <Label htmlFor="openai">OpenAI</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="anthropic" id="anthropic" />
                      <Label htmlFor="anthropic">Anthropic</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowReprocessModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReprocess}
              disabled={reprocessing}
              className="flex items-center gap-2"
            >
              {reprocessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <RotateCw className="h-4 w-4" />
                  <span>Reprocess</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Table component for responses
function ResponsesTable({ 
  responses, 
  loading, 
  onViewDetail,
  onEditResponse
}: { 
  responses: ExcelRow[], 
  loading: boolean, 
  onViewDetail: (response: ExcelRow) => void,
  onEditResponse: (response: ExcelRow) => void
}) {
  const isMobile = useIsMobile();
  
  // Format date in a consistent way
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };

  // Empty state component for no responses
  const EmptyState = () => (
    <div className="p-8 text-center">
      <div className="flex flex-col items-center justify-center">
        <MessageSquare className="h-10 w-10 text-slate-300 mb-3" />
        <p className="text-slate-500">No generated responses found.</p>
        <p className="text-slate-400 text-xs mt-1">
          Go to the Generate Response page to create new responses.
        </p>
      </div>
    </div>
  );

  // Loading state component
  const LoadingState = () => (
    <div className="p-6">
      <div className="space-y-3">
        {isMobile ? (
          // Mobile loading skeletons (cards)
          <>
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </>
        ) : (
          // Desktop loading skeletons (table rows)
          <>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </>
        )}
      </div>
    </div>
  );

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-4 pb-6">
        {loading ? (
          <LoadingState />
        ) : responses.length > 0 ? (
          responses.map((response, index) => (
            <Card key={response.id || index} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-primary">{response.category}</div>
                  {response.modelProvider && (
                    <div className="text-xs px-2 py-1 bg-slate-100 rounded-full">
                      {response.modelProvider.includes("MOA") 
                        ? "MOA" 
                        : response.modelProvider.split(' ')[0]}
                    </div>
                  )}
                </div>
                
                <div className="text-sm font-medium mb-2 line-clamp-2">
                  {response.requirement}
                </div>
                
                {response.finalResponse && (
                  <div className="text-sm text-slate-600 mb-3 line-clamp-2 border-l-2 border-slate-200 pl-2">
                    {response.finalResponse}
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-slate-500">
                    {response.timestamp ? formatDate(response.timestamp) : "—"}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onViewDetail(response)}
                      className="h-8 px-2 py-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onEditResponse(response)}
                      className="h-8 px-2 py-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    );
  }
  
  // Desktop table view
  return (
    <Card>
      <CardContent className="p-0 overflow-auto">
        {loading ? (
          <LoadingState />
        ) : responses.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead>Response Preview</TableHead>
                <TableHead>Date Generated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response, index) => (
                <TableRow key={response.id || index}>
                  <TableCell>{response.category}</TableCell>
                  <TableCell className="max-w-md truncate">{response.requirement}</TableCell>
                  <TableCell>
                    {response.finalResponse && (
                      <div className="max-w-md truncate">
                        {response.finalResponse.length > 80 
                          ? `${response.finalResponse.substring(0, 80)}...` 
                          : response.finalResponse}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {response.timestamp ? (
                      <span title={response.timestamp}>{formatDate(response.timestamp)}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onViewDetail(response)}
                        className="px-2 h-8"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        <span className="sr-only">View</span>
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onEditResponse(response)}
                        className="px-2 h-8"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        <span className="sr-only">Edit</span>
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}