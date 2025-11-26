import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateMarkdownContent, downloadMarkdownFile, sendEmailWithContent, downloadExcelFile, shareViaWhatsApp } from '@/lib/exportUtils';
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
  Search,
  Edit,
  Save,
  X as CloseIcon
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
  const [referenceCount, setReferenceCount] = useState(0);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  
  // Helper function to check if any response exists
  const hasAnyResponse = (response: ExcelRequirementResponse | null) => {
    if (!response) return false;
    return !!(response.finalResponse || response.openaiResponse || response.anthropicResponse || response.deepseekResponse || response.moaResponse);
  };
  
  // Helper function to get the best available response text
  const getBestResponse = (response: ExcelRequirementResponse | null) => {
    if (!response) return null;
    return response.finalResponse || response.openaiResponse || response.anthropicResponse || response.deepseekResponse || response.moaResponse || null;
  };
  
  // Requirements cache for performance optimization
  const requirementsCache = React.useRef<Map<number, ExcelRequirementResponse>>(new Map());
  
  // Response editing state
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [editedResponseText, setEditedResponseText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [originalResponseText, setOriginalResponseText] = useState('');
  
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
  
  // USABILITY: Persistent status for completed bulk operations
  const [lastBulkOperation, setLastBulkOperation] = useState<{
    type: 'generate' | 'find';
    model?: string;
    completed: number;
    total: number;
    timestamp: Date;
  } | null>(null);
  
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
  const queryClient = useQueryClient();
  
  const { data: excelData = [], isLoading: loading, refetch } = useQuery<ExcelRequirementResponse[]>({
    queryKey: ['/api/excel-requirements'],
  });
  
  // Listen for requirements-replaced and requirements-updated events to refresh data
  React.useEffect(() => {
    const handleRequirementsReplaced = () => {
      console.log('Requirements replaced - refreshing data');
      queryClient.invalidateQueries({ queryKey: ['/api/excel-requirements'] });
      refetch();
    };
    
    const handleRequirementsUpdated = () => {
      console.log('Requirements updated - refreshing data and RFP names');
      queryClient.invalidateQueries({ queryKey: ['/api/excel-requirements'] });
      refetch();
    };
    
    window.addEventListener('requirements-replaced', handleRequirementsReplaced);
    window.addEventListener('requirements-updated', handleRequirementsUpdated);
    return () => {
      window.removeEventListener('requirements-replaced', handleRequirementsReplaced);
      window.removeEventListener('requirements-updated', handleRequirementsUpdated);
    };
  }, [refetch]);
  
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
      .map(item => (item.rfpName || '').trim()) // Trim whitespace from RFP names
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

  // Apply filters to the data - optimized for performance
  const filteredData = useMemo(() => {
    // Only run the filter if we have data and active filters
    if (excelData.length === 0) {
      return [];
    }
    
    // First check if any filters are active to avoid unnecessary processing
    const hasActiveFilters = 
      filters.rfpName !== 'all' || 
      filters.category !== 'all' || 
      filters.hasResponse !== 'all' ||
      filters.generationMode !== 'all';
    
    // Filter data - only process if we have active filters
    const filtered = hasActiveFilters ? excelData.filter(row => {
      // Early returns for each filter condition to avoid unnecessary checks
      
      // Filter by RFP name
      if (filters.rfpName !== 'all' && row.rfpName && row.rfpName !== filters.rfpName) {
        return false;
      }
      
      // Filter by category
      if (filters.category !== 'all' && row.category && row.category !== filters.category) {
        return false;
      }
      
      // Filter by response status
      if (filters.hasResponse !== 'all') {
        const hasResponse = !!row.finalResponse;
        if ((filters.hasResponse === 'yes' && !hasResponse) || (filters.hasResponse === 'no' && hasResponse)) {
          return false;
        }
      }
      
      // Filter by generation mode/model provider
      if (filters.generationMode !== 'all') {
        if (row.modelProvider) {
          // Direct comparison when modelProvider is available
          if (row.modelProvider !== filters.generationMode) {
            return false;
          }
        } else {
          // Fallback for legacy data
          const responseMap = {
            'openai': row.openaiResponse,
            'anthropic': row.anthropicResponse,
            'deepseek': row.deepseekResponse,
            'moa': row.moaResponse
          };
          
          if (!responseMap[filters.generationMode as keyof typeof responseMap]) {
            return false;
          }
        }
      }
      
      return true;
    }) : excelData;
    
    // Only sort if we have data to sort
    if (filtered.length === 0) {
      return [];
    }
    
    // Create a sorting function based on the current config
    const getSortFn = () => {
      // Handle timestamp specially 
      if (sortConfig.key === 'timestamp') {
        return (a: ExcelRequirementResponse, b: ExcelRequirementResponse) => {
          const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        };
      }
      
      // Handle string comparisons
      if (typeof filtered[0][sortConfig.key as keyof ExcelRequirementResponse] === 'string') {
        return (a: ExcelRequirementResponse, b: ExcelRequirementResponse) => {
          const valueA = String(a[sortConfig.key as keyof ExcelRequirementResponse] || '').toLowerCase();
          const valueB = String(b[sortConfig.key as keyof ExcelRequirementResponse] || '').toLowerCase();
          
          return sortConfig.direction === 'asc' ?
            valueA.localeCompare(valueB) :
            valueB.localeCompare(valueA);
        };
      }
      
      // Handle numeric values (default)
      return (a: ExcelRequirementResponse, b: ExcelRequirementResponse) => {
        // Fallback to ID if the sort key doesn't exist
        if (!a[sortConfig.key as keyof ExcelRequirementResponse] || !b[sortConfig.key as keyof ExcelRequirementResponse]) {
          return sortConfig.direction === 'asc' ? 
            (a.id || 0) - (b.id || 0) : 
            (b.id || 0) - (a.id || 0);
        }
        
        const valA = a[sortConfig.key as keyof ExcelRequirementResponse] || 0;
        const valB = b[sortConfig.key as keyof ExcelRequirementResponse] || 0;
        
        return sortConfig.direction === 'asc' ? 
          Number(valA) - Number(valB) : 
          Number(valB) - Number(valA);
      };
    };
    
    // Sort using the selected sort function
    return [...filtered].sort(getSortFn());
  }, [excelData, filters, sortConfig]);
  
  const handleViewResponse = (row: ExcelRequirementResponse) => {
    setSelectedResponse(row);
    setSelectedResponseId(row.id);
    setReferenceCount(0); // Reset reference count when opening a new response
    
    // Reset editing state
    setIsEditingResponse(false);
    
    // USABILITY: Default to "Response" tab when opening dialog if response exists
    // This ensures users see the generated content immediately
    if (hasAnyResponse(row)) {
      setActiveTab('response');
    } else if (row.similarQuestions) {
      // If no response but has references, show references tab
      setActiveTab('references');
    } else {
      // Otherwise default to response tab
      setActiveTab('response');
    }
    
    setShowResponseDialog(true);
  };
  
  // Function to start editing response
  const handleStartEditing = () => {
    if (selectedResponse?.finalResponse) {
      // Store original text for undo functionality
      setOriginalResponseText(selectedResponse.finalResponse
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\'));
      
      // Initialize editable text
      setEditedResponseText(selectedResponse.finalResponse
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\'));
      
      setIsEditingResponse(true);
    }
  };
  
  // Function to cancel editing
  const handleCancelEdit = () => {
    setIsEditingResponse(false);
    setEditedResponseText('');
  };
  
  // Function to save edited response
  const handleSaveEdit = async () => {
    if (!selectedResponseId || !editedResponseText.trim()) {
      toast({
        title: "Cannot Save Edit",
        description: "No response ID or edited content is empty",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSavingEdit(true);
      
      // Update the response in the database
      const response = await fetch(`/api/excel-requirements/${selectedResponseId}/update-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          finalResponse: editedResponseText,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update response: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update response');
      }
      
      // Update the selected response in the UI
      if (selectedResponse) {
        setSelectedResponse({
          ...selectedResponse,
          finalResponse: editedResponseText
        });
      }
      
      // Refresh the data to reflect the update
      await refetch();
      
      // Exit editing mode
      setIsEditingResponse(false);
      
      toast({
        title: "Response Updated",
        description: "The response has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating response:', error);
      toast({
        title: "Update Failed",
        description: `Failed to update response: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsSavingEdit(false);
    }
  };
  
  // Function to find similar matches for a single requirement
  const [isFindingSimilar, setIsFindingSimilar] = useState(false);
  const [similarMatches, setSimilarMatches] = useState<any[]>([]);
  
  const handleFindSimilarMatches = async (requirementId: number) => {
    if (!requirementId) return;
    
    try {
      setIsFindingSimilar(true);
      setSimilarMatches([]);
      
      // Call the API to find similar matches with increased timeout for similarity search
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120-second timeout (2 minutes)
      
      try {
        const response = await fetch(`/api/find-similar-matches/${requirementId}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
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
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out after 2 minutes. The similarity search may take longer for large datasets.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Error finding similar matches:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Similarity Search Error",
        description: `Failed to find similar matches: ${errorMessage}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsFindingSimilar(false);
    }
  };
  
  // Function to find similar matches for multiple requirements in bulk - optimized version
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
      
      // Optimized bulk processing with concurrency control
      const results = [];
      const BATCH_SIZE = 3; // Process 3 requests at a time for better performance while avoiding server overload
      
      // Split the items into batches
      for (let i = 0; i < selectedItems.length; i += BATCH_SIZE) {
        const batch = selectedItems.slice(i, i + BATCH_SIZE);
        
        // Process a batch concurrently
        const batchPromises = batch.map(async (requirementId) => {
          try {
            // Add 20ms delay between requests within a batch to reduce load spikes
            const delayIndex = batch.indexOf(requirementId);
            if (delayIndex > 0) {
              await new Promise(resolve => setTimeout(resolve, delayIndex * 20));
            }
            
            // Call the API for this requirement with increased timeout for similarity search
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 120-second timeout (2 minutes) for similarity search
            
            const response = await fetch(`/api/find-similar-matches/${requirementId}`, {
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              return { 
                id: requirementId, 
                success: false,
                error: `HTTP ${response.status}: ${response.statusText}`
              };
            }
            
            const data = await response.json();
            return { 
              id: requirementId, 
              success: !data.error, 
              matchCount: data.similar_matches?.length || 0,
              error: data.error
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { 
              id: requirementId, 
              success: false,
              error: errorMessage
            };
          }
        });
        
        // Wait for the batch to complete
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Update progress for the batch
        setBulkFindingProgress(prev => ({
          ...prev,
          completed: Math.min(prev.completed + batch.length, prev.total)
        }));
        
        // Short delay between batches
        if (i + BATCH_SIZE < selectedItems.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Refresh the data to reflect all updates
      await refetch();
      
      // Count successes and failures
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      // Show final notification
      // USABILITY: Store persistent status for bulk operation
      setLastBulkOperation({
        type: 'find',
        completed: successful,
        total: selectedItems.length,
        timestamp: new Date()
      });
      
      toast({
        title: "Similarity Search Complete",
        description: `Successfully processed ${successful} requirements${failed > 0 ? `, failed: ${failed}` : ''}.`,
        variant: successful > 0 ? "default" : "destructive",
      });
      
      // Log errors for troubleshooting if needed
      const errors = results.filter(r => !r.success && r.error);
      if (errors.length > 0) {
        console.log('Some requirements failed processing:', errors);
      }
      
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
      
      // Refresh the data to get updated feedback
      await refetch();
      
      toast({
        title: "Feedback Submitted",
        description: "Your feedback has been recorded successfully.",
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
  // Keep only the necessary state for tracking individual items in the UI
  const [isGenerating, setIsGenerating] = useState(false);
  
  // For tracking individual requirements being processed (with their model info)
  const [processingIndividualItems, setProcessingIndividualItems] = useState<{[key: number]: {stage: string, model: string}}>({}); 
  
  // Note: Removed the following unused states that were only needed for the old progress indicator:
  // - processedCount
  // - generationError
  // - generationStage
  // - currentItemText
  // - getProgressValueByStage helper function
  
  // Function to generate response for a single requirement
  // Optimized function for generating response for a single requirement
  const generateResponseForRequirement = async (
    requirementId: number, 
    modelProvider: 'openai' | 'anthropic' | 'deepseek' | 'moa'
  ) => {
    try {
      // Find the requirement data - using memoized lookup if available
      let requirement = requirementsCache.current.get(requirementId);
      
      if (!requirement) {
        // Fall back to finding in the dataset if not in cache
        requirement = excelData.find(item => item.id === requirementId);
        
        // Store in cache for future use
        if (requirement) {
          requirementsCache.current.set(requirementId, requirement);
        }
      }
      
      if (!requirement) {
        console.error(`Requirement with ID ${requirementId} not found`);
        return false;
      }
      
      // Make API call to generate response with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60-second timeout for LLM calls
      
      try {
        const response = await fetch('/api/generate-response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            requirement: requirement.requirement,
            provider: modelProvider,
            requirementId: requirementId.toString(),
            rfpName: requirement.rfpName,
            uploadedBy: requirement.uploadedBy,
            skipSimilaritySearch: true  // Use existing similar questions instead of finding them again
          }),
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        return true;
      } catch (err) {
        // Handle abort error specifically
        if (err instanceof Error && err.name === 'AbortError') {
          console.error(`Request timeout for requirement ${requirementId}`);
          throw new Error(`Request timed out after 60 seconds`);
        }
        throw err; // Re-throw for other errors to be caught by outer catch
      }
    } catch (error) {
      console.error(`Error generating response for requirement ${requirementId}:`, error);
      // Error is logged but not stored in state anymore
      return false;
    }
  };
  
  // Function to generate response using the LLM API for a single requirement
  const handleGenerateLlmResponse = async (requirementId: number, model: string = 'moa') => {
    if (!requirementId) return;
    
    // Clear any lingering progress indicators first
    setBulkGenerationProgress({
      total: 0,
      completed: 0,
      isProcessing: false,
      model: ''
    });
    
    try {
      // Set both the single response indicator and the progress tracking for visual feedback
      setIsGeneratingResponse(true);
      setIsGenerating(true);
      setProcessingItems([requirementId]);
      
      // Track this individual item's progress
      setProcessingIndividualItems(prev => ({
        ...prev,
        [requirementId]: { stage: "Initializing", model }
      }));

      console.log(`Generating LLM response for requirement ID ${requirementId} using model ${model}`);
      
      // Get the requirement data to pass to the API
      const requirementItem = excelData.find(item => item.id === requirementId);
      
      if (!requirementItem) {
        throw new Error(`Requirement with ID ${requirementId} not found`);
      }
      
      // Update to creating prompt stage
      setProcessingIndividualItems(prev => ({
        ...prev,
        [requirementId]: { ...prev[requirementId], stage: "Creating prompt" }
      }));
      await new Promise(resolve => setTimeout(resolve, 500)); // simulate brief delay
            
      // Update to fetching LLM response stage
      setProcessingIndividualItems(prev => ({
        ...prev,
        [requirementId]: { ...prev[requirementId], stage: "Fetching response" }
      }));
      
      // Call the API to generate a response
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirementId,
          requirement: requirementItem.requirement,
          provider: model,
          rfpName: requirementItem.rfpName,
          uploadedBy: requirementItem.uploadedBy,
          skipSimilaritySearch: true  // Use existing similar questions
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate response: ${response.status} ${response.statusText}`);
      }
      
      // Update to saving response stage
      setProcessingIndividualItems(prev => ({
        ...prev,
        [requirementId]: { ...prev[requirementId], stage: "Saving response" }
      }));
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate response');
      }
      
      // Update the selected response with the generated response
      if (selectedResponse && selectedResponse.id === requirementId) {
        setSelectedResponse({
          ...selectedResponse,
          finalResponse: data.finalResponse || selectedResponse.finalResponse,
          openaiResponse: data.openaiResponse || selectedResponse.openaiResponse,
          anthropicResponse: data.anthropicResponse || selectedResponse.anthropicResponse,
          deepseekResponse: data.deepseekResponse || selectedResponse.deepseekResponse,
          moaResponse: data.moaResponse || selectedResponse.moaResponse
        });
        
        // Set tab to response view since we now have a response
        setActiveTab('response');
      }
      
      // Update individual progress indicator to completion
      setProcessingIndividualItems(prev => ({
        ...prev,
        [requirementId]: { ...prev[requirementId], stage: "Completed" }
      }));
      
      // Show success toast
      toast({
        title: "Response Generated",
        description: `Successfully generated response for requirement ID ${requirementId}`,
      });
      
      console.log("Generated response for requirement " + requirementId + ":", data);
      
      // Invalidate and refetch the requirements query to update the UI
      // This ensures the Response button gets enabled with the new finalResponse
      await queryClient.invalidateQueries({ queryKey: ['/api/excel-requirements'] });
      await refetch();
      
      // Also update the cache directly with the new response data if available
      if (data.finalResponse || data.openaiResponse || data.anthropicResponse || data.deepseekResponse || data.moaResponse) {
        queryClient.setQueryData<ExcelRequirementResponse[]>(['/api/excel-requirements'], (oldData) => {
          if (!oldData) return oldData;
          return oldData.map(item => {
            if (item.id === requirementId) {
              return {
                ...item,
                finalResponse: data.finalResponse || item.finalResponse,
                openaiResponse: data.openaiResponse || item.openaiResponse,
                anthropicResponse: data.anthropicResponse || item.anthropicResponse,
                deepseekResponse: data.deepseekResponse || item.deepseekResponse,
                moaResponse: data.moaResponse || item.moaResponse,
                modelProvider: data.modelProvider || item.modelProvider
              };
            }
            return item;
          });
        });
      }
      
      // Fetch the updated response directly to ensure we have the latest data
      if (selectedResponse && selectedResponse.id === requirementId) {
        try {
          const updatedResponseData = await fetch(`/api/excel-requirements/${requirementId}`);
          if (updatedResponseData.ok) {
            const updatedResponse = await updatedResponseData.json();
            if (updatedResponse && updatedResponse.id === requirementId) {
              // Update the selected response with the freshly fetched data
              setSelectedResponse(updatedResponse);
            }
          }
        } catch (fetchError) {
          console.error('Error fetching updated response:', fetchError);
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('Error generating LLM response:', error);
      
      toast({
        title: "Generation Error",
        description: `Failed to generate response: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      
      return false;
    } finally {
      // Keep status visible for a moment so user can see completion
      setTimeout(() => {
        setIsGeneratingResponse(false);
        setIsGenerating(false);
        // Clear the processing indicator for this requirement after a delay
        setProcessingIndividualItems(prev => {
          const newState = {...prev};
          if (requirementId in newState) {
            delete newState[requirementId];
          }
          return newState;
        });
      }, 1500);
    }
  };
  
  // Optimized function to handle bulk generation of responses
  const handleGenerateResponses = async (modelProvider: 'openai' | 'anthropic' | 'deepseek' | 'moa') => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one requirement to generate responses",
        variant: "destructive",
      });
      return;
    }
    
    // Reset any stale progress indicators before starting
    setIsGeneratingResponse(false);
    setBulkGenerationProgress(prev => ({
      ...prev,
      isProcessing: false
    }));
    
    setProcessingItems(selectedItems);
    setIsGenerating(true);
    
    // Initialize bulk generation progress
    setBulkGenerationProgress({
      total: selectedItems.length,
      completed: 0,
      isProcessing: true,
      model: modelProvider
    });
    
    const totalItems = selectedItems.length;
    let successCount = 0;
    
    try {
      // Show notification to user
      toast({
        title: "Generating Responses",
        description: `Processing ${totalItems} requirements with ${modelProvider}...`,
      });
      
      // For LLM requests, we want to be careful with concurrency to avoid rate limits
      // So we'll process items in small batches with throttling
      const BATCH_SIZE = modelProvider === 'moa' ? 1 : 2; // MOA makes 3 API calls, so use smaller batch size
      
      // Cache the requirements lookup for performance
      const requirementsMap = new Map(
        excelData
          .filter(item => selectedItems.includes(item.id || 0))
          .map(item => [item.id, item])
      );
      
      // Process items in small concurrent batches
      for (let i = 0; i < selectedItems.length; i += BATCH_SIZE) {
        const currentBatch = selectedItems.slice(i, i + BATCH_SIZE);
        
        // Process this batch with limited concurrency
        const batchPromises = currentBatch.map(async (requirementId, batchIndex) => {
          try {
            // Stagger requests within batch by 200ms to reduce API load spikes
            if (batchIndex > 0) {
              await new Promise(resolve => setTimeout(resolve, batchIndex * 200));
            }
            
            const requirement = requirementsMap.get(requirementId);
            
            if (!requirement) {
              console.warn(`Requirement ID ${requirementId} not found in data cache`);
              return false;
            }
            
            const reqText = requirement.requirement || "";
            const shortText = reqText.length > 50 ? reqText.substring(0, 50) + '...' : reqText;
            
            // Add this item to the individual processing indicators
            setProcessingIndividualItems(prev => ({
              ...prev,
              [requirementId]: { 
                stage: `Processing ${i + batchIndex + 1}/${totalItems}`, 
                model: modelProvider 
              }
            }));
            
            // Generate response for this requirement
            const result = await generateResponseForRequirement(requirementId, modelProvider);
            
            // Invalidate cache after each successful generation to update UI immediately
            if (result) {
              await queryClient.invalidateQueries({ queryKey: ['/api/excel-requirements'] });
            }
            
            return result;
          } catch (error) {
            console.error(`Error in batch processing for req ${requirementId}:`, error);
            return false;
          }
        });
        
        // Wait for the current batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Count successes in this batch
        successCount += batchResults.filter(Boolean).length;
        
        // Update progress counter
        setBulkGenerationProgress(prev => ({
          ...prev,
          completed: Math.min(prev.completed + currentBatch.length, prev.total)
        }));
        
        // Small delay between batches to avoid overloading the server
        if (i + BATCH_SIZE < selectedItems.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Invalidate and refresh data after all items are processed
      await queryClient.invalidateQueries({ queryKey: ['/api/excel-requirements'] });
      await refetch();
      
      // USABILITY: Store persistent status for bulk operation
      setLastBulkOperation({
        type: 'generate',
        model: modelProvider,
        completed: successCount,
        total: totalItems,
        timestamp: new Date()
      });
      
      toast({
        title: "Response Generation Complete",
        description: `Successfully generated responses for ${successCount} out of ${totalItems} requirements.`,
        variant: successCount === totalItems ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error in bulk generation:', error);
      
      toast({
        title: "Generation Error",
        description: `Failed to complete response generation: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      // Keep status visible for a moment
      setTimeout(() => {
        setIsGenerating(false);
        setIsGeneratingResponse(false); // Explicitly reset the response generation flag for MOA
        setProcessingItems([]);
        
        // Clear all individual processing indicators after bulk operation completes
        setProcessingIndividualItems({});
        
        // Also force reset the bulk generation progress indicators
        setBulkGenerationProgress({
          total: 0,
          completed: 0,
          isProcessing: false,
          model: ''
        });
      }, 1500);
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

  // Function to share responses via WhatsApp
  const handleShareViaWhatsApp = () => {
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
      // Generate markdown content
      const markdownContent = generateMarkdownContent(selectedData);
      
      // Share via WhatsApp
      shareViaWhatsApp(markdownContent);
      
      toast({
        title: "WhatsApp Sharing",
        description: "Content has been prepared for WhatsApp sharing. A file copy has also been downloaded for your records.",
      });
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      toast({
        title: "WhatsApp Sharing Failed",
        description: "Failed to share via WhatsApp: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive"
      });
    }
  };
  
  // Function to generate responses using selected model
  const generateResponse = async (model: string) => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one requirement to generate a response.",
        variant: "destructive"
      });
      return;
    }
    
    // Reset any stale progress indicators before starting
    setIsGeneratingResponse(false);
    setBulkGenerationProgress(prev => ({
      ...prev,
      isProcessing: false
    }));

    // Convert model name to provider format if needed
    let provider = model;
    if (model === 'openAI') provider = 'openai';
    if (model === 'claude') provider = 'anthropic';
    
    // Initialize bulk generation progress
    setBulkGenerationProgress({
      total: selectedItems.length,
      completed: 0,
      isProcessing: true,
      model: provider
    });
    
    setIsGenerating(true);
    
    try {
      // Find the selected requirements
      const selectedRequirements = excelData.filter(item => selectedItems.includes(item.id || 0));
      
      // Show notification to user
      toast({
        title: "Generating Responses",
        description: `Processing ${selectedRequirements.length} requirements with ${provider}...`,
      });
      
      for (let index = 0; index < selectedRequirements.length; index++) {
        const requirement = selectedRequirements[index];
        
        // Add this requirement to the individual processing indicators
        setProcessingIndividualItems(prev => ({
          ...prev,
          [requirement.id || 0]: { 
            stage: `Generating (${index+1}/${selectedRequirements.length})`, 
            model: provider 
          }
        }));
        
        const response = await fetch('/api/generate-response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            requirementId: requirement.id,
            requirement: requirement.requirement,
            provider,
            rfpName: requirement.rfpName,
            uploadedBy: requirement.uploadedBy,
            skipSimilaritySearch: true  // Use existing similar questions instead of finding them again
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to generate response for requirement ${requirement.id}`);
        }
        
        // Update bulk generation progress
        setBulkGenerationProgress(prev => ({
          ...prev,
          completed: prev.completed + 1
        }));

        const result = await response.json();
        console.log(`Generated response for requirement ${requirement.id}:`, result);
        
        // Show a preview of the response in the console
        if (result.finalResponse) {
          console.log(`Response preview: ${result.finalResponse.substring(0, 100)}...`);
        }
        
        // If this is the currently selected response, update it in the UI
        if (selectedResponse && selectedResponse.id === requirement.id) {
          setSelectedResponse({
            ...selectedResponse,
            finalResponse: result.finalResponse || selectedResponse.finalResponse,
            openaiResponse: result.openaiResponse || selectedResponse.openaiResponse,
            anthropicResponse: result.anthropicResponse || selectedResponse.anthropicResponse,
            deepseekResponse: result.deepseekResponse || selectedResponse.deepseekResponse,
            moaResponse: result.moaResponse || selectedResponse.moaResponse,
            modelProvider: result.modelProvider || selectedResponse.modelProvider
          });
          
          // Set tab to response view since we now have a response
          setActiveTab('response');
        }
      }

      toast({
        title: "Success",
        description: `Generated responses for ${selectedRequirements.length} requirements using ${model}`,
      });

      // Invalidate and refresh the data to show new responses
      await queryClient.invalidateQueries({ queryKey: ['/api/excel-requirements'] });
      refetch();
    } catch (error) {
      console.error('Error generating response:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setIsGeneratingResponse(false); // Ensure we reset the single item generation flag too for MOA
      
      // Reset the bulk generation progress after a delay for UX reasons
      setTimeout(() => {
        setBulkGenerationProgress({
          total: 0,
          completed: 0,
          isProcessing: false,
          model: ''
        });
        
        // Clear all individual processing indicators after operation completes
        setProcessingIndividualItems({});
        setProcessingItems([]); // Clear any remaining processing items
      }, 1500);
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
      case 'find-similar':
        handleFindSimilarForBulk();
        break;
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
      case 'whatsapp':
        handleShareViaWhatsApp();
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
      {/* ACCESSIBILITY: Progress bar for requirements loading with live region */}
      {requirementsLoadingProgress.isLoading && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 p-3 shadow-md" role="status" aria-live="polite" aria-atomic="true">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="animate-spin h-5 w-5 text-primary" aria-hidden="true" />
              <p className="font-medium text-sm">
                Loading requirements data {requirementsLoadingProgress.loaded > 0 ? 
                  `(${requirementsLoadingProgress.loaded} items)` : '...'}
              </p>
            </div>
            <Progress value={loading ? 30 : 100} className="h-2" aria-label="Loading progress" />
          </div>
        </div>
      )}
      
      {/* ACCESSIBILITY: Progress bar for bulk find similar operations with live region */}
      {bulkFindingProgress.isProcessing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 p-3 shadow-md" role="status" aria-live="polite" aria-atomic="true">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="animate-spin h-5 w-5 text-primary" aria-hidden="true" />
              <p className="font-medium text-sm">
                Fetching similar responses for {bulkFindingProgress.completed}/{bulkFindingProgress.total} requirements
              </p>
            </div>
            <Progress value={(bulkFindingProgress.completed / bulkFindingProgress.total) * 100} 
              className="h-2" aria-label={`Progress: ${bulkFindingProgress.completed} of ${bulkFindingProgress.total} requirements processed`} />
          </div>
        </div>
      )}
      
      {/* ACCESSIBILITY: Progress bar for bulk generation operations with live region */}
      {bulkGenerationProgress.isProcessing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 p-3 shadow-md" role="status" aria-live="polite" aria-atomic="true">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="animate-spin h-5 w-5 text-primary" aria-hidden="true" />
              <p className="font-medium text-sm">
                Generating responses with {bulkGenerationProgress.model} for {bulkGenerationProgress.completed}/{bulkGenerationProgress.total} requirements
              </p>
            </div>
            <Progress value={(bulkGenerationProgress.completed / bulkGenerationProgress.total) * 100} 
              className="h-2" aria-label={`Progress: ${bulkGenerationProgress.completed} of ${bulkGenerationProgress.total} responses generated`} />
          </div>
        </div>
      )}
      
      {/* USABILITY: Persistent status banner for completed bulk operations */}
      {lastBulkOperation && !bulkGenerationProgress.isProcessing && !bulkFindingProgress.isProcessing && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {lastBulkOperation.type === 'generate' 
                  ? `Generated ${lastBulkOperation.completed} of ${lastBulkOperation.total} responses using ${lastBulkOperation.model?.toUpperCase() || 'AI'}`
                  : `Found similar responses for ${lastBulkOperation.completed} of ${lastBulkOperation.total} requirements`}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Completed {formatDistanceToNow(lastBulkOperation.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLastBulkOperation(null)}
            className="h-7 w-7 p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            aria-label="Dismiss status message"
          >
            <CloseIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Sticky header with all controls */}
      <div className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 py-3 px-4 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-10 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">View Requirements</h1>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
              {filteredData.length} {filteredData.length === 1 ? 'item' : 'items'}
              {filteredData.length !== excelData.length ? 
                <Badge variant="outline" className="font-normal ml-1">
                  Filtered from {excelData.length}
                </Badge> : ''
              }
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Select All Checkbox */}
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
            
            {/* Separate Past Responses and Generate Answer Buttons */}
            <div className="flex space-x-2">
              {/* Find Past Responses Button */}
              <Button 
                size="sm" 
                className="h-8"
                variant="outline"
                disabled={selectedItems.length === 0}
                onClick={() => handleBulkAction('find-similar')}
              >
                <Search className="h-4 w-4 mr-1.5 text-blue-500" />
                <span>Past Responses</span>
              </Button>
              
              {/* Generate Answer Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm" 
                    className="h-8"
                    variant="outline"
                    disabled={selectedItems.length === 0}
                  >
                    <Sparkles className="h-4 w-4 mr-1.5 text-primary" />
                    <span>Generate Answer</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>AI Models</DropdownMenuLabel>
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
                    <span>Mixture of Agents (MOA)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Export Options Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm"
                  className="h-8"
                  variant="outline"
                  disabled={selectedItems.length === 0}
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  <span>Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleExportToMarkdown} className="gap-2">
                  <Printer className="h-4 w-4" />
                  <span>Markdown</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportToExcel} className="gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Excel</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEmailMarkdown} className="gap-2">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('whatsapp')} className="gap-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <span>WhatsApp</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Filters Button */}
            <Button 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              className={`h-8 ${areFiltersActive ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 hover:dark:bg-blue-800 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200' : ''}`}
              variant={showFilters ? "default" : areFiltersActive ? "default" : "outline"}
              title={areFiltersActive ? "Filters are currently active" : "Toggle filters panel"}
            >
              <Filter className={`h-4 w-4 mr-1.5 ${areFiltersActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              <span>Filters</span>
              {showFilters ? (
                <CloseIcon className="h-3 w-3 ml-1" />
              ) : areFiltersActive ? (
                <span className="ml-1.5 h-4 px-1 rounded bg-blue-500 text-white text-[10px] inline-flex items-center">on</span>
              ) : (
                <ChevronRight className="h-3 w-3 ml-1" />
              )}
            </Button>
            
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8"
                  title="Sort requirements"
                >
                  <ArrowUpDown className="h-4 w-4 mr-1.5" />
                  <span>Sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center gap-2 px-2 pt-1.5 pb-0.5">
                  <DropdownMenuLabel className="pb-0">Sort By</DropdownMenuLabel>
                  <HelpTooltip text="Choose a field to sort the requirements list. Click again to toggle between ascending and descending order." />
                </div>
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
            
            {/* Refresh Button */}
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
      </div>
      
      <div className="relative">
        <Card className="shadow-sm">
          {/* Filters panel - optimized for mobile with collapsible sections */}
          {showFilters && (
            <div className="sticky top-[60px] z-10 border-b border-slate-200 dark:border-slate-700">
              <div className="p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
                <div className="space-y-4">
                  <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 xs:gap-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-base">Filter Requirements</h3>
                      <HelpTooltip text="Use these filters to narrow down the list of requirements based on different criteria. You can filter by RFP name, category, response status, and AI model type." />
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="h-9 px-2 sm:px-3 flex gap-1.5 items-center" 
                          disabled={selectedItems.length === 0}
                        >
                            <Sparkles className="h-4 w-4" />
                          <span className="hidden xs:inline">Generate Response</span>
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
                  
                  {/* Mobile-friendly accordion for filters */}
                  {isMobile ? (
                    <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                      {/* RFP Name Accordion */}
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="rfp-name" className="border-0 border-b">
                          <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" aria-hidden="true" />
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
                              <Tag className="h-4 w-4 text-slate-600 dark:text-slate-300" aria-hidden="true" />
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
                              <MessageSquare className="h-4 w-4 text-slate-600 dark:text-slate-300" aria-hidden="true" />
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
                              <Sparkles className="h-4 w-4 text-slate-600 dark:text-slate-300" aria-hidden="true" />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                      <CloseIcon className="h-4 w-4" />
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
                          <span className="hidden xs:inline">More</span>
                          {selectedItems.length > 0 && (
                            <Badge className="ml-1 h-5" variant="secondary">{selectedItems.length}</Badge>
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
                        <DropdownMenuItem onClick={() => handleBulkAction('whatsapp')} className="gap-2">
                          <MessageSquare className="h-4 w-4 text-green-500" />
                          <span>Share via WhatsApp</span>
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
                <p className="text-slate-600 dark:text-slate-300 text-sm mt-2">
                  Go to the Upload Requirements page to add data.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* MOBILE: Detail Dialog - responsive width */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
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
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span>Generate Answer</span>
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="flex items-center gap-2">
                        Generate Response
                        <HelpTooltip text="Select an AI model to generate a response for this requirement. Different models have unique strengths." />
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleGenerateLlmResponse(selectedResponseId, 'openai')} className="gap-2">
                        <Atom className="h-4 w-4 text-blue-500" />
                        <div className="flex items-center gap-2">
                          <span>OpenAI</span>
                          <HelpTooltip text="OpenAI's GPT models are good at providing concise, well-structured responses with accurate technical details." side="right" />
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleGenerateLlmResponse(selectedResponseId, 'claude')} className="gap-2">
                        <Bot className="h-4 w-4 text-purple-500" />
                        <div className="flex items-center gap-2">
                          <span>Anthropic</span>
                          <HelpTooltip text="Anthropic's Claude models excel at nuanced explanations and compliance-focused content with careful reasoning." side="right" />
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleGenerateLlmResponse(selectedResponseId, 'deepseek')} className="gap-2">
                        <Brain className="h-4 w-4 text-amber-500" />
                        <div className="flex items-center gap-2">
                          <span>DeepSeek</span>
                          <HelpTooltip text="DeepSeek models are especially good with technical content and can provide detailed, specialized responses." side="right" />
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleGenerateLlmResponse(selectedResponseId, 'moa')} className="gap-2">
                        <Network className="h-4 w-4 text-green-500" />
                        <div className="flex items-center gap-2">
                          <span>Mixture of Agents (MOA)</span>
                          <HelpTooltip text="MOA combines responses from all three models above to create a comprehensive answer that leverages the strengths of each model. This usually produces the best overall results." side="right" />
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </DialogHeader>
          
          {selectedResponse && (
            <div className="space-y-4 py-2">
              <div className="flex space-x-4 mb-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-md flex-1">
                  <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">ID:</h4>
                  <p className="text-slate-900 dark:text-slate-100 font-medium">{selectedResponse.id}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-md flex-1">
                  <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Category:</h4>
                  <p className="text-slate-900 dark:text-slate-100 font-medium">{selectedResponse.category}</p>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-md mb-4">
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Requirement:</h4>
                <p className="text-slate-900 dark:text-slate-100">{selectedResponse.requirement}</p>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-md mb-4">
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">AI Model Used:</h4>
                <p className="text-slate-900 dark:text-slate-100">
                  {selectedResponse.modelProvider === "openai" ? "OpenAI" :
                   selectedResponse.modelProvider === "anthropic" ? "Anthropic/Claude" :
                   selectedResponse.modelProvider === "deepseek" ? "DeepSeek" :
                   selectedResponse.modelProvider === "moa" ? "Mixture of Agents (MOA)" :
                   selectedResponse.modelProvider || "Not specified"}
                </p>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger 
                    value="response" 
                    className="flex items-center gap-2"
                    disabled={!selectedResponse?.finalResponse}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Response
                    {!selectedResponse?.finalResponse && <span className="ml-1 text-xs opacity-60">(Not available)</span>}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="references" 
                    className="flex items-center gap-2"
                    disabled={!selectedResponse?.similarQuestions}
                  >
                    <BookOpen className="h-4 w-4" />
                    References
                    {referenceCount > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {referenceCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="response">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-md mb-4">
                    {!isEditingResponse ? (
                      <>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Response:</h4>
                          {selectedResponse?.finalResponse && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex items-center gap-1" 
                              onClick={handleStartEditing}
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          )}
                        </div>
                        <div className="prose prose-slate dark:prose-invert max-w-none text-slate-900 dark:text-slate-50 font-medium">
                          {selectedResponse?.finalResponse && (
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
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Edit Response:</h4>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex items-center gap-1" 
                              onClick={handleCancelEdit}
                              disabled={isSavingEdit}
                            >
                              <CloseIcon className="h-3.5 w-3.5" />
                              Cancel
                            </Button>
                            <Button 
                              size="sm" 
                              variant="default" 
                              className="flex items-center gap-1" 
                              onClick={handleSaveEdit}
                              disabled={isSavingEdit}
                            >
                              <Save className="h-3.5 w-3.5" />
                              {isSavingEdit ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                        </div>
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                          <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                            <textarea
                              value={editedResponseText}
                              onChange={(e) => setEditedResponseText(e.target.value)}
                              className="w-full h-64 p-3 bg-transparent focus:outline-none resize-y text-slate-900 dark:text-slate-50 font-medium"
                              placeholder="Enter response content..."
                              disabled={isSavingEdit}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="references">
                  <ReferencePanel 
                    responseId={selectedResponseId || undefined} 
                    showTitle={false} 
                    onReferencesLoaded={setReferenceCount}
                  />
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
            
            {selectedResponse && selectedResponse.finalResponse && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-500 mr-1">Feedback:</span>
                <Button
                  type="button"
                  size="sm"
                  variant={selectedResponse.feedback === 'positive' ? 'default' : 'outline'}
                  className={`p-2 ${selectedResponse.feedback === 'positive' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => handleFeedbackSubmit(selectedResponse.id || 0, 'positive')}
                  disabled={isFeedbackSubmitting}
                  title="I like this response"
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={selectedResponse.feedback === 'negative' ? 'default' : 'outline'}
                  className={`p-2 ${selectedResponse.feedback === 'negative' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  onClick={() => handleFeedbackSubmit(selectedResponse.id || 0, 'negative')}
                  disabled={isFeedbackSubmitting}
                  title="I don't like this response"
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Simplified Floating Action Button for Mobile - Only show when items are selected */}
      {isMobile && selectedItems.length > 0 && (
        <div className="fixed bottom-6 right-4 z-50">
          <Button 
            className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center bg-green-600 hover:bg-green-700"
            onClick={() => handleBulkAction('generate-moa')}
            title="Generate MOA for Selected"
          >
            <Sparkles className="h-6 w-6 text-white" />
            <Badge className="absolute -top-1 -right-1 h-6 bg-white text-green-600 rounded-full flex items-center justify-center font-bold">
              {selectedItems.length}
            </Badge>
          </Button>
        </div>
      )}
    </div>
  );
}

