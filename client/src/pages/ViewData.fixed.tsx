import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateMarkdownContent, downloadMarkdownFile, sendEmailWithContent, downloadExcelFile } from '@/lib/exportUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import CategoryGroup from '@/components/CategoryGroup';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpTooltip } from '@/components/HelpTooltip';
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
  ChevronDown,
  Loader2,
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
  FileText,
  ThumbsUp,
  ThumbsDown,
  Search
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

import ReferencePanel from '@/components/ReferencePanel';
import { ExcelRequirementResponse } from '@shared/schema';
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
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  
  // Progress tracking
  const [bulkFindingProgress, setBulkFindingProgress] = useState({
    total: 0,
    completed: 0,
    isProcessing: false
  });
  
  // Progress tracking for generation responses
  const [bulkGenerationProgress, setBulkGenerationProgress] = useState({
    total: 0,
    completed: 0,
    isProcessing: false,
    model: ''
  });
  
  const [requirementsLoadingProgress, setRequirementsLoadingProgress] = useState({
    total: 0,
    loaded: 0,
    isLoading: false
  });
  
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
  
  // Set initial loading state
  React.useEffect(() => {
    // Initially set loading state to true when component mounts
    setRequirementsLoadingProgress({
      total: 0,
      loaded: 0,
      isLoading: true
    });
  }, []);
  
  // Update loading indicator for requirements when loading state changes
  React.useEffect(() => {
    if (loading) {
      // Set loading state when starting to load
      setRequirementsLoadingProgress(prev => ({
        ...prev,
        isLoading: true
      }));
    } else if (excelData.length > 0) {
      // Update requirements loading progress when data arrives
      setRequirementsLoadingProgress({
        total: excelData.length,
        loaded: excelData.length,
        isLoading: false
      });
    }
  }, [loading, excelData.length]);
  
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
  
  // Check if any filters are active
  const areFiltersActive = useMemo(() => {
    return filters.rfpName !== 'all' || 
           filters.category !== 'all' || 
           filters.hasResponse !== 'all' ||
           filters.generationMode !== 'all';
  }, [filters]);

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
      
      // Filter by generation mode/model provider
      if (filters.generationMode !== 'all' && filters.generationMode) {
        // First try using the modelProvider field (preferred approach)
        if (row.modelProvider) {
          if (row.modelProvider !== filters.generationMode) {
            return false;
          }
        } 
        // Fallback to the legacy approach for backward compatibility
        else {
          if (filters.generationMode === 'openai' && !row.openaiResponse) {
            return false;
          }
          else if (filters.generationMode === 'anthropic' && !row.anthropicResponse) {
            return false;
          }
          else if (filters.generationMode === 'deepseek' && !row.deepseekResponse) {
            return false;
          }
          else if (filters.generationMode === 'moa' && !row.moaResponse) {
            return false;
          }
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
    
    // Set the appropriate tab based on what's available
    if (row.finalResponse) {
      setActiveTab('response');
    } else if (row.similarQuestions) {
      setActiveTab('references');
    }
    
    setShowResponseDialog(true);
  };
  
  // Function to find similar matches for a single requirement
  const [isFindingSimilar, setIsFindingSimilar] = useState(false);
  const [similarMatches, setSimilarMatches] = useState<any[]>([]);
  
  const handleFindSimilarMatches = async (requirementId: number) => {
    if (!requirementId) return;
    
    try {
      setIsFindingSimilar(true);
      setSimilarMatches([]);
      
      // Call the API to find similar matches
      const response = await fetch(`/api/find-similar-matches/${requirementId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to find similar matches: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Set the similar matches
      if (data.similar_matches) {
        setSimilarMatches(data.similar_matches);
      } else if (data.rawOutput) {
        // Handle raw output case
        toast({
          title: "Raw Output Returned",
          description: "The similarity search returned raw output instead of structured data.",
          variant: "destructive"
        });
        console.log("Raw similarity search output:", data.rawOutput);
      }
      
      // Show a success message
      toast({
        title: "Similar Matches Found",
        description: `Found ${data.similar_matches?.length || 0} similar requirements.`,
      });
      
      // If viewing a specific response, switch to the references tab
      if (selectedResponseId === requirementId && selectedResponse) {
        setActiveTab('references');
      }
      
      // Refresh the data to reflect the updated similar questions
      await refetch();
      
      return true;
    } catch (error) {
      console.error('Error finding similar matches:', error);
      toast({
        title: "Similarity Search Error",
        description: `Failed to find similar matches: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsFindingSimilar(false);
    }
  };
  
  // Function to find similar matches for multiple requirements in bulk
  const handleFindSimilarForBulk = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one requirement to find similar matches",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Setup progress tracking
      setBulkFindingProgress({
        total: selectedItems.length,
        completed: 0,
        isProcessing: true
      });
      
      // Show notification to user
      toast({
        title: "Finding Similar Requirements",
        description: `Processing ${selectedItems.length} requirements...`,
      });
      
      // Process each requirement sequentially
      const results = [];
      for (const requirementId of selectedItems) {
        try {
          // Call the API for this requirement
          const response = await fetch(`/api/find-similar-matches/${requirementId}`);
          
          if (!response.ok) {
            console.error(`Error finding similar matches for requirement ${requirementId}: ${response.status} ${response.statusText}`);
            results.push({ id: requirementId, success: false });
          } else {
            const data = await response.json();
            results.push({ 
              id: requirementId, 
              success: !data.error, 
              matchCount: data.similar_matches?.length || 0 
            });
          }
        } catch (error) {
          console.error(`Error processing requirement ${requirementId}:`, error);
          results.push({ id: requirementId, success: false });
        }
        
        // Update progress
        setBulkFindingProgress(prev => ({
          ...prev,
          completed: prev.completed + 1
        }));
        
        // Short delay to avoid overloading the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Refresh the data to reflect all updates
      await refetch();
      
      // Count successes and failures
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      // Show final notification
      toast({
        title: "Similarity Search Complete",
        description: `Successfully processed ${successful} requirements${failed > 0 ? `, failed: ${failed}` : ''}.`,
        variant: successful > 0 ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error('Error in bulk finding similar matches:', error);
      toast({
        title: "Bulk Process Error",
        description: `An error occurred during bulk processing: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setBulkFindingProgress({
        total: 0,
        completed: 0,
        isProcessing: false
      });
    }
  };
  
  const handleRefresh = async () => {
    try {
      // Force a fresh fetch from the server with cache bypass
      await refetch();
      toast({
        title: "Data Refreshed",
        description: "All requirements have been refreshed from the database.",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh Error",
        description: `Failed to refresh data: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  };
  
  const handleFeedbackSubmit = async (responseId: number, feedback: 'positive' | 'negative') => {
    if (!responseId) return;
    
    try {
      setIsFeedbackSubmitting(true);
      
      const response = await fetch(`/api/excel-requirements/${responseId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedback }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Update the selected response with new feedback
      if (selectedResponse && selectedResponse.id === responseId) {
        setSelectedResponse({
          ...selectedResponse,
          feedback: feedback
        });
      }
      
      // Refresh the data to reflect the updated feedback
      await refetch();
      
      toast({
        title: "Feedback Submitted",
        description: feedback === 'positive' ? 
          "Thank you for your positive feedback!" : 
          "Thank you for your feedback. We'll work to improve the response quality.",
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Feedback Error",
        description: `Failed to submit feedback: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };
  
  // Toggle item selection
  const toggleSelectItem = (id: number) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  // Toggle select all
  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    if (newSelectAll) {
      // Select all visible items (post-filtering)
      setSelectedItems(filteredData.map(item => item.id));
    } else {
      // Deselect all
      setSelectedItems([]);
    }
  };
  
  // Create a list of ids that are currently being processed
  const [processingIndividualItems, setProcessingIndividualItems] = useState<number[]>([]);
  
  // Function to generate response for a single requirement
  const generateResponse = async (model: string, requirementIds?: number[]) => {
    const ids = requirementIds || selectedItems;
    
    if (ids.length === 0) {
      toast({
        title: "No Requirements Selected",
        description: "Please select at least one requirement to generate a response.",
        variant: "destructive",
      });
      return;
    }
    
    // Show confirmation if many items selected
    if (ids.length > 5 && !requirementIds) {
      const confirmed = confirm(`You are about to generate responses for ${ids.length} requirements using ${model.toUpperCase()} model. This may take some time. Do you want to continue?`);
      if (!confirmed) {
        return;
      }
    }
    
    try {
      // Set up progress tracking for bulk operations
      if (ids.length > 1) {
        setBulkGenerationProgress({
          total: ids.length,
          completed: 0,
          isProcessing: true,
          model
        });
      } else {
        // For single item operations
        setIsGeneratingResponse(true);
        // Track which item is being processed
        setProcessingIndividualItems(prev => [...prev, ...ids]);
      }
      
      // Show notification to user
      toast({
        title: `Generating ${model.toUpperCase()} Responses`,
        description: `Processing ${ids.length} requirement${ids.length > 1 ? 's' : ''}...`,
      });
      
      // Process each requirement sequentially
      const results = [];
      for (const requirementId of ids) {
        try {
          // Call the API for this requirement
          const response = await fetch('/api/generate-response', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              requirement_id: requirementId,
              model
            }),
          });
          
          if (!response.ok) {
            console.error(`Error generating response for requirement ${requirementId}: ${response.status} ${response.statusText}`);
            results.push({ id: requirementId, success: false });
          } else {
            const data = await response.json();
            
            // If we're viewing this requirement, update the selected response
            if (selectedResponseId === requirementId && selectedResponse) {
              // Refresh the selected response with the new data
              const resp = await fetch(`/api/excel-requirements/${requirementId}`);
              if (resp.ok) {
                const refreshedData = await resp.json();
                setSelectedResponse(refreshedData);
                // Switch to the response tab to show the newly generated response
                setActiveTab('response');
              }
            }
            
            console.log(`Generated response for requirement ${requirementId}:`, data);
            results.push({ id: requirementId, success: true });
          }
        } catch (error) {
          console.error(`Error processing requirement ${requirementId}:`, error);
          results.push({ id: requirementId, success: false });
        } finally {
          // Remove from processing list for individual items
          setProcessingIndividualItems(prev => prev.filter(id => id !== requirementId));
        }
        
        // Update progress for bulk operations
        if (ids.length > 1) {
          setBulkGenerationProgress(prev => ({
            ...prev,
            completed: prev.completed + 1
          }));
        }
        
        // Short delay to avoid overloading the server
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Refresh the data to reflect all updates
      await refetch();
      
      // Count successes and failures
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      // Show final notification
      toast({
        title: "Response Generation Complete",
        description: `Successfully generated ${successful} response${successful !== 1 ? 's' : ''}${failed > 0 ? `, failed: ${failed}` : ''}.`,
        variant: successful > 0 ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error('Error in bulk generating responses:', error);
      toast({
        title: "Generation Error",
        description: `An error occurred during response generation: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      // Clear all processing states
      if (ids.length > 1) {
        setBulkGenerationProgress({
          total: 0,
          completed: 0,
          isProcessing: false,
          model: ''
        });
      } else {
        setIsGeneratingResponse(false);
      }
    }
  };
  
  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to perform this action.",
        variant: "destructive",
      });
      return;
    }
    
    switch (action) {
      case 'find-similar':
        await handleFindSimilarForBulk();
        break;
      case 'generate-moa':
        await generateResponse('moa');
        break;
      case 'delete':
        // Confirm deletion
        if (confirm(`Are you sure you want to delete ${selectedItems.length} selected requirements? This action cannot be undone.`)) {
          try {
            // Call API to delete the selected items
            const response = await fetch('/api/excel-requirements/bulk-delete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ids: selectedItems }),
            });
            
            if (!response.ok) {
              throw new Error(`Failed to delete requirements: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Clear the selected items
            setSelectedItems([]);
            setSelectAll(false);
            
            // Refresh the data
            await refetch();
            
            toast({
              title: "Deletion Complete",
              description: `Successfully deleted ${result.deleted || selectedItems.length} requirements.`,
            });
          } catch (error) {
            console.error('Error deleting requirements:', error);
            toast({
              title: "Deletion Error",
              description: `Failed to delete requirements: ${error instanceof Error ? error.message : String(error)}`,
              variant: "destructive",
            });
          }
        }
        break;
      case 'print':
        try {
          // Get the selected items
          const selectedData = excelData.filter(item => selectedItems.includes(item.id));
          
          // Generate the markdown content
          const markdownContent = generateMarkdownContent(selectedData);
          
          // Download as markdown file
          downloadMarkdownFile(markdownContent, 'selected_requirements.md');
          
          toast({
            title: "Export Complete",
            description: `Successfully exported ${selectedItems.length} requirements as Markdown.`,
          });
        } catch (error) {
          console.error('Error exporting to markdown:', error);
          toast({
            title: "Export Error",
            description: `Failed to export as Markdown: ${error instanceof Error ? error.message : String(error)}`,
            variant: "destructive",
          });
        }
        break;
      case 'excel':
        try {
          // Get the selected items
          const selectedData = excelData.filter(item => selectedItems.includes(item.id));
          
          // Download as Excel file
          await downloadExcelFile(selectedData, 'selected_requirements.xlsx');
          
          toast({
            title: "Export Complete",
            description: `Successfully exported ${selectedItems.length} requirements as Excel.`,
          });
        } catch (error) {
          console.error('Error exporting to Excel:', error);
          toast({
            title: "Export Error",
            description: `Failed to export as Excel: ${error instanceof Error ? error.message : String(error)}`,
            variant: "destructive",
          });
        }
        break;
      case 'mail':
        try {
          // Get the selected items
          const selectedData = excelData.filter(item => selectedItems.includes(item.id));
          
          // Generate the markdown content
          const markdownContent = generateMarkdownContent(selectedData);
          
          // Show email dialog
          const email = prompt("Enter the email address to send the requirements to:", "");
          if (email) {
            // Validate email
            if (!/\S+@\S+\.\S+/.test(email)) {
              throw new Error("Invalid email address");
            }
            
            // Send email
            await sendEmailWithContent(
              email, 
              `RFP Requirements Export (${selectedItems.length} items)`, 
              markdownContent
            );
            
            toast({
              title: "Email Sent",
              description: `Successfully sent ${selectedItems.length} requirements to ${email}.`,
            });
          }
        } catch (error) {
          console.error('Error sending email:', error);
          toast({
            title: "Email Error",
            description: `Failed to send email: ${error instanceof Error ? error.message : String(error)}`,
            variant: "destructive",
          });
        }
        break;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Progress bar for requirements loading */}
      {requirementsLoadingProgress.isLoading && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 p-3 shadow-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="animate-spin h-5 w-5 text-primary" />
              <p className="font-medium text-sm">
                Loading requirements data {requirementsLoadingProgress.loaded > 0 ? 
                  `(${requirementsLoadingProgress.loaded} items)` : '...'}
              </p>
            </div>
            <Progress value={loading ? 30 : 100} className="h-2" />
          </div>
        </div>
      )}
      
      {/* Progress bar for bulk find similar operations */}
      {bulkFindingProgress.isProcessing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 p-3 shadow-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Search className="animate-pulse h-5 w-5 text-primary" />
              <p className="font-medium text-sm">
                Finding similar requirements ({bulkFindingProgress.completed} of {bulkFindingProgress.total} processed)
              </p>
            </div>
            <Progress 
              value={(bulkFindingProgress.completed / bulkFindingProgress.total) * 100} 
              className="h-2" 
            />
          </div>
        </div>
      )}
      
      {/* Progress bar for bulk generation operations */}
      {bulkGenerationProgress.isProcessing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 p-3 shadow-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="animate-pulse h-5 w-5 text-primary" />
              <p className="font-medium text-sm">
                Generating {bulkGenerationProgress.model.toUpperCase()} responses 
                ({bulkGenerationProgress.completed} of {bulkGenerationProgress.total} processed)
              </p>
            </div>
            <Progress 
              value={(bulkGenerationProgress.completed / bulkGenerationProgress.total) * 100} 
              className="h-2" 
            />
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">View Requirements Data</h1>
          <p className="text-slate-700 dark:text-slate-300">
            View, filter, and generate responses for uploaded RFP requirements.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5"
          >
            {showFilters ? (
              <>
                <X className="h-4 w-4" />
                <span>Hide Filters</span>
              </>
            ) : (
              <>
                <Filter className="h-4 w-4" />
                <span>Show Filters</span>
                {areFiltersActive && (
                  <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                )}
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('find-similar')}
            className="flex items-center gap-1.5"
            disabled={selectedItems.length === 0 || bulkFindingProgress.isProcessing}
          >
            {bulkFindingProgress.isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Find Similar</span>
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-1.5"
          >
            <RefreshCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5"
          >
            {selectAll ? (
              <>
                <Square className="h-4 w-4" />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4" />
                <span>Select All</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="relative transition-all duration-300">
        {/* Selection summary bar - only shown when items are selected */}
        {selectedItems.length > 0 && (
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">
                {filteredData.length} {filteredData.length === 1 ? 'item' : 'items'}
                {filteredData.length !== excelData.length ? 
                  <span className="text-slate-500"> (filtered from {excelData.length})</span> : 
                  ''
                }
                <span className="mx-1 text-slate-400">\</span>
                <span className="text-primary font-semibold">{selectedItems.length} selected</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setSelectedItems([])}
                className="h-8 text-xs"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}
      
        <Card className="shadow-sm">
          {/* Filters panel - optimized for mobile with collapsible sections */}
          {showFilters && (
            <div className="sticky top-[60px] z-10 border-b border-slate-200 dark:border-slate-700">
              <div className="p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-base">Filter Requirements</h3>
                        <HelpTooltip text="Use these filters to narrow down the list of requirements based on different criteria. You can filter by RFP name, category, response status, and AI model type." />
                      </div>
                      
                      {/* Results count indicator */}
                      <div className="text-xs text-slate-500 transition-opacity duration-300">
                        Showing {filteredData.length} of {excelData.length} requirements
                        {areFiltersActive && (
                          <span className="ml-1 text-blue-600 font-medium">
                            (filtered)
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Sort Button with Indicator */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant={sortConfig.key !== 'timestamp' || sortConfig.direction !== 'desc' ? "secondary" : "outline"} 
                            size="sm" 
                            className="h-8 px-2 flex gap-1 items-center relative"
                          >
                            <ArrowUpDown className="h-3.5 w-3.5" />
                            <span className="text-xs hidden sm:inline">
                              {sortConfig.key === 'timestamp' && sortConfig.direction === 'desc' 
                                ? 'Default Sort' 
                                : `${sortConfig.key.charAt(0).toUpperCase() + sortConfig.key.slice(1)} ${sortConfig.direction === 'asc' ? '↑' : '↓'}`}
                            </span>
                            {sortConfig.key !== 'timestamp' || sortConfig.direction !== 'desc' ? (
                              <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
                            ) : null}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="text-xs">Sort Requirements</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => requestSort('id')}
                            className="text-xs flex items-center gap-2"
                          >
                            <Hash className="h-3 w-3" />
                            ID
                            {sortConfig.key === 'id' && (
                              sortConfig.direction === 'asc' ? 
                                <ArrowUp className="h-3 w-3 ml-auto" /> : 
                                <ArrowDown className="h-3 w-3 ml-auto" />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => requestSort('requirement')}
                            className="text-xs flex items-center gap-2"
                          >
                            <FileText className="h-3 w-3" />
                            Requirement Text
                            {sortConfig.key === 'requirement' && (
                              sortConfig.direction === 'asc' ? 
                                <ArrowUp className="h-3 w-3 ml-auto" /> : 
                                <ArrowDown className="h-3 w-3 ml-auto" />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => requestSort('category')}
                            className="text-xs flex items-center gap-2"
                          >
                            <Tag className="h-3 w-3" />
                            Category
                            {sortConfig.key === 'category' && (
                              sortConfig.direction === 'asc' ? 
                                <ArrowUp className="h-3 w-3 ml-auto" /> : 
                                <ArrowDown className="h-3 w-3 ml-auto" />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => requestSort('timestamp')}
                            className="text-xs flex items-center gap-2"
                          >
                            <Calendar className="h-3 w-3" />
                            Date Added
                            {sortConfig.key === 'timestamp' && (
                              sortConfig.direction === 'asc' ? 
                                <ArrowUp className="h-3 w-3 ml-auto" /> : 
                                <ArrowDown className="h-3 w-3 ml-auto" />
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {/* Generate Button */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-9 px-2 sm:px-3 flex gap-1.5 items-center" 
                            disabled={selectedItems.length === 0}
                          >
                            <Sparkles className="h-4 w-4" />
                            <span className="hidden sm:inline">Generate</span>
                            {selectedItems.length > 0 && (
                              <Badge className="ml-1 h-5 bg-white text-primary">{selectedItems.length}</Badge>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="flex items-center gap-2">
                            Generate with LLM
                            <HelpTooltip text="Generate responses for multiple selected requirements at once using your preferred AI model." />
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => generateResponse('openAI')} className="gap-2">
                            <Atom className="h-4 w-4 text-blue-500" />
                            <span>OpenAI</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateResponse('claude')} className="gap-2">
                            <Bot className="h-4 w-4 text-purple-500" />
                            <span>Anthropic</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateResponse('deepseek')} className="gap-2">
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
                    </div>
                  </div>
                  
                  {/* Mobile-friendly accordion for filters */}
                  {isMobile ? (
                    <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                      {/* RFP Name Accordion */}
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="rfp-name" className="border-0 border-b">
                          <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-500" />
                              <span className="text-sm font-medium">RFP Name</span>
                              {filters.rfpName !== 'all' && (
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  {filters.rfpName}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 py-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500 dark:text-slate-400">
                                Select RFP
                              </Label>
                              <Select
                                value={filters.rfpName}
                                onValueChange={(value) => setFilters({...filters, rfpName: value})}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select RFP" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All RFPs</SelectItem>
                                  {uniqueRfpNames.filter(name => name).map(name => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        {/* Category Accordion */}
                        <AccordionItem value="category" className="border-0 border-b">
                          <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-slate-500" />
                              <span className="text-sm font-medium">Category</span>
                              {filters.category !== 'all' && (
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  {filters.category}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 py-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500 dark:text-slate-400">
                                Select Category
                              </Label>
                              <Select
                                value={filters.category}
                                onValueChange={(value) => setFilters({...filters, category: value})}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Categories</SelectItem>
                                  {uniqueCategories.filter(category => category).map(category => (
                                    <SelectItem key={category} value={category}>{category}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        {/* Response Status Accordion */}
                        <AccordionItem value="response-status" className="border-0 border-b">
                          <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-slate-500" />
                              <span className="text-sm font-medium">Response Status</span>
                              {filters.hasResponse !== 'all' && (
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  {filters.hasResponse === 'yes' ? 'Has Response' : 'No Response'}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 py-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500 dark:text-slate-400">
                                Filter by Status
                              </Label>
                              <Select
                                value={filters.hasResponse}
                                onValueChange={(value) => setFilters({...filters, hasResponse: value})}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Filter by Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Requirements</SelectItem>
                                  <SelectItem value="yes">Has Response</SelectItem>
                                  <SelectItem value="no">No Response</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        {/* Model Provider Accordion */}
                        <AccordionItem value="model-provider" className="border-0">
                          <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-slate-500" />
                              <span className="text-sm font-medium">Model Provider</span>
                              {filters.generationMode !== 'all' && (
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  {filters.generationMode}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 py-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500 dark:text-slate-400">
                                Filter by Model
                              </Label>
                              <Select
                                value={filters.generationMode}
                                onValueChange={(value) => setFilters({...filters, generationMode: value})}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Filter by Model" />
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
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="filter-rfp" className="text-sm">RFP Name</Label>
                          <HelpTooltip text="Filter requirements by their source RFP document name. Choose 'All RFPs' to see requirements across all documents." />
                        </div>
                        <Select
                          value={filters.rfpName}
                          onValueChange={(value) => setFilters({...filters, rfpName: value})}
                        >
                          <SelectTrigger id="filter-rfp" className="w-full">
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
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="filter-category" className="text-sm">Category</Label>
                          <HelpTooltip text="Filter by functional category (e.g., Technical, Reporting, Security). Categories are taken directly from the uploaded Excel file." />
                        </div>
                        <Select
                          value={filters.category}
                          onValueChange={(value) => setFilters({...filters, category: value})}
                        >
                          <SelectTrigger id="filter-category" className="w-full">
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
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="filter-response" className="text-sm">Response Status</Label>
                          <HelpTooltip text="Filter to see only requirements that already have AI-generated responses or only those still needing responses." />
                        </div>
                        <Select
                          value={filters.hasResponse}
                          onValueChange={(value) => setFilters({...filters, hasResponse: value})}
                        >
                          <SelectTrigger id="filter-response" className="w-full">
                            <SelectValue placeholder="Response Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="yes">Has Response</SelectItem>
                            <SelectItem value="no">No Response</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="filter-model" className="text-sm">AI Model</Label>
                          <HelpTooltip text="Filter to see only responses generated by a specific AI model. MOA combines all three models for the most comprehensive answers." />
                        </div>
                        <Select
                          value={filters.generationMode}
                          onValueChange={(value) => setFilters({...filters, generationMode: value})}
                        >
                          <SelectTrigger id="filter-model" className="w-full">
                            <SelectValue placeholder="Generation Model" />
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
                    </div>
                  )}
                  
                  <div className="flex justify-between pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setFilters({
                        rfpName: 'all',
                        category: 'all',
                        hasResponse: 'all',
                        generationMode: 'all',
                      })}
                      className="flex items-center gap-1"
                    >
                      <X className="h-4 w-4" />
                      Reset Filters
                    </Button>
                    
                    <Button 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => setShowFilters(false)}
                    >
                      <Check className="h-4 w-4" />
                      Apply Filters
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 px-2 sm:px-3 flex gap-1.5 items-center"
                          disabled={selectedItems.length === 0}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="hidden sm:inline">More</span>
                          {selectedItems.length > 0 && (
                            <Badge className="ml-1 h-5">{selectedItems.length}</Badge>
                          )}
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
            </div>
          )}

          {/* Progress indicator now replaced by fixed-position bar at the top of the screen */}
          
          <CardContent className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Content display */}
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : filteredData.length > 0 ? (
              <div className="space-y-4">
                {/* Group requirements by category */}
                {uniqueCategories.map(category => {
                  // Only process categories with items
                  const categoryItems = filteredData.filter(item => 
                    (item.category || 'Uncategorized') === category
                  );
                  
                  if (categoryItems.length === 0) return null;
                  
                  // Create a component for each category
                  return (
                    <CategoryGroup 
                      key={category}
                      category={category}
                      items={categoryItems}
                      selectedItems={selectedItems}
                      setSelectedItems={setSelectedItems}
                      processingIndividualItems={processingIndividualItems}
                      handleViewResponse={handleViewResponse}
                      toggleSelectItem={toggleSelectItem}
                      setActiveTab={setActiveTab}
                    />
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
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-slate-900 dark:text-white">Response Details</DialogTitle>
                <DialogDescription className="text-slate-700 dark:text-slate-300">
                  View complete response and reference information
                </DialogDescription>
              </div>
              
              {/* Separate Past Responses and Generate Answer Buttons */}
              {selectedResponse && selectedResponseId && (
                <div className="flex items-center gap-2">
                  {/* Past Responses Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-3 flex gap-2 items-center" 
                    disabled={isFindingSimilar}
                    onClick={() => handleFindSimilarMatches(selectedResponseId)}
                  >
                    {isFindingSimilar ? (
                      <>
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                        <span>Finding...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 text-blue-500" />
                        <span>Past Responses</span>
                      </>
                    )}
                  </Button>
                  
                  {/* Generate Answer Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-3 flex gap-2 items-center" 
                        disabled={isGeneratingResponse}
                      >
                        {isGeneratingResponse ? (
                          <>
                            <Sparkles className="h-4 w-4 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 text-green-500" />
                            <span>Generate</span>
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Generate with AI Model</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => generateResponse('openAI', [selectedResponseId])} className="gap-2">
                        <Atom className="h-4 w-4 text-blue-500" />
                        <span>OpenAI</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => generateResponse('claude', [selectedResponseId])} className="gap-2">
                        <Bot className="h-4 w-4 text-purple-500" />
                        <span>Anthropic</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => generateResponse('deepseek', [selectedResponseId])} className="gap-2">
                        <Brain className="h-4 w-4 text-amber-500" />
                        <span>DeepSeek</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => generateResponse('moa', [selectedResponseId])} className="gap-2">
                        <Network className="h-4 w-4 text-green-500" />
                        <span>MOA (Mixture of Agents)</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </DialogHeader>
          
          {selectedResponse && (
            <div className="mt-2">
              <div className="mb-6">
                <div className="flex flex-col gap-3">
                  <div>
                    <h3 className="text-base font-medium">Requirement</h3>
                    <div className="mt-1 text-sm text-slate-900 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-3 rounded-md">
                      {selectedResponse.requirement || "No requirement text available"}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400">Category:</span>
                      <span className="font-medium">{selectedResponse.category || "Uncategorized"}</span>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400">RFP:</span>
                      <span className="font-medium">{selectedResponse.rfpName || "Unknown"}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList className="grid grid-cols-4 mb-4">
                  <TabsTrigger value="response" className="font-medium">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4" />
                      <span>Response</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="references" className="font-medium">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" />
                      <span>References</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="openai" className="font-medium">
                    <div className="flex items-center gap-1.5">
                      <Atom className="h-4 w-4 text-blue-500" />
                      <span>OpenAI</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="claude" className="font-medium">
                    <div className="flex items-center gap-1.5">
                      <Bot className="h-4 w-4 text-purple-500" />
                      <span>Claude</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="response" className="space-y-4">
                  {selectedResponse.finalResponse ? (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center mb-2">
                            <div className="p-1 px-2 text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                              <div className="flex items-center gap-1">
                                {selectedResponse.modelProvider === 'moa' ? (
                                  <Network className="h-3.5 w-3.5" />
                                ) : selectedResponse.modelProvider === 'openai' ? (
                                  <Atom className="h-3.5 w-3.5" />
                                ) : selectedResponse.modelProvider === 'anthropic' ? (
                                  <Bot className="h-3.5 w-3.5" />
                                ) : selectedResponse.modelProvider === 'deepseek' ? (
                                  <Brain className="h-3.5 w-3.5" />
                                ) : (
                                  <Sparkles className="h-3.5 w-3.5" />
                                )}
                                <span>Generated with {selectedResponse.modelProvider === 'moa' ? 'MOA' : 
                                  selectedResponse.modelProvider === 'openai' ? 'OpenAI' : 
                                  selectedResponse.modelProvider === 'anthropic' ? 'Claude' :
                                  selectedResponse.modelProvider === 'deepseek' ? 'DeepSeek' : 
                                  'AI Assistance'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="prose prose-slate dark:prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                            >
                              {selectedResponse.finalResponse || "No response generated yet."}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-4">
                        <span className="text-sm text-slate-500 mr-2">Was this response helpful?</span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleFeedbackSubmit(selectedResponse.id, 'positive')}
                          disabled={isFeedbackSubmitting || selectedResponse.feedback === 'positive'}
                          className={`h-8 ${selectedResponse.feedback === 'positive' ? 'bg-green-50 text-green-700 border-green-200' : ''}`}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleFeedbackSubmit(selectedResponse.id, 'negative')}
                          disabled={isFeedbackSubmitting || selectedResponse.feedback === 'negative'}
                          className={`h-8 ${selectedResponse.feedback === 'negative' ? 'bg-red-50 text-red-700 border-red-200' : ''}`}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center border border-dashed rounded-md border-slate-300 dark:border-slate-700">
                      <Sparkles className="h-8 w-8 mx-auto mb-4 text-slate-400" />
                      <h3 className="text-lg font-medium mb-2">No Response Generated Yet</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">Generate a response to see the final answer here.</p>
                      <Button onClick={() => generateResponse('moa', [selectedResponseId])}>
                        Generate with MOA
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="references" className="space-y-4">
                  <ReferencePanel 
                    requirementId={selectedResponseId} 
                    similarQuestions={selectedResponse?.similarQuestions || []}
                    isFindingSimilar={isFindingSimilar}
                    onFindSimilar={() => handleFindSimilarMatches(selectedResponseId)}
                  />
                </TabsContent>
                
                <TabsContent value="openai" className="space-y-4">
                  {selectedResponse.openaiResponse ? (
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                      >
                        {selectedResponse.openaiResponse}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed rounded-md border-slate-300 dark:border-slate-700">
                      <Atom className="h-8 w-8 mx-auto mb-4 text-blue-500" />
                      <h3 className="text-lg font-medium mb-2">No OpenAI Response</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">Generate a response with OpenAI to see results here.</p>
                      <Button onClick={() => generateResponse('openAI', [selectedResponseId])}>
                        Generate with OpenAI
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="claude" className="space-y-4">
                  {selectedResponse.anthropicResponse ? (
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                      >
                        {selectedResponse.anthropicResponse}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed rounded-md border-slate-300 dark:border-slate-700">
                      <Bot className="h-8 w-8 mx-auto mb-4 text-purple-500" />
                      <h3 className="text-lg font-medium mb-2">No Claude Response</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">Generate a response with Claude to see results here.</p>
                      <Button onClick={() => generateResponse('claude', [selectedResponseId])}>
                        Generate with Claude
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResponseDialog(false)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to List
            </Button>
            
            {/* Feedback buttons - shown only when there's a final response */}
            {selectedResponse && selectedResponse.finalResponse && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleFeedbackSubmit(selectedResponse.id, 'positive')}
                  disabled={isFeedbackSubmitting || selectedResponse.feedback === 'positive'}
                  className={`h-8 ${selectedResponse.feedback === 'positive' ? 'bg-green-50 text-green-700 border-green-200' : ''}`}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleFeedbackSubmit(selectedResponse.id, 'negative')}
                  disabled={isFeedbackSubmitting || selectedResponse.feedback === 'negative'}
                  className={`h-8 ${selectedResponse.feedback === 'negative' ? 'bg-red-50 text-red-700 border-red-200' : ''}`}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-2">
          {/* Refresh Button */}
          <Button 
            className="h-12 w-12 rounded-full shadow-lg flex items-center justify-center bg-primary hover:bg-primary/90"
            onClick={handleRefresh}
            title="Refresh Data"
          >
            <RefreshCcw className="h-5 w-5 text-white" />
          </Button>

          {/* Filter Toggle Button */}
          <Button 
            className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center ${
              showFilters || areFiltersActive
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-slate-700 hover:bg-slate-800'
            }`}
            onClick={() => setShowFilters(!showFilters)}
            title={showFilters ? "Hide Filters" : "Show Filters"}
          >
            <Filter className="h-5 w-5 text-white" />
            {areFiltersActive && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </Button>

          {/* Bulk Actions Button - Only show when items are selected */}
          {selectedItems.length > 0 && (
            <Button 
              className="h-12 w-12 rounded-full shadow-lg flex items-center justify-center bg-green-500 hover:bg-green-600"
              onClick={() => handleBulkAction('generate-moa')}
              title="Generate MOA for Selected"
            >
              <Sparkles className="h-5 w-5 text-white" />
              <Badge className="absolute -top-1 -right-1 h-5 bg-white text-green-600 rounded-full">
                {selectedItems.length}
              </Badge>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}