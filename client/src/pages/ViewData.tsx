import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateMarkdownContent, downloadMarkdownFile, sendEmailWithContent, downloadExcelFile } from '@/lib/exportUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
  Network,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Hash,
  Tag,
  Hand,
  FileText
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
  const [showFilters, setShowFilters] = useState(false);
  
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
  
  // Function to handle exporting selected items as markdown
  const handleExportToMarkdown = () => {
    // Get selected items data
    const selectedData = excelData.filter(item => selectedItems.includes(item.id || 0));
    
    if (selectedData.length === 0) {
      toast({
        title: "No Data Found",
        description: "Could not find data for the selected items",
        variant: "destructive"
      });
      return;
    }
    
    // Generate markdown content
    const markdownContent = generateMarkdownContent(selectedData);
    
    // Create filename based on RFP name if all items are from the same RFP
    const rfpNames = new Set(selectedData.map(item => item.rfpName || 'unnamed'));
    const filename = rfpNames.size === 1 
      ? `${Array.from(rfpNames)[0]}-responses.md` 
      : `rfp-responses-${new Date().toISOString().split('T')[0]}.md`;
    
    // Download the file
    downloadMarkdownFile(markdownContent, filename);
    
    toast({
      title: "Export Successful",
      description: `${selectedData.length} items exported to ${filename}`,
    });
  };
  
  // Function to email the selected responses directly with HTML formatting
  // and simultaneously generate a markdown file for download
  const handleEmailMarkdown = () => {
    // Get selected items data
    const selectedData = excelData.filter(item => selectedItems.includes(item.id || 0));
    
    if (selectedData.length === 0) {
      toast({
        title: "No Data Found",
        description: "Could not find data for the selected items",
        variant: "destructive"
      });
      return;
    }
    
    // Create a subject line based on RFP name if all items are from the same RFP
    const rfpNames = new Set(selectedData.map(item => item.rfpName || 'unnamed'));
    const rfpNameForFile = rfpNames.size === 1 
      ? Array.from(rfpNames)[0] 
      : `multiple-rfps-${new Date().toISOString().split('T')[0]}`;
    
    const subject = rfpNames.size === 1 
      ? `RFP Responses for ${Array.from(rfpNames)[0]}` 
      : `RFP Responses Export (${selectedData.length} items)`;
    
    try {
      // Generate markdown content
      const markdownContent = generateMarkdownContent(selectedData);
      
      // 1. Generate and download the markdown file
      const filename = `${rfpNameForFile}-responses.md`;
      downloadMarkdownFile(markdownContent, filename);
      
      // 2. Send email
      sendEmailWithContent(markdownContent, subject);
      
      toast({
        title: "Email and Markdown Export",
        description: "Email opened and markdown file downloaded. Please attach the markdown file to your email manually.",
      });
    } catch (error) {
      console.error('Error preparing email:', error);
      toast({
        title: "Email Preparation Failed",
        description: "Failed to prepare email content: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive"
      });
    }
  };
  
  // Function to export selected items as Excel file
  const handleExportToExcel = () => {
    // Get selected items data
    const selectedData = excelData.filter(item => selectedItems.includes(item.id || 0));
    
    if (selectedData.length === 0) {
      toast({
        title: "No Data Found",
        description: "Could not find data for the selected items",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Create filename based on RFP name if all items are from the same RFP
      const rfpNames = new Set(selectedData.map(item => item.rfpName || 'unnamed'));
      const filename = rfpNames.size === 1 
        ? `${Array.from(rfpNames)[0]}-responses.xlsx` 
        : `rfp-responses-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Download the Excel file
      downloadExcelFile(selectedData, filename);
      
      toast({
        title: "Excel Export Successful",
        description: `${selectedData.length} items exported to ${filename}`,
      });
    } catch (error) {
      console.error('Error generating Excel file:', error);
      toast({
        title: "Excel Export Failed",
        description: "Failed to generate Excel file: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive"
      });
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
        handleExportToMarkdown();
        break;
      case 'excel':
        handleExportToExcel();
        break;
      case 'mail':
        handleEmailMarkdown();
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">View Requirements</h1>
        
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            onClick={handleRefresh}
            className="h-8 px-3"
            variant="outline"
            title="Refresh all data from database"
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCcw className="h-4 w-4 mr-1.5 animate-spin" />
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4 mr-1.5" />
                <span>Refresh Data</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div>
        <Card className="shadow-sm">
          {/* Unified Action Bar - Modern UI pattern with responsive design */}
          <div className="border-b border-slate-200 dark:border-slate-700">
            {/* Data summary section with meta information */}
            <div className="p-4 bg-white dark:bg-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {filteredData.length} {filteredData.length === 1 ? 'item' : 'items'} 
                    {filteredData.length !== excelData.length ? 
                      <span className="ml-1">
                        <Badge variant="outline" className="font-normal ml-1">
                          Filtered from {excelData.length}
                        </Badge>
                      </span> : ''
                    }
                  </p>
                </div>

                {/* Primary Action Row - Always visible on all screen sizes */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center mr-2 border-r border-slate-200 dark:border-slate-700 pr-3">
                    <Checkbox 
                      id="select-all-universal" 
                      checked={selectAll}
                      onCheckedChange={toggleSelectAll}
                    />
                    <label htmlFor="select-all-universal" className="ml-2 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300">
                      Select All
                    </label>
                  </div>
                  


                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-2 sm:px-3 flex gap-1.5 items-center" 
                        disabled={selectedItems.length === 0}
                      >
                        <Sparkles className="h-4 w-4" />
                        <span className="hidden sm:inline">Generate</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Generate with LLM</DropdownMenuLabel>
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

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-2 sm:px-3 flex gap-1.5 items-center"
                    title="Toggle filters"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filter</span>
                    {Object.values(filters).some(val => val !== 'all') && (
                      <Badge className="ml-1 h-5 bg-primary text-white">{
                        Object.values(filters).filter(val => val !== 'all').length
                      }</Badge>
                    )}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-2 sm:px-3 flex gap-1.5 items-center"
                      >
                        <ArrowUpDown className="h-4 w-4" />
                        <span className="hidden sm:inline">Sort</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => requestSort('id')} className="gap-2">
                        <Hash className="h-4 w-4" />
                        <span>ID</span>
                        {sortConfig.key === 'id' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 ml-auto" /> : <ArrowDown className="h-4 w-4 ml-auto" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => requestSort('timestamp')} className="gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Date</span>
                        {sortConfig.key === 'timestamp' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 ml-auto" /> : <ArrowDown className="h-4 w-4 ml-auto" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => requestSort('rfpName')} className="gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>RFP Name</span>
                        {sortConfig.key === 'rfpName' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 ml-auto" /> : <ArrowDown className="h-4 w-4 ml-auto" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => requestSort('category')} className="gap-2">
                        <Tag className="h-4 w-4" />
                        <span>Category</span>
                        {sortConfig.key === 'category' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 ml-auto" /> : <ArrowDown className="h-4 w-4 ml-auto" />
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-2 sm:px-3 flex gap-1.5 items-center ml-auto"
                        disabled={selectedItems.length === 0}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="hidden sm:inline">More</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleBulkAction('print')} className="gap-2">
                        <Printer className="h-4 w-4" />
                        <span>Export as Markdown</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction('excel')} className="gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Export as Excel</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction('mail')} className="gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Email Responses</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleBulkAction('delete')} className="text-red-600 gap-2">
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Selected</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            
            {/* Expandable Filter Panel */}
            {showFilters && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 animate-in fade-in-50 duration-200">
                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="filter-rfp-unified">RFP Name</Label>
                    <Select
                      value={filters.rfpName}
                      onValueChange={(value) => setFilters({...filters, rfpName: value})}
                    >
                      <SelectTrigger id="filter-rfp-unified" className="max-w-xs h-9">
                        <SelectValue placeholder="Select RFP name" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All RFPs</SelectItem>
                        {uniqueRfpNames.filter(name => name).map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="filter-category-unified">Category</Label>
                    <Select
                      value={filters.category}
                      onValueChange={(value) => setFilters({...filters, category: value})}
                    >
                      <SelectTrigger id="filter-category-unified" className="max-w-xs h-9">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {uniqueCategories.filter(category => category).map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="filter-response-unified">Response Status</Label>
                    <Select
                      value={filters.hasResponse}
                      onValueChange={(value) => setFilters({...filters, hasResponse: value})}
                    >
                      <SelectTrigger id="filter-response-unified" className="max-w-xs h-9">
                        <SelectValue placeholder="Filter by response" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="yes">Has Response</SelectItem>
                        <SelectItem value="no">No Response</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="filter-model-unified">Generation Model</Label>
                    <Select
                      value={filters.generationMode}
                      onValueChange={(value) => setFilters({...filters, generationMode: value})}
                    >
                      <SelectTrigger id="filter-model-unified" className="max-w-xs h-9">
                        <SelectValue placeholder="Filter by model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Models</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="deepseek">Deepseek</SelectItem>
                        <SelectItem value="moa">MOA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setFilters({
                      rfpName: 'all',
                      category: 'all',
                      hasResponse: 'all',
                      generationMode: 'all',
                    })}
                    className="h-9 whitespace-nowrap"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reset Filters
                  </Button>
                </div>
              </div>
            )}
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
            
            {/* Content display */}
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
                    <Card 
                      key={row.id || index} 
                      className={`overflow-hidden border relative transition-all duration-200 ${isSelected ? 'border-blue-400 dark:border-blue-600 shadow-md' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start">
                          <div className="mr-2 sm:mr-3 pt-1">
                            {row.id && (
                              <Checkbox 
                                id={`select-${row.id}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectItem(row.id || 0)}
                              />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Mobile view categories and badges */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              {/* Status tag */}
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] sm:text-xs px-1.5 py-0 ${row.finalResponse 
                                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200 border-green-200 dark:border-green-800" 
                                  : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"}`}
                              >
                                {row.finalResponse ? 
                                  <><Check className="h-3 w-3 mr-0.5" /> Generated</> : 
                                  'Not Generated'}
                              </Badge>
                              
                              {/* RFP Badge */}
                              {row.rfpName && (
                                <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200 border-blue-200 dark:border-blue-800">
                                  {row.rfpName}
                                </Badge>
                              )}
                              
                              {/* Generation mode badge */}
                              {(row.openaiResponse || row.anthropicResponse || row.deepseekResponse || row.moaResponse) && (
                                <Badge variant="outline" className="text-[10px] sm:text-xs bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200 border-amber-200 dark:border-amber-800">
                                  {row.moaResponse ? 
                                    <><Network className="h-3 w-3 mr-0.5" /> MOA</> : 
                                    row.openaiResponse ? 'OpenAI' : 
                                    row.anthropicResponse ? 'Anthropic' : 'Deepseek'
                                  }
                                </Badge>
                              )}
                              
                              {/* Category display and timestamp */}
                              <div className="flex items-center justify-between w-full">
                                <Badge variant="outline" className="text-[10px] sm:text-xs bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                                  {row.category}
                                </Badge>
                                
                                {row.timestamp && (
                                  <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400">
                                    {(() => {
                                      try {
                                        return formatDistanceToNow(new Date(row.timestamp), { addSuffix: true });
                                      } catch (e) {
                                        return String(row.timestamp);
                                      }
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Requirement text with hover interaction */}
                            <div 
                              className={`group relative text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 line-clamp-3 cursor-pointer transition-all duration-200 ${!row.finalResponse ? 'opacity-70' : ''}`}
                              onClick={() => row.finalResponse && handleViewResponse(row)}
                              title={row.finalResponse ? "Click to view full response" : "No response generated yet"}
                              aria-label={row.finalResponse ? "Click to view full response" : "No response generated yet"}
                            >
                              {row.requirement}
                              
                              {row.finalResponse && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/80 dark:to-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-end pr-4">
                                  <span className="absolute right-10 top-1/2 transform -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    Click to view
                                  </span>
                                  <Hand className="h-5 w-5 text-primary" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-slate-700 dark:text-slate-300 font-medium">No data available. Please upload Excel files first.</p>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
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
            <DialogTitle className="text-slate-900 dark:text-white">Response Details</DialogTitle>
            <DialogDescription className="text-slate-700 dark:text-slate-300">
              View complete response and reference information
            </DialogDescription>
          </DialogHeader>
          
          {selectedResponse && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-md mb-4">
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Category:</h4>
                <p className="text-slate-900 dark:text-slate-100 font-medium">{selectedResponse.category}</p>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-md mb-4">
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Requirement:</h4>
                <p className="text-slate-900 dark:text-slate-100">{selectedResponse.requirement}</p>
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
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-md mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Response:</h4>
                    <div className="prose prose-slate dark:prose-invert max-w-none text-slate-900 dark:text-slate-50 font-medium">
                      {selectedResponse.finalResponse && (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedResponse.finalResponse
                              .replace(/\\n/g, '\n')
                              .replace(/\\"/g, '"')
                              .replace(/\\\\/g, '\\')}
                          </ReactMarkdown>
                        </div>
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