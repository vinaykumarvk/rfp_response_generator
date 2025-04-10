import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  ArrowLeft, 
  BookOpen, 
  Eye, 
  RefreshCcw, 
  Trash2, 
  Printer, 
  Mail, 
  MoreHorizontal, 
  Sparkles,
  CheckSquare,
  Activity,
  Zap,
  Square,
  Check,
  Filter,
  X,
  ChevronRight,
  Atom,
  Bot,
  Brain,
  Network
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import ReferencePanel from '@/components/ReferencePanel';
import { ExcelRequirementResponse } from '@shared/schema';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ViewData() {
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<ExcelRequirementResponse | null>(null);
  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('response');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    rfpName: 'all',
    category: 'all',
    hasResponse: 'all', // 'all', 'yes', 'no'
    generationMode: 'all', // 'all', 'openai', 'anthropic', 'deepseek', 'moa'
  });
  
  // Sorting
  const [sortConfig, setSortConfig] = useState({
    key: 'timestamp',
    direction: 'desc' as 'asc' | 'desc'
  });
  
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const { data: excelData = [], isLoading: loading, refetch } = useQuery<ExcelRequirementResponse[]>({
    queryKey: ['/api/excel-requirements'],
  });
  
  // Extract unique RFP names and categories
  const uniqueRfpNames = useMemo(() => {
    const names = excelData
      .map(item => item.rfpName || '')
      .filter((value, index, self) => 
        value && self.indexOf(value) === index
      );
    return names.sort();
  }, [excelData]);
  
  const uniqueCategories = useMemo(() => {
    const categories = excelData
      .map(item => item.category || '')
      .filter((value, index, self) => 
        value && self.indexOf(value) === index
      );
    return categories.sort();
  }, [excelData]);
  
  // Function to handle sort request
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // Apply filters to the data
  const filteredData = useMemo(() => {
    // First filter the data
    const filtered = excelData.filter(row => {
      // Filter by RFP name
      if (filters.rfpName && filters.rfpName !== 'all' && row.rfpName) {
        if (row.rfpName !== filters.rfpName) {
          return false;
        }
      }
      
      // Filter by category
      if (filters.category && filters.category !== 'all' && row.category) {
        if (row.category !== filters.category) {
          return false;
        }
      }
      
      // Filter by response status
      if (filters.hasResponse !== 'all') {
        const hasResponse = !!row.finalResponse;
        if ((filters.hasResponse === 'yes' && !hasResponse) || 
            (filters.hasResponse === 'no' && hasResponse)) {
          return false;
        }
      }
      
      // Filter by generation mode
      if (filters.generationMode !== 'all' && filters.generationMode) {
        // If openAI model was used to generate the response
        if (filters.generationMode === 'openai' && !row.openaiResponse) {
          return false;
        }
        // If Anthropic model was used
        else if (filters.generationMode === 'anthropic' && !row.anthropicResponse) {
          return false;
        }
        // If Deepseek model was used
        else if (filters.generationMode === 'deepseek' && !row.deepseekResponse) {
          return false;
        }
        // If MOA (Mixture of Agents) was used
        else if (filters.generationMode === 'moa' && !row.moaResponse) {
          return false;
        }
      }
      
      return true;
    });
    
    // Sort the filtered data
    return [...filtered].sort((a, b) => {
      // Default to comparing by ID if key doesn't exist
      if (!a[sortConfig.key as keyof ExcelRequirementResponse] || !b[sortConfig.key as keyof ExcelRequirementResponse]) {
        return sortConfig.direction === 'asc' ? 
          (a.id || 0) - (b.id || 0) : 
          (b.id || 0) - (a.id || 0);
      }
      
      // Handle timestamp specially since it needs date comparison
      if (sortConfig.key === 'timestamp') {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      // Handle string comparisons
      if (typeof a[sortConfig.key as keyof ExcelRequirementResponse] === 'string') {
        const valueA = String(a[sortConfig.key as keyof ExcelRequirementResponse] || '').toLowerCase();
        const valueB = String(b[sortConfig.key as keyof ExcelRequirementResponse] || '').toLowerCase();
        
        return sortConfig.direction === 'asc' ?
          valueA.localeCompare(valueB) :
          valueB.localeCompare(valueA);
      }
      
      // Handle numeric values
      const valA = a[sortConfig.key as keyof ExcelRequirementResponse] || 0;
      const valB = b[sortConfig.key as keyof ExcelRequirementResponse] || 0;
      
      return sortConfig.direction === 'asc' ? 
        Number(valA) - Number(valB) : 
        Number(valB) - Number(valA);
    });
  }, [excelData, filters, sortConfig]);
  
  const handleViewResponse = (row: ExcelRequirementResponse) => {
    setSelectedResponse(row);
    setSelectedResponseId(row.id);
    setShowResponseDialog(true);
  };
  
  const handleRefresh = () => {
    refetch();
  };
  
  const toggleSelectItem = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };
  
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredData.map(item => item.id || 0).filter(id => id !== 0));
    }
    setSelectAll(!selectAll);
  };
  
  const [processingItems, setProcessingItems] = useState<number[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Function to generate response for a single requirement
  const generateResponseForRequirement = async (
    requirementId: number, 
    modelProvider: 'openai' | 'anthropic' | 'deepseek' | 'moa'
  ) => {
    try {
      // Find the requirement data
      const requirement = excelData.find(item => item.id === requirementId);
      
      if (!requirement) {
        console.error(`Requirement with ID ${requirementId} not found`);
        return false;
      }
      
      // Make API call to generate response
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirement: requirement.requirement,
          provider: modelProvider,
          requirementId: requirementId.toString(),
          rfpName: requirement.rfpName,
          uploadedBy: requirement.uploadedBy,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log(`Response generated for requirement ID ${requirementId} with ${modelProvider}`);
      return true;
    } catch (error) {
      console.error(`Error generating response for requirement ${requirementId}:`, error);
      setGenerationError(error instanceof Error ? error.message : String(error));
      return false;
    }
  };
  
  // Function to handle bulk generation of responses
  const handleGenerateResponses = async (modelProvider: 'openai' | 'anthropic' | 'deepseek' | 'moa') => {
    setProcessingItems(selectedItems);
    setProcessedCount(0);
    setIsGenerating(true);
    setGenerationError(null);
    
    const totalItems = selectedItems.length;
    let successCount = 0;
    
    try {
      // Process items sequentially to avoid overloading the API
      for (let i = 0; i < selectedItems.length; i++) {
        const requirementId = selectedItems[i];
        const success = await generateResponseForRequirement(requirementId, modelProvider);
        
        if (success) {
          successCount++;
        }
        
        setProcessedCount(i + 1);
      }
      
      // Refresh data after all items are processed
      await refetch();
      
      toast({
        title: "Response Generation Complete",
        description: `Successfully generated responses for ${successCount} out of ${totalItems} requirements.`,
        variant: successCount === totalItems ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error in bulk generation:', error);
      setGenerationError(error instanceof Error ? error.message : String(error));
      
      toast({
        title: "Generation Error",
        description: `Failed to complete response generation: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProcessingItems([]);
    }
  };
  
  const handleBulkAction = (action: string) => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item first",
        variant: "destructive",
      });
      return;
    }
    
    switch (action) {
      case 'generate-openai':
        handleGenerateResponses('openai');
        break;
      case 'generate-anthropic':
        handleGenerateResponses('anthropic');
        break;
      case 'generate-deepseek':
        handleGenerateResponses('deepseek');
        break;
      case 'generate-moa':
        handleGenerateResponses('moa');
        break;
      case 'print':
        console.log('Print items:', selectedItems);
        alert(`Print ${selectedItems.length} selected items`);
        break;
      case 'mail':
        console.log('Mail items:', selectedItems);
        alert(`Email ${selectedItems.length} selected items`);
        break;
      case 'delete':
        console.log('Delete items:', selectedItems);
        alert(`Delete answers for ${selectedItems.length} selected items`);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">View Uploaded Requirements</h1>
      </div>
      
      <div className="pt-2">
        <Card>
          <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center space-x-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Requirements Data</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {filteredData.length} {filteredData.length === 1 ? 'item' : 'items'} {filteredData.length !== excelData.length ? `(filtered from ${excelData.length})` : ''}
                </p>
              </div>
              <div className="flex items-center">
                <Checkbox 
                  id="select-all" 
                  checked={selectAll}
                  onCheckedChange={toggleSelectAll}
                />
                <label htmlFor="select-all" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Select All
                </label>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1" disabled={selectedItems.length === 0}>
                    <span>Actions</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <DropdownMenuItem className="gap-2" onSelect={(e) => e.preventDefault()}>
                        <Sparkles className="h-4 w-4" />
                        <span>Generate Answers</span>
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </DropdownMenuItem>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="ml-1">
                      <DropdownMenuLabel>Select LLM Model</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleBulkAction('generate-openai')} className="gap-2">
                        <Atom className="h-4 w-4 text-blue-500" />
                        <span>OpenAI</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction('generate-anthropic')} className="gap-2">
                        <Bot className="h-4 w-4 text-purple-500" />
                        <span>Anthropic</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction('generate-deepseek')} className="gap-2">
                        <Brain className="h-4 w-4 text-amber-500" />
                        <span>DeepSeek</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleBulkAction('generate-moa')} className="gap-2">
                        <Network className="h-4 w-4 text-green-500" />
                        <span>MOA (Mixture of Agents)</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenuItem onClick={() => handleBulkAction('print')} className="gap-2">
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('mail')} className="gap-2">
                    <Mail className="h-4 w-4" />
                    <span>Send Email</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleBulkAction('delete')} className="text-red-600 gap-2">
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Answers</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                size="sm" 
                onClick={handleRefresh}
                className="gap-1"
                variant="outline"
              >
                <RefreshCcw className="h-4 w-4" />
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>
          
          {/* Filter Section */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="space-y-1 flex-1">
                <Label htmlFor="filter-rfp">RFP Name</Label>
                <Select
                  value={filters.rfpName}
                  onValueChange={(value) => setFilters({...filters, rfpName: value})}
                >
                  <SelectTrigger id="filter-rfp" className="max-w-xs">
                    <SelectValue placeholder="Select RFP name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {uniqueRfpNames.filter(name => name).map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1 flex-1">
                <Label htmlFor="filter-category">Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters({...filters, category: value})}
                >
                  <SelectTrigger id="filter-category" className="max-w-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {uniqueCategories.filter(category => category).map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1 flex-1">
                <Label htmlFor="filter-response">Response Status</Label>
                <Select
                  value={filters.hasResponse}
                  onValueChange={(value) => setFilters({...filters, hasResponse: value})}
                >
                  <SelectTrigger id="filter-response" className="max-w-xs">
                    <SelectValue placeholder="Filter by response status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Has Response</SelectItem>
                    <SelectItem value="no">No Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1 flex-1">
                <Label htmlFor="filter-model">Generation Mode</Label>
                <Select
                  value={filters.generationMode}
                  onValueChange={(value) => setFilters({...filters, generationMode: value})}
                >
                  <SelectTrigger id="filter-model" className="max-w-xs">
                    <SelectValue placeholder="Filter by model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="deepseek">Deepseek</SelectItem>
                    <SelectItem value="moa">MOA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFilters({
                  rfpName: 'all',
                  category: 'all',
                  hasResponse: 'all',
                  generationMode: 'all',
                })}
                className="mb-0.5"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Progress indicator for generation */}
          {isGenerating && (
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="font-medium text-sm">
                      Generating responses ({processedCount}/{processingItems.length})
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {Math.round((processedCount / processingItems.length) * 100)}%
                  </span>
                </div>
                <Progress value={(processedCount / processingItems.length) * 100} className="h-2" />
                {generationError && (
                  <div className="text-xs text-red-500 mt-1">
                    Error: {generationError}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : filteredData.length > 0 ? (
              <div className="space-y-4">
                {filteredData.map((row: ExcelRequirementResponse, index: number) => {
                  const isSelected = row.id ? selectedItems.includes(row.id) : false;
                  return (
                    <Card key={row.id || index} className={`overflow-hidden border ${isSelected ? 'border-blue-400 dark:border-blue-600' : 'border-slate-200 dark:border-slate-700'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start">
                          <div className="mr-3 pt-1">
                            {row.id && (
                              <Checkbox 
                                id={`select-${row.id}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectItem(row.id || 0)}
                              />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-medium text-slate-800 dark:text-slate-100">{row.category}</div>
                                  {row.finalResponse && (
                                    <span className="inline-flex text-green-600 dark:text-green-400">
                                      <Check className="h-4 w-4" />
                                    </span>
                                  )}
                                  {row.rfpName && (
                                    <span className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-full ml-auto">
                                      RFP: {row.rfpName}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">{row.requirement}</div>
                                
                                {/* New columns for generation mode and processing status */}
                                <div className="flex gap-3 mt-2 mb-1">
                                  {/* Generation Mode */}
                                  <div className="flex items-center">
                                    <Zap className="h-3.5 w-3.5 text-amber-500 mr-1" />
                                    <span className="text-xs text-slate-500 font-medium">Mode:</span>
                                    <span className="text-xs ml-1">
                                      {row.openaiResponse && !row.anthropicResponse && !row.deepseekResponse ? 'OpenAI' : 
                                       row.anthropicResponse && !row.openaiResponse && !row.deepseekResponse ? 'Anthropic' :
                                       row.deepseekResponse && !row.openaiResponse && !row.anthropicResponse ? 'Deepseek' :
                                       row.moaResponse ? 'MOA' : 'Not Processed'}
                                    </span>
                                  </div>
                                  
                                  {/* Processing Status */}
                                  <div className="flex items-center">
                                    <Activity className="h-3.5 w-3.5 text-blue-500 mr-1" />
                                    <span className="text-xs text-slate-500 font-medium">Status:</span>
                                    <span className={`text-xs ml-1 ${row.finalResponse ? 'text-green-600' : 'text-amber-500'}`}>
                                      {row.finalResponse ? 'Response Generated' : 'Not Generated'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex sm:flex-col items-center sm:items-end mt-3 sm:mt-0">
                                {row.timestamp && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                    Generated: {(() => {
                                      try {
                                        return format(new Date(row.timestamp), 'MMM d, yyyy');
                                      } catch (e) {
                                        return String(row.timestamp);
                                      }
                                    })()}
                                  </div>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewResponse(row)}
                                  className="h-8"
                                  disabled={!row.finalResponse}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Details
                                </Button>
                              </div>
                            </div>
                            
                            {row.finalResponse && (
                              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Response:</h4>
                                <div className="text-sm text-slate-700 dark:text-slate-200 line-clamp-3 prose prose-sm max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {row.finalResponse
                                      .replace(/\\n/g, '\n')
                                      .replace(/\\"/g, '"')
                                      .replace(/\\\\/g, '\\')}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-slate-500 dark:text-slate-400">No data available. Please upload Excel files first.</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                  Go to the Upload Requirements page to add data.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    
      {/* Detail Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Response Details</DialogTitle>
            <DialogDescription>
              View complete response and reference information
            </DialogDescription>
          </DialogHeader>
          
          {selectedResponse && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-md mb-4">
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Category:</h4>
                <p className="text-slate-800 dark:text-slate-200">{selectedResponse.category}</p>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-md mb-4">
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Requirement:</h4>
                <p className="text-slate-800 dark:text-slate-200">{selectedResponse.requirement}</p>
              </div>
              
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
                
                <TabsContent value="response">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-md mb-4">
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Response:</h4>
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      {selectedResponse.finalResponse && (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {selectedResponse.finalResponse
                            .replace(/\\n/g, '\n')
                            .replace(/\\"/g, '"')
                            .replace(/\\\\/g, '\\')}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="references">
                  <ReferencePanel responseId={selectedResponseId || undefined} showTitle={false} />
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}