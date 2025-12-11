import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateMarkdownContent, downloadMarkdownFile, sendEmailWithContent, downloadExcelFile, shareViaWhatsApp, downloadDocxFile, downloadEventMappingCsv, downloadEkgAssessmentExcel, downloadMultiEkgAssessmentExcel, MultiEkgExportData } from '@/lib/exportUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  X as CloseIcon,
  MapPin,
  Download
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showTourOverlay, setShowTourOverlay] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const tourSteps = [
    { title: "Upload requirements", description: "Load your Excel with Category and Requirement columns on the Upload page. Use the sample file if needed." },
    { title: "Select & find references", description: "Pick rows and run Past Responses to enrich with similar answers and references." },
    { title: "Generate responses", description: "Choose an AI model (OpenAI/Anthropic/DeepSeek/MOA) to draft answers. Compare outputs side by side." },
    { title: "Review & edit", description: "Edit responses, compare to original text, and insert approved snippets quickly." },
    { title: "Export & handoff", description: "Export to Markdown/Excel/Word/PDF and run consistency check before sharing." },
  ];
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [isMappingEvents, setIsMappingEvents] = useState(false);
  const [mappingIndividualItems, setMappingIndividualItems] = useState<{[key: number]: boolean}>({});
  const [markedAvailableSubrequirements, setMarkedAvailableSubrequirements] = useState<string[]>([]);
  const [isUpdatingSubreqAvailability, setIsUpdatingSubreqAvailability] = useState(false);
  const [isRegeneratingResponse, setIsRegeneratingResponse] = useState(false);
  
  // Helper function to check if any response exists
  const hasAnyResponse = (response: ExcelRequirementResponse | null) => {
    if (!response) return false;
    return !!(
      (response as any).ekgCustomerResponse ||
      response.finalResponse ||
      response.openaiResponse ||
      response.anthropicResponse ||
      response.deepseekResponse ||
      response.moaResponse
    );
  };
  
  // Helper function to get the best available response text
  const getBestResponse = (response: ExcelRequirementResponse | null) => {
    if (!response) return null;
    return (response as any).ekgCustomerResponse ||
      response.finalResponse ||
      response.openaiResponse ||
      response.anthropicResponse ||
      response.deepseekResponse ||
      response.moaResponse ||
      null;
  };
  
  const parseEventMappings = (response: ExcelRequirementResponse | null) => {
    if (!response) return null;
    const raw = (response as any).eventMappings;
    if (!raw) return null;
    try {
      if (typeof raw === 'string') return JSON.parse(raw);
      return raw;
    } catch (err) {
      console.error("Failed to parse eventMappings", err);
      return null;
    }
  };

  const parseStringArray = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch (err) {
        console.error("Failed to parse string array", err);
        return [];
      }
    }
    return [];
  };

  const parseNumberOrNull = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    const num = typeof value === 'string' ? Number(value) : value;
    if (typeof num === 'number' && !Number.isNaN(num)) return num;
    return null;
  };

  const parseSubrequirements = (value: any): any[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error("Failed to parse subrequirements", err);
        return [];
      }
    }
    return [];
  };

  const eventMappingsData = useMemo(() => parseEventMappings(selectedResponse), [selectedResponse]);
  const ekgAvailableFeatures = useMemo(
    () => parseStringArray((selectedResponse as any)?.ekgAvailableFeatures),
    [selectedResponse]
  );
  const ekgGapsCustomizations = useMemo(
    () => parseStringArray((selectedResponse as any)?.ekgGapsCustomizations),
    [selectedResponse]
  );
  const ekgSubrequirements = useMemo(
    () => parseSubrequirements((selectedResponse as any)?.ekgSubrequirements),
    [selectedResponse]
  );
  const ekgSubrequirementsAvailable = useMemo(
    () => parseStringArray((selectedResponse as any)?.ekgSubrequirementsAvailable),
    [selectedResponse]
  );
  const ekgOverallFitmentPercentage = useMemo(() => {
    const raw = parseNumberOrNull((selectedResponse as any)?.ekgOverallFitmentPercentage);
    if (raw !== null) return Math.round(raw);
    const fitmentScore = parseNumberOrNull((selectedResponse as any)?.fitmentScore);
    if (fitmentScore !== null) return Math.round(fitmentScore * 100);
    return null;
  }, [selectedResponse]);
  const ekgCustomerResponse = useMemo(
    () => (selectedResponse as any)?.ekgCustomerResponse || selectedResponse?.finalResponse,
    [selectedResponse]
  );
  const displayResponseText = ekgCustomerResponse || selectedResponse?.finalResponse || '';
  const ekgVectorStoreNames = useMemo(() => {
    const names = (selectedResponse as any)?.vectorStoreNames;
    if (!names) return [];
    if (Array.isArray(names)) return names.map(String);
    try {
      const parsed = JSON.parse(names);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }, [selectedResponse]);

  useEffect(() => {
    setMarkedAvailableSubrequirements(ekgSubrequirementsAvailable);
  }, [ekgSubrequirementsAvailable, selectedResponse]);
  
  // Requirements cache for performance optimization
  const requirementsCache = React.useRef<Map<number, ExcelRequirementResponse>>(new Map());
  
  // Response editing state
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [editedResponseText, setEditedResponseText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [originalResponseText, setOriginalResponseText] = useState('');
  const approvedSnippets = useMemo(() => [
    "We comply with SOC 2 Type II and ISO 27001; audit reports available under NDA.",
    "We provide RESTful APIs with OpenAPI documentation, OAuth2 client credentials, and sandbox keys on request.",
    "All data is encrypted in transit (TLS 1.2+) and at rest (AES-256). Keys are managed via KMS with strict RBAC.",
    "We support SSO via SAML 2.0 and OIDC; user provisioning is automated through SCIM.",
    "We offer 24x7 support with defined SLAs; P1 response within 1 hour and P2 within 4 hours."
  ], []);
  
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
  
  // Cancel mechanism for response generation
  const [isCancelling, setIsCancelling] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
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
    requirementId: '', // Empty string means no filter, otherwise filter by ID
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
    
    const handleFitmentScoresRecalculated = async () => {
      console.log('Fitment scores recalculated - refreshing selected response');
      // If a response dialog is open, refresh the selected response to get updated fitment score
      if (selectedResponseId) {
        try {
          const response = await fetch(`/api/excel-requirements/${selectedResponseId}`);
          if (response.ok) {
            const freshData = await response.json();
            setSelectedResponse(freshData);
          }
        } catch (error) {
          console.error('Failed to refresh selected response after fitment score recalculation:', error);
        }
      }
      // Also refresh the main data list
      queryClient.invalidateQueries({ queryKey: ['/api/excel-requirements'] });
      refetch();
    };
    
    window.addEventListener('requirements-replaced', handleRequirementsReplaced);
    window.addEventListener('requirements-updated', handleRequirementsUpdated);
    window.addEventListener('fitmentScoresRecalculated', handleFitmentScoresRecalculated);
    return () => {
      window.removeEventListener('requirements-replaced', handleRequirementsReplaced);
      window.removeEventListener('requirements-updated', handleRequirementsUpdated);
      window.removeEventListener('fitmentScoresRecalculated', handleFitmentScoresRecalculated);
    };
  }, [refetch, queryClient, selectedResponseId]);
  
  // Ensure processing continues even when tab is in background
  // This effect prevents browser from throttling the processing loop
  React.useEffect(() => {
    if (!bulkGenerationProgress.isProcessing) return;
    
    // Use a more aggressive polling mechanism when tab is in background
    const handleVisibilityChange = () => {
      if (document.hidden && bulkGenerationProgress.isProcessing) {
        console.log('Tab is in background, but processing will continue');
        // Force a small operation to keep the event loop active
        // This helps prevent excessive throttling
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [bulkGenerationProgress.isProcessing]);
  
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

  const outcomeSummary = useMemo(() => {
    const total = excelData.length;
    const completed = excelData.filter(item => !!item.finalResponse).length;
    const pending = total - completed;
    const withRefs = excelData.filter(item => !!item.similarQuestions).length;
    return {
      total,
      completed,
      pending,
      withRefs,
      completionPct: total ? Math.round((completed / total) * 100) : 0
    };
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
           filters.requirementId !== '';
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
      filters.requirementId !== '';
    
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
      
      // Filter by requirement ID
      if (filters.requirementId !== '') {
        const searchId = filters.requirementId.trim();
        if (searchId !== '') {
          // Try to match as number or string
          const rowId = row.id?.toString() || '';
          if (rowId !== searchId && !rowId.includes(searchId)) {
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
  
  const handleViewResponse = async (row: ExcelRequirementResponse) => {
    // Set initial response data
    setSelectedResponse(row);
    setSelectedResponseId(row.id);
    setReferenceCount(0); // Reset reference count when opening a new response
    
    // Reset editing state
    setIsEditingResponse(false);
    
    // Fetch fresh data from API to ensure we have the latest fitment score
    try {
      const response = await fetch(`/api/excel-requirements/${row.id}`);
      if (response.ok) {
        const freshData = await response.json();
        setSelectedResponse(freshData);
      }
    } catch (error) {
      console.error('Failed to fetch fresh response data:', error);
      // Continue with existing data if fetch fails
    }
    
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
    if (displayResponseText) {
      // Store original text for undo functionality
      setOriginalResponseText(displayResponseText
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\'));
      
      // Initialize editable text
      setEditedResponseText(displayResponseText
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\'));
      
      setIsEditingResponse(true);
    }
  };
  
  const handleInsertSnippet = (snippet: string) => {
    setEditedResponseText((prev) => prev ? `${prev}\n\n${snippet}` : snippet);
  };
  
  // Function to cancel editing
  const handleCancelEdit = () => {
    setIsEditingResponse(false);
    setEditedResponseText('');
  };
  
  // Function to save edited response
  const handleSaveEdit = async () => {
    const targetId = selectedResponseId || selectedResponse?.id;
    if (!targetId || !editedResponseText.trim()) {
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
      const response = await fetch(`/api/excel-requirements/${targetId}/update-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          finalResponse: editedResponseText,
        }),
      });
      const rawText = await response.text();
      let result: any = {};
      try {
        result = rawText ? JSON.parse(rawText) : {};
      } catch (err) {
        console.error("Failed to parse update-response payload:", rawText);
      }
      if (!response.ok || result.success === false) {
        const message = result?.message || result?.error || `${response.status} ${response.statusText}`;
        throw new Error(message);
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

  const handleToggleSubreqAvailability = async (subreqId: string, checked: boolean) => {
    const normalizedId = String(subreqId);
    const next = checked
      ? Array.from(new Set([...markedAvailableSubrequirements, normalizedId]))
      : markedAvailableSubrequirements.filter(id => id !== normalizedId);
    
    setMarkedAvailableSubrequirements(next);
    const targetId = selectedResponseId || selectedResponse?.id;
    if (!targetId) return;
    try {
      setIsUpdatingSubreqAvailability(true);
      const resp = await fetch(`/api/excel-requirements/${targetId}/ekg/subrequirements-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availableIds: next })
      });
      if (!resp.ok) {
        throw new Error(`Failed to update availability (${resp.status})`);
      }
      setSelectedResponse(prev => prev ? { ...prev, ekgSubrequirementsAvailable: JSON.stringify(next) } as any : prev);
    } catch (err: any) {
      console.error("Failed to update subrequirement availability", err);
      toast({
        title: "Update failed",
        description: err?.message || "Could not save selection",
        variant: "destructive"
      });
      // revert
      setMarkedAvailableSubrequirements(ekgSubrequirementsAvailable);
    } finally {
      setIsUpdatingSubreqAvailability(false);
    }
  };

  const handleRegenerateWithAvailable = async () => {
    const targetId = selectedResponseId || selectedResponse?.id;
    if (!targetId) return;
    if (markedAvailableSubrequirements.length === 0) {
      toast({
        title: "Select subrequirements",
        description: "Mark at least one subrequirement as available to regenerate.",
        variant: "destructive"
      });
      return;
    }
    try {
      setIsRegeneratingResponse(true);
      let resp: Response;
      try {
        resp = await fetch(`/api/excel-requirements/${targetId}/ekg/regenerate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ availableIds: markedAvailableSubrequirements })
        });
      } catch (networkError: any) {
        // Handle network errors (server not reachable, CORS, etc.)
        console.error('Network error during regeneration:', networkError);
        throw new Error(`Failed to connect to server: ${networkError.message || 'Network error'}`);
      }
      
      const text = await resp.text();
      let data: any = {};
      try { 
        data = text ? JSON.parse(text) : {}; 
      } catch (parseError) {
        console.error('Failed to parse regeneration response:', parseError);
        throw new Error(`Invalid server response: ${text.substring(0, 100)}`);
      }
      
      if (!resp.ok || data.success === false) {
        throw new Error(data?.message || data?.error || `Regeneration failed (${resp.status})`);
      }
      setSelectedResponse(prev => prev ? {
        ...prev,
        finalResponse: data.finalResponse || prev.finalResponse,
        ekgCustomerResponse: data.ekgCustomerResponse || (prev as any).ekgCustomerResponse,
        ekgAvailableFeatures: JSON.stringify(data.ekgAvailableFeatures || ekgAvailableFeatures),
        ekgSubrequirementsAvailable: JSON.stringify(data.ekgSubrequirementsAvailable || markedAvailableSubrequirements),
      } as any : prev);
      toast({
        title: "Response regenerated",
        description: "Customer response updated with marked available features."
      });
    } catch (err: any) {
      console.error("Regeneration failed", err);
      toast({
        title: "Regeneration failed",
        description: err?.message || "Unable to regenerate answer",
        variant: "destructive"
      });
    } finally {
      setIsRegeneratingResponse(false);
    }
  };
  
  // Keyboard shortcuts while editing (Cmd/Ctrl+S to save, Esc to cancel)
  React.useEffect(() => {
    if (!isEditingResponse) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveEdit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelEdit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditingResponse, handleSaveEdit, handleCancelEdit]);
  
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
  const [processingIndividualItems, setProcessingIndividualItems] = useState<{[key: number]: {stage: string, model: string, vectorStores?: string[]}}>({}); 
  
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
    modelProvider: 'openai' | 'anthropic' | 'deepseek' | 'moa' | 'ekg'
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
      
      // Check if cancellation was requested
      if (isCancelling || abortControllerRef.current?.signal.aborted) {
        return false;
      }
      
      // Make API call to generate response with timeout
      // Use the global abort controller if available, otherwise create a local one
      const controller = abortControllerRef.current || new AbortController();
      
      // Use a more reliable timeout that works even when tab is in background
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<void>((_, reject) => {
        const start = Date.now();
        const timeout = 60000; // 60-second timeout for LLM calls
        const checkInterval = setInterval(() => {
          if (Date.now() - start >= timeout) {
            clearInterval(checkInterval);
            controller.abort();
            reject(new Error('Request timeout'));
          }
          if (controller.signal.aborted) {
            clearInterval(checkInterval);
          }
        }, 1000); // Check every second
        timeoutId = checkInterval as any;
      });
      
      try {
        // Make the fetch request - it will continue even when tab is in background
        const fetchPromise = fetch('/api/generate-response', {
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
        
        // Race between fetch and timeout
        const response = await Promise.race([
          fetchPromise,
          timeoutPromise.then(() => { throw new Error('Request timeout'); })
        ]);
        
        // Clear timeout interval if fetch completes first
        if (timeoutId) {
          clearInterval(timeoutId);
        }
        
        // Parse response body first to get error details
        const data = await response.json();
        
        // Check for API error response (check both HTTP status and API success flag)
        if (!response.ok || data.success === false || data.error) {
          const errorMsg = data.message || data.error || `API returned ${response.status} ${response.statusText}`;
          console.error(`[API_ERROR] Error from API for requirement ${requirementId}:`, errorMsg);
          console.error(`[API_ERROR] HTTP Status:`, response.status);
          console.error(`[API_ERROR] Full API response:`, JSON.stringify(data, null, 2));
          if (data.vectorStoreCount !== undefined) {
            console.error(`[API_ERROR] Vector store count attempted:`, data.vectorStoreCount);
            console.error(`[API_ERROR] Vector store IDs attempted:`, data.vectorStoreIds);
          }
          throw new Error(errorMsg);
        }
        
        // Return data object to include vector store names for progress display
        return data;
      } catch (err) {
        // Clear timeout interval on error
        if (timeoutId) {
          clearInterval(timeoutId);
        }
        // Handle abort error specifically
        if (err instanceof Error && (err.name === 'AbortError' || err.message === 'Request timeout')) {
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
        let errMsg = `Failed to generate response: ${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson?.message) errMsg = errJson.message;
        } catch (_err) {
          // ignore parse failure
        }
        throw new Error(errMsg);
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
      
      // Update progress with vector store names if available (for EKG)
      if (data.vectorStoreNames && Array.isArray(data.vectorStoreNames) && data.vectorStoreNames.length > 0) {
        setProcessingIndividualItems(prev => ({
          ...prev,
          [requirementId]: { 
            ...prev[requirementId], 
            stage: `Using vector stores: ${data.vectorStoreNames.join(', ')}`,
            vectorStores: data.vectorStoreNames
          }
        }));
      }
      
      // Update the selected response with the generated response
      if (selectedResponse && selectedResponse.id === requirementId) {
        setSelectedResponse({
          ...selectedResponse,
          finalResponse: data.finalResponse || selectedResponse.finalResponse,
          openaiResponse: data.openaiResponse || selectedResponse.openaiResponse,
          anthropicResponse: data.anthropicResponse || selectedResponse.anthropicResponse,
          deepseekResponse: data.deepseekResponse || selectedResponse.deepseekResponse,
          moaResponse: data.moaResponse || selectedResponse.moaResponse,
          modelProvider: data.modelProvider || selectedResponse.modelProvider,
          ekgStatus: (data as any).ekgStatus || (selectedResponse as any).ekgStatus,
          ekgAvailableFeatures: (data as any).ekgAvailableFeatures || (selectedResponse as any).ekgAvailableFeatures,
          ekgGapsCustomizations: (data as any).ekgGapsCustomizations || (selectedResponse as any).ekgGapsCustomizations,
          fitmentScore: (data as any).fitmentScore !== undefined ? (data as any).fitmentScore : (selectedResponse as any).fitmentScore,
          vectorStoreIds: (data as any).vectorStoreIds || (selectedResponse as any).vectorStoreIds,
          vectorStoreNames: (data as any).vectorStoreNames || (selectedResponse as any).vectorStoreNames,
          similarQuestions: (data as any).similarQuestions || selectedResponse.similarQuestions
        } as any);
        
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
                modelProvider: data.modelProvider || item.modelProvider,
                ekgStatus: (data as any).ekgStatus || (item as any).ekgStatus,
                ekgAvailableFeatures: (data as any).ekgAvailableFeatures || (item as any).ekgAvailableFeatures,
                ekgGapsCustomizations: (data as any).ekgGapsCustomizations || (item as any).ekgGapsCustomizations,
                similarQuestions: (data as any).similarQuestions || item.similarQuestions,
                vectorStoreNames: (data as any).vectorStoreNames || (item as any).vectorStoreNames
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
  
  const handleMapEvents = async (requirementId: number) => {
    if (!requirementId) return;
    try {
      setIsMappingEvents(true);
      setMappingIndividualItems(prev => ({ ...prev, [requirementId]: true }));
      
      const response = await fetch('/api/map-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId })
      });
      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (err) {
        console.error("Map events parse error:", text);
      }
      if (!response.ok || data.success === false) {
        throw new Error(data?.message || data?.error || `${response.status} ${response.statusText}`);
      }
      
      // Update state with mapped events
      if (selectedResponse && selectedResponse.id === requirementId) {
        setSelectedResponse({
          ...selectedResponse,
          eventMappings: JSON.stringify(data.eventMappings)
        });
      }
      
      // Update cache
      queryClient.setQueryData<ExcelRequirementResponse[]>(['/api/excel-requirements'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(item => {
          if (item.id === requirementId) {
            return { ...item, eventMappings: JSON.stringify(data.eventMappings) } as any;
          }
          return item;
        });
      });
      
      toast({
        title: "Events mapped",
        description: "Top events and confidence scores have been saved.",
      });
      return true;
      
    } catch (error) {
      console.error('Error mapping events:', error);
      toast({
        title: "Mapping Failed",
        description: error instanceof Error ? error.message : "Failed to map events",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsMappingEvents(false);
      setMappingIndividualItems(prev => {
        const newState = { ...prev };
        delete newState[requirementId];
        return newState;
      });
    }
  };
  
  // Cancel handler for response generation
  const handleCancelGeneration = () => {
    setIsCancelling(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    toast({
      title: "Cancelling Generation",
      description: "Stopping response generation...",
    });
  };
  
  // Optimized function to handle bulk generation of responses
  const handleGenerateResponses = async (modelProvider: 'openai' | 'anthropic' | 'deepseek' | 'moa' | 'ekg') => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one requirement to generate responses",
        variant: "destructive",
      });
      return;
    }
    
    // Reset cancel flag and create new AbortController
    setIsCancelling(false);
    abortControllerRef.current = new AbortController();
    
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
      
      // For LLM requests, we use parallel processing to maximize throughput
      // MOA makes 3 API calls per requirement, so use smaller batch size
      // Other models can handle more parallelism
      const BATCH_SIZE = modelProvider === 'moa' ? 2 : 5; // Process 5 items in parallel for most models, 2 for MOA
      
      // Cache the requirements lookup for performance
      const requirementsMap = new Map(
        excelData
          .filter(item => selectedItems.includes(item.id || 0))
          .map(item => [item.id, item])
      );
      
      // Process items in small concurrent batches
      for (let i = 0; i < selectedItems.length; i += BATCH_SIZE) {
        // Check if cancellation was requested
        if (isCancelling || abortControllerRef.current?.signal.aborted) {
          console.log('Generation cancelled by user');
          break;
        }
        
        const currentBatch = selectedItems.slice(i, i + BATCH_SIZE);
        
        // Process this batch with true parallel execution
        // Log batch start for debugging
        console.log(`[PARALLEL] Starting batch ${Math.floor(i / BATCH_SIZE) + 1} with ${currentBatch.length} items at ${new Date().toISOString()}`);
        const batchStartTime = Date.now();
        
        const batchPromises = currentBatch.map(async (requirementId, batchIndex) => {
          // Check cancellation before processing each item
          if (isCancelling || abortControllerRef.current?.signal.aborted) {
            return false;
          }
          try {
            // Process items in parallel - all items in batch start simultaneously
            const requirement = requirementsMap.get(requirementId);
            
            if (!requirement) {
              console.warn(`Requirement ID ${requirementId} not found in data cache`);
              return false;
            }
            
            const reqText = requirement.requirement || "";
            const shortText = reqText.length > 50 ? reqText.substring(0, 50) + '...' : reqText;
            const reqRfpName = requirement.rfpName || 'Unknown RFP';
            
            // Log individual item start with RFP name for validation
            const itemStartTime = Date.now();
            console.log(`[PARALLEL] Starting item ${requirementId} (RFP: ${reqRfpName}, batch index ${batchIndex}) at ${new Date().toISOString()}`);
            
            // Add this item to the individual processing indicators
            setProcessingIndividualItems(prev => ({
              ...prev,
              [requirementId]: { 
                stage: `Processing ${i + batchIndex + 1}/${totalItems} (${reqRfpName})`, 
                model: modelProvider 
              }
            }));
            
            // Generate response for this requirement (this is the actual parallel work)
            // Each requirement will use its own RFP's vector stores (validated on backend)
            const result = await generateResponseForRequirement(requirementId, modelProvider);
            
            const itemDuration = Date.now() - itemStartTime;
            console.log(`[PARALLEL] Completed item ${requirementId} (RFP: ${reqRfpName}) in ${itemDuration}ms`);
            
            // Update progress with vector store info if available (from API response)
            // The API response will include vectorStoreNames for EKG responses
            if (result && typeof result === 'object' && 'vectorStoreNames' in result) {
              const vectorStoreNames = (result as any).vectorStoreNames;
              if (Array.isArray(vectorStoreNames) && vectorStoreNames.length > 0) {
                setProcessingIndividualItems(prev => ({
                  ...prev,
                  [requirementId]: { 
                    ...prev[requirementId], 
                    stage: `Using: ${vectorStoreNames.join(', ')}`,
                    vectorStores: vectorStoreNames
                  }
                }));
              }
            }
            
            // Invalidate cache after each successful generation to update UI immediately
            // result can be true, false, or an object with response data
            const success = result === true || (result && typeof result === 'object' && result.success !== false);
            if (success) {
              await queryClient.invalidateQueries({ queryKey: ['/api/excel-requirements'] });
            }
            
            return success;
          } catch (error) {
            console.error(`[BATCH_ERROR] Error in batch processing for req ${requirementId}:`, error);
            // Show error toast for individual item failures
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast({
              title: `Generation Failed for Requirement ${requirementId}`,
              description: errorMessage,
              variant: "destructive",
            });
            return false;
          }
        });
        
        // Wait for the current batch to complete - all items process in parallel
        const batchResults = await Promise.all(batchPromises);
        const batchDuration = Date.now() - batchStartTime;
        console.log(`[PARALLEL] Completed batch ${Math.floor(i / BATCH_SIZE) + 1} in ${batchDuration}ms (${currentBatch.length} items processed in parallel)`);
        
        // Check if cancelled during batch processing
        if (isCancelling || abortControllerRef.current?.signal.aborted) {
          console.log('Generation cancelled during batch processing');
          break;
        }
        
        // Count successes in this batch
        successCount += batchResults.filter(Boolean).length;
        
        // Update progress counter
        setBulkGenerationProgress(prev => ({
          ...prev,
          completed: Math.min(prev.completed + currentBatch.length, prev.total)
        }));
        
        // Small delay between batches to avoid overloading the server/API
        // Reduced delay since we're processing in parallel batches
        if (i + BATCH_SIZE < selectedItems.length && !isCancelling && !abortControllerRef.current?.signal.aborted) {
          // Only a brief delay between batches to prevent API rate limiting
          await new Promise<void>(resolve => {
            const start = Date.now();
            const delay = 200; // Reduced from 500ms since we're using parallel processing
            const checkInterval = setInterval(() => {
              // Check actual elapsed time, not just interval count
              const elapsed = Date.now() - start;
              if (elapsed >= delay) {
                clearInterval(checkInterval);
                resolve();
              }
              // Also check if cancelled
              if (isCancelling || abortControllerRef.current?.signal.aborted) {
                clearInterval(checkInterval);
                resolve();
              }
            }, Math.min(50, delay / 4)); // Check frequently but not too often
          });
        }
      }
      
      // If cancelled, show cancellation message
      if (isCancelling || abortControllerRef.current?.signal.aborted) {
        toast({
          title: "Generation Cancelled",
          description: `Stopped after generating ${successCount} out of ${totalItems} responses.`,
          variant: "default",
        });
        // Invalidate cache to refresh UI
        await queryClient.invalidateQueries({ queryKey: ['/api/excel-requirements'] });
        await refetch();
        return;
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
      // Reset cancel flag
      setIsCancelling(false);
      abortControllerRef.current = null;
      
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
  
  // Lightweight consistency check to flag potential wording and placeholder issues before export
  const runConsistencyCheck = () => {
    const selectedData = excelData.filter(item => selectedItems.includes(item.id || 0));
    if (!selectedData.length) {
      toast({
        title: "No Data Selected",
        description: "Select at least one response to run the check.",
        variant: "destructive",
      });
      return;
    }
    
    const forbidden = ["lorem ipsum", "tbd", "to be decided", "dummy text"];
    const tenseHints = ["will ", "shall ", "plan to "];
    
    const findings: string[] = [];
    selectedData.forEach((item) => {
      const text = (item.finalResponse || "").toLowerCase();
      const hits = forbidden.filter((f) => text.includes(f));
      if (hits.length) {
        findings.push(`ID ${item.id}: contains placeholder (${hits.join(", ")})`);
      }
      const tenseHits = tenseHints.filter((f) => text.includes(f));
      if (tenseHits.length) {
        findings.push(`ID ${item.id}: future-tense phrasing (${tenseHits.join(", ")})`);
      }
    });
    
    if (!findings.length) {
      toast({
        title: "Consistency Check Passed",
        description: "No placeholders or tense issues found in selected responses.",
      });
    } else {
      toast({
        title: "Consistency Check Findings",
        description: findings.slice(0, 4).join(" | ") + (findings.length > 4 ? ` (+${findings.length - 4} more)` : ""),
        variant: "destructive",
      });
    }
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
  
  const handleExportDocx = async () => {
    const selectedData = excelData.filter(item => selectedItems.includes(item.id || 0));
    
    if (selectedData.length === 0) {
      toast({
        title: "No Data Found",
        description: "Select at least one item to export.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await downloadDocxFile(selectedData, "rfp-responses.docx");
      toast({
        title: "Word Export Ready",
        description: `${selectedData.length} items exported to Word.`,
      });
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to generate Word file.",
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

  const handleExportEventMappings = () => {
    const selectedData = excelData.filter(item => selectedItems.includes(item.id || 0));

    if (selectedData.length === 0) {
      toast({
        title: "No Data Found",
        description: "Select at least one item to export event mappings.",
        variant: "destructive"
      });
      return;
    }

    try {
      const filename = `event-mapping-${new Date().toISOString().split('T')[0]}.csv`;
      downloadEventMappingCsv(selectedData, filename);
      toast({
        title: "Event Mapping Exported",
        description: `${selectedData.length} items exported to ${filename}`,
      });
    } catch (error) {
      console.error('Error exporting event mapping CSV:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to generate event mapping CSV.",
        variant: "destructive"
      });
    }
  };

  // Helper function to parse subrequirements for export
  const parseSubreqsForExport = (value: any): any[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Helper function to parse string arrays for export
  const parseStrArrayForExport = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => String(v));
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((v: any) => String(v)) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Helper function to parse number
  const parseNumForExport = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    const num = typeof value === 'string' ? Number(value) : value;
    if (typeof num === 'number' && !Number.isNaN(num)) return num;
    return null;
  };

  // Function to export selected items as EKG Assessment Excel
  const handleExportEkgAssessments = async () => {
    const selectedData = excelData.filter(item => selectedItems.includes(item.id || 0));

    if (selectedData.length === 0) {
      toast({
        title: "No Data Found",
        description: "Select at least one item to export EKG assessments.",
        variant: "destructive"
      });
      return;
    }

    // Check if any selected items have EKG data
    const itemsWithEkg = selectedData.filter(item => 
      (item as any).ekgStatus || 
      (item as any).ekgAvailableFeatures || 
      (item as any).ekgSubrequirements
    );

    if (itemsWithEkg.length === 0) {
      toast({
        title: "No EKG Data",
        description: "None of the selected items have EKG assessment data. Generate EKG responses first.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get RFP name and creator from first item
      const rfpNames = new Set(selectedData.map(item => item.rfpName).filter(Boolean));
      const rfpName = rfpNames.size === 1 ? Array.from(rfpNames)[0] || "Unknown RFP" : `Multiple RFPs (${rfpNames.size})`;
      
      const creators = new Set(selectedData.map(item => item.uploadedBy).filter(Boolean));
      const creatorName = creators.size === 1 ? Array.from(creators)[0] || "Unknown" : `Multiple (${creators.size})`;

      // Build export data structure with original items for event mapping
      const exportData: MultiEkgExportData & { originalItems?: typeof selectedData } = {
        rfpName,
        creatorName,
        originalItems: selectedData,  // Pass original items for event mapping data
        items: selectedData.map(item => {
          const subreqs = parseSubreqsForExport((item as any).ekgSubrequirements);
          const fitmentRaw = parseNumForExport((item as any).ekgOverallFitmentPercentage);
          const fitmentFromScore = parseNumForExport((item as any).fitmentScore);
          const fitmentPercentage = fitmentRaw !== null 
            ? Math.round(fitmentRaw) 
            : (fitmentFromScore !== null ? Math.round(fitmentFromScore * 100) : null);

          return {
            requirementId: item.id || 0,
            requirementText: item.requirement || '',
            category: item.category || 'Uncategorized',
            ekgStatus: String((item as any).ekgStatus || '').replace('_', ' '),
            fitmentPercentage,
            response: (item as any).ekgCustomerResponse || item.finalResponse || '',
            availableFeatures: parseStrArrayForExport((item as any).ekgAvailableFeatures),
            gapsCustomizations: parseStrArrayForExport((item as any).ekgGapsCustomizations),
            subrequirements: subreqs.map((sr: any, idx: number) => ({
              id: sr?.id || `SR${idx + 1}`,
              title: sr?.title || sr?.description || '',
              status: (sr?.status || '').replace('_', ' '),
              weight: parseNumForExport(sr?.weight),
              fitment: parseNumForExport(sr?.fitment_percentage),
              integrationRelated: Boolean(sr?.integration_related),
              reportingRelated: Boolean(sr?.reporting_related),
              customizationNotes: sr?.customization_notes || '',
              referencesCount: Array.isArray(sr?.references) ? sr.references.length : 0
            }))
          };
        })
      };

      const filename = `ekg-assessment-${rfpName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
      await downloadMultiEkgAssessmentExcel(exportData, filename);

      toast({
        title: "EKG Assessment Export",
        description: `${selectedData.length} items exported to Excel.`,
      });
    } catch (error) {
      console.error('Error exporting EKG assessments:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export EKG assessments.",
        variant: "destructive"
      });
    }
  };
  
  const handleExportPdf = () => {
    const selectedData = excelData.filter(item => selectedItems.includes(item.id || 0));
    if (!selectedData.length) {
      toast({
        title: "No Data Found",
        description: "Select at least one item to export.",
        variant: "destructive"
      });
      return;
    }
    const markdownContent = generateMarkdownContent(selectedData);
    const win = window.open("", "_blank");
    if (!win) {
      toast({
        title: "Popup Blocked",
        description: "Allow popups to generate PDF/print.",
        variant: "destructive"
      });
      return;
    }
    win.document.write(`<pre style="font-family:Inter,Arial,sans-serif; white-space:pre-wrap; font-size:14px; line-height:1.6; padding:16px;">${markdownContent.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>`);
    win.document.close();
    win.focus();
    win.print();
    toast({
      title: "Print/PDF Ready",
      description: "Use your browser print dialog to save as PDF.",
    });
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
          let errMsg = `Failed to generate response for requirement ${requirement.id}`;
          try {
            const errJson = await response.json();
            if (errJson?.message) errMsg = errJson.message;
          } catch (_err) {
            // ignore parse failure
          }
          throw new Error(errMsg);
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
            modelProvider: result.modelProvider || selectedResponse.modelProvider,
            ekgStatus: (result as any).ekgStatus || (selectedResponse as any).ekgStatus,
            ekgAvailableFeatures: (result as any).ekgAvailableFeatures || (selectedResponse as any).ekgAvailableFeatures,
            ekgGapsCustomizations: (result as any).ekgGapsCustomizations || (selectedResponse as any).ekgGapsCustomizations,
            fitmentScore: (result as any).fitmentScore !== undefined ? (result as any).fitmentScore : (selectedResponse as any).fitmentScore,
            similarQuestions: (result as any).similarQuestions || selectedResponse.similarQuestions,
            vectorStoreNames: (result as any).vectorStoreNames || (selectedResponse as any).vectorStoreNames
          } as any);
          
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
      case 'generate-ekg':
        handleGenerateResponses('ekg');
        break;
      case 'print':
        handleExportToMarkdown();
        break;
      case 'excel':
        handleExportToExcel();
        break;
      case 'event-mapping-csv':
        handleExportEventMappings();
        break;
      case 'ekg-assessment':
        handleExportEkgAssessments();
        break;
      case 'mail':
        handleEmailMarkdown();
        break;
      case 'whatsapp':
        handleShareViaWhatsApp();
        break;
      case 'consistency-check':
        runConsistencyCheck();
        break;
      case 'map-events':
        mapEventsForBulk();
        break;
      case 'delete':
        setShowDeleteDialog(true);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };
  
  const mapEventsForBulk = async () => {
    setIsMappingEvents(true);
    let success = 0;
    for (const id of selectedItems) {
      const ok = await handleMapEvents(id);
      if (ok !== false) success++;
    }
    setIsMappingEvents(false);
    // Clear mapping state after a delay
    setTimeout(() => {
      setMappingIndividualItems({});
    }, 1000);
    toast({
      title: "Mapping complete",
      description: `Mapped events for ${success} of ${selectedItems.length} items.`
    });
  };

  const handleDeleteRequirements = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one requirement to delete",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      let response: Response;
      try {
        response = await fetch('/api/excel-requirements/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedItems }),
        });
      } catch (networkError: any) {
        // Handle network errors (server not reachable, CORS, etc.)
        console.error('Network error during delete:', networkError);
        throw new Error(`Failed to connect to server: ${networkError.message || 'Network error'}`);
      }

      if (!response.ok) {
        // Try to parse as JSON, but handle HTML error pages
        let errorMessage = 'Failed to delete requirements';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else {
            // If it's HTML or other format, read as text
            const text = await response.text();
            errorMessage = `Server error (${response.status}): ${text.substring(0, 100)}`;
          }
        } catch (parseError) {
          errorMessage = `Server error (${response.status}). Please check server logs.`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Close the dialog
      setShowDeleteDialog(false);
      
      // Clear selected items
      setSelectedItems([]);
      setSelectAll(false);
      
      // Close response dialog if a deleted item was being viewed
      if (selectedResponseId && selectedItems.includes(selectedResponseId)) {
        setShowResponseDialog(false);
        setSelectedResponse(null);
        setSelectedResponseId(null);
      }
      
      // Invalidate and refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/excel-requirements'] });
      
      toast({
        title: "Requirements Deleted",
        description: `Successfully deleted ${result.deletedCount} requirement(s) and all associated data (answers, references, fitment scores).`,
      });
    } catch (error) {
      console.error('Error deleting requirements:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete requirements. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 p-3 shadow-md border-b border-slate-200 dark:border-slate-700" role="status" aria-live="polite" aria-atomic="true">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3 flex-1">
                <Loader2 className="animate-spin h-5 w-5 text-primary" aria-hidden="true" />
                <p className="font-medium text-sm">
                  Generating responses with {bulkGenerationProgress.model} for {bulkGenerationProgress.completed}/{bulkGenerationProgress.total} requirements
                  {bulkGenerationProgress.model?.toLowerCase() === 'ekg' && ' (using bound vector stores per RFP)'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelGeneration}
                disabled={isCancelling}
                className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/40"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <CloseIcon className="h-4 w-4 mr-1.5" />
                    <span>Cancel</span>
                  </>
                )}
              </Button>
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
      <div className="sticky top-0 z-30 bg-slate-50 dark:bg-slate-900 py-3 px-4 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-10 shadow-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">Generate Responses</h1>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="header-rfp-select" className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  RFP
                </Label>
                <Select
                  value={filters.rfpName}
                  onValueChange={(value) => setFilters({...filters, rfpName: value})}
                >
                  <SelectTrigger
                    id="header-rfp-select"
                    className="h-9 w-[180px] bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                  >
                    <SelectValue placeholder="All RFPs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All RFPs</SelectItem>
                    {uniqueRfpNames.filter(name => name).map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
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
            
            {/* Guided Walkthrough Button */}
            <Button 
              size="sm" 
              className="h-8"
              variant="outline"
              onClick={() => { setShowTour(!showTour); setShowTourOverlay(!showTour); setTourStep(0); }}
              title="Start guided walkthrough"
            >
              <BookOpen className="h-4 w-4 mr-1.5 text-purple-500" />
              <span>Guided Walkthrough</span>
            </Button>
            
            {/* Generate Answer and Map Events */}
            <div className="flex space-x-2">
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
                  <DropdownMenuItem onClick={() => generateResponse('ekg')} className="gap-2">
                    <Network className="h-4 w-4 text-purple-500" />
                    <span>EKG (OpenAI)</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleBulkAction('generate-moa')} className="gap-2">
                    <Network className="h-4 w-4 text-green-500" />
                    <span>Mixture of Agents (MOA)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                size="sm" 
                className="h-8"
                variant="outline"
                disabled={selectedItems.length === 0 || isMappingEvents}
                onClick={() => handleBulkAction('map-events')}
              >
                {isMappingEvents ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4 mr-1.5 text-blue-500" />
                )}
                <span>Map Events</span>
              </Button>
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportToMarkdown} className="gap-2">
                  <Printer className="h-4 w-4" />
                  <span>Markdown</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportToExcel} className="gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Excel</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf} className="gap-2">
                  <Printer className="h-4 w-4 text-amber-500" />
                  <span>PDF (print)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportDocx} className="gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span>Word (branded)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportEventMappings} className="gap-2">
                  <MapPin className="h-4 w-4 text-purple-500" />
                  <span>Event mapping (csv)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportEkgAssessments} className="gap-2">
                  <Activity className="h-4 w-4 text-purple-600" />
                  <span>EKG Assessment (Excel)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEmailMarkdown} className="gap-2">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('whatsapp')} className="gap-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <span>WhatsApp</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction('consistency-check')} className="gap-2">
                  <CheckSquare className="h-4 w-4 text-amber-500" />
                  <span>Consistency check</span>
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
            
            {/* Delete Button */}
            <Button 
              size="sm" 
              onClick={() => handleBulkAction('delete')}
              className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white"
              variant="default"
              title="Delete selected requirements"
              disabled={selectedItems.length === 0 || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  <span>Delete</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Lightweight tour mode - Steps only (button moved to header) */}
      {showTour && (
        <Card className="shadow-sm">
          <CardContent className="py-4 sm:py-5">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Guided walkthrough</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">Follow the core workflow: upload → select → generate → export.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setShowTour(false); setShowTourOverlay(false); setTourStep(0); }}>
                Hide steps
              </Button>
            </div>
            <div className="grid md:grid-cols-4 gap-3 text-sm">
              <div className="p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <p className="font-semibold">1. Upload</p>
                <p className="text-slate-600 dark:text-slate-300">Go to Upload, grab the sample file, map columns, and ingest.</p>
              </div>
              <div className="p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <p className="font-semibold">2. Select & find</p>
                <p className="text-slate-600 dark:text-slate-300">Pick requirements, run "Past responses" to populate references.</p>
              </div>
              <div className="p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <p className="font-semibold">3. Generate & compare</p>
                <p className="text-slate-600 dark:text-slate-300">Generate with your chosen model, compare variants, tweak text.</p>
              </div>
              <div className="p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <p className="font-semibold">4. Export</p>
                <p className="text-slate-600 dark:text-slate-300">Export markdown/Excel/Word; run consistency check before sending.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tour overlay */}
      {showTourOverlay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-lg w-full p-6 relative">
            <button
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              aria-label="Close tour"
              onClick={() => setShowTourOverlay(false)}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            <p className="text-xs uppercase tracking-wide text-slate-500">Tour step {tourStep + 1} of {tourSteps.length}</p>
            <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-1">{tourSteps[tourStep].title}</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{tourSteps[tourStep].description}</p>
            <div className="flex items-center justify-between mt-6">
              <Button variant="ghost" size="sm" onClick={() => {
                if (tourStep === 0) {
                  setShowTourOverlay(false);
                } else {
                  setTourStep(Math.max(0, tourStep - 1));
                }
              }}>
                {tourStep === 0 ? 'Skip' : 'Back'}
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {tourSteps.map((_, idx) => (
                    <span key={idx} className={`h-2 w-2 rounded-full ${idx === tourStep ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  ))}
                </div>
                <Button size="sm" onClick={() => {
                  if (tourStep === tourSteps.length - 1) {
                    setShowTourOverlay(false);
                  } else {
                    setTourStep(tourStep + 1);
                  }
                }}>
                  {tourStep === tourSteps.length - 1 ? 'Done' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      <HelpTooltip text="Use these filters to narrow down the list of requirements based on different criteria. You can filter by category, response status, and requirement ID. Use the RFP selector in the header to switch documents." />
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
                        <DropdownMenuItem onClick={() => generateResponse('ekg')} className="gap-2">
                          <Network className="h-4 w-4 text-purple-500" />
                          <span>EKG (OpenAI)</span>
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
                      <Accordion type="single" collapsible className="w-full">
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
                              <Hash className="h-4 w-4 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                              <span className="text-sm font-medium">Requirement ID</span>
                              {filters.requirementId !== '' && (
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  {filters.requirementId}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 py-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500 dark:text-slate-400">
                                Filter by Requirement ID
                              </Label>
                              <Input
                                type="text"
                                placeholder="Enter requirement ID"
                                value={filters.requirementId}
                                onChange={(e) => setFilters({...filters, requirementId: e.target.value})}
                                className="h-8 text-xs"
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                          <Label htmlFor="filter-requirement-id" className="text-sm">Requirement ID</Label>
                          <HelpTooltip text="Filter by requirement ID. Enter a specific ID or partial ID to find matching requirements." />
                        </div>
                        <Input
                          id="filter-requirement-id"
                          type="text"
                          placeholder="Enter requirement ID"
                          value={filters.requirementId}
                          onChange={(e) => setFilters({...filters, requirementId: e.target.value})}
                          className="w-full"
                        />
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
                        requirementId: '',
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
                        <DropdownMenuItem onClick={() => handleBulkAction('event-mapping-csv')} className="gap-2">
                          <MapPin className="h-4 w-4 text-purple-500" />
                          <span>Event mapping (csv)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkAction('ekg-assessment')} className="gap-2">
                          <Activity className="h-4 w-4 text-purple-600" />
                          <span>EKG Assessment (Excel)</span>
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
                      mappingIndividualItems={mappingIndividualItems}
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
      
      {/* MOBILE: Detail Dialog - responsive width - expanded for better visibility */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-7xl lg:max-w-[90vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-slate-900 dark:text-white">Response Details</DialogTitle>
                <DialogDescription className="text-slate-700 dark:text-slate-300">
                  View complete response and reference information
                </DialogDescription>
              </div>
              
              {/* Generate Answer and Map Events */}
              {selectedResponse && selectedResponseId && (
                <div className="flex items-center gap-2">
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
                  
                  {/* Map Events Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-3 flex gap-2 items-center" 
                    disabled={isMappingEvents}
                    onClick={() => handleMapEvents(selectedResponseId)}
                  >
                    {isMappingEvents ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Mapping...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <span>Map Events</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          
          {selectedResponse && (
            <div className="space-y-5 py-3">
              <div className="flex space-x-4 mb-5">
                <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-md flex-1">
                  <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">ID:</h4>
                  <p className="text-slate-900 dark:text-slate-100 font-medium text-base">{selectedResponse.id}</p>
                </div>
                <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-md flex-1">
                  <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Category:</h4>
                  <p className="text-slate-900 dark:text-slate-100 font-medium text-base">{selectedResponse.category}</p>
                </div>
              </div>
              
              <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-md mb-5">
                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Original Requirement:</h4>
                <p className="text-slate-900 dark:text-slate-100 text-base leading-relaxed">{selectedResponse.requirement}</p>
              </div>
              
              {/* Show the question that was actually sent to LLM */}
              <div className="p-5 bg-blue-50 dark:bg-blue-900/30 rounded-md mb-5 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  Question Sent to LLM:
                  {selectedResponse.elaboratedRequirement && selectedResponse.elaboratedRequirement !== selectedResponse.requirement && (
                    <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">(Elaborated)</span>
                  )}
                </h4>
                <p className="text-slate-900 dark:text-slate-100 text-base leading-relaxed">
                  {selectedResponse.elaboratedRequirement || selectedResponse.requirement}
                </p>
              </div>
              
              <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-md mb-5">
                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">AI Model Used:</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-slate-900 dark:text-slate-100">
                    {selectedResponse.modelProvider === "openai" ? "OpenAI" :
                     selectedResponse.modelProvider === "anthropic" ? "Anthropic/Claude" :
                     selectedResponse.modelProvider === "deepseek" ? "DeepSeek" :
                     selectedResponse.modelProvider === "moa" ? "Mixture of Agents (MOA)" :
                     selectedResponse.modelProvider === "ekg" ? "OpenAI EKG" :
                     selectedResponse.modelProvider || "Not specified"}
                  </p>
                  {/* Show Event Mapped status */}
                  {(selectedResponse as any).eventMappings && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-200 border-purple-200 dark:border-purple-800">
                      Event Mapped
                    </Badge>
                  )}
                  {/* Show mapping progress */}
                  {selectedResponseId && mappingIndividualItems[selectedResponseId] && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-200 border-purple-200 dark:border-purple-800">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
                      Mapping events...
                    </Badge>
                  )}
                </div>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger 
                    value="response" 
                    className="flex items-center gap-2"
                    disabled={!displayResponseText}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Response
                    {!displayResponseText && <span className="ml-1 text-xs opacity-60">(Not available)</span>}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="references" 
                        className="flex items-center gap-2"
                        disabled={!selectedResponse?.similarQuestions}
                      >
                        <BookOpen className="h-4 w-4" />
                        <span className="flex items-center gap-2">
                          <span>References</span>
                          {selectedResponse?.modelProvider === 'ekg' && (
                            <span className="flex items-center gap-1">
                              {(ekgVectorStoreNames.length ? ekgVectorStoreNames : ['Product Documentation Store', 'Pre-Sales Response Store']).map((name, idx) => (
                                <Badge key={`${name}-${idx}`} variant="outline" className="text-[10px] bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                                  {name}
                                </Badge>
                              ))}
                            </span>
                          )}
                        </span>
                    {referenceCount > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {referenceCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="response">
                  {eventMappingsData && (
                    <div className="grid sm:grid-cols-3 gap-3 mb-4">
                      {['event1','event2','event3'].map((key) => {
                        const item = (eventMappingsData as any)[key];
                        return (
                          <div key={key} className="p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <p className="text-xs uppercase tracking-wide text-slate-500">{key.toUpperCase()}</p>
                            {item ? (
                              <>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.name || 'Unnamed'}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300">Confidence: {(item.confidence ?? 0).toFixed(2)}</p>
                              </>
                            ) : (
                              <p className="text-sm text-slate-500">No event</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {(selectedResponse?.modelProvider === 'ekg' || selectedResponse?.ekgStatus || ekgAvailableFeatures.length > 0 || ekgGapsCustomizations.length > 0) && (
                    <div className="p-5 bg-purple-50 dark:bg-purple-950/30 rounded-md border border-purple-200 dark:border-purple-800 mb-5">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-100">EKG Assessment</h4>
                        {selectedResponse?.ekgStatus && (
                          <Badge variant="outline" className="text-xs bg-white/60 dark:bg-purple-900/60 text-purple-800 dark:text-purple-100 border-purple-300 dark:border-purple-700">
                            {String(selectedResponse.ekgStatus).replace('_', ' ')}
                          </Badge>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1"
                            onClick={() => {
                              const assessmentData = {
                                requirementText: selectedResponse?.requirement || '',
                                ekgStatus: String(selectedResponse?.ekgStatus || '').replace('_', ' '),
                                fitmentPercentage: ekgOverallFitmentPercentage,
                                availableFeatures: ekgAvailableFeatures,
                                gapsCustomizations: ekgGapsCustomizations,
                                subrequirements: ekgSubrequirements.map((sr: any, idx: number) => ({
                                  id: sr?.id || `SR${idx + 1}`,
                                  title: sr?.title || sr?.description || '',
                                  status: (sr?.status || '').replace('_', ' '),
                                  weight: parseNumberOrNull(sr?.weight),
                                  fitment: parseNumberOrNull(sr?.fitment_percentage),
                                  integrationRelated: Boolean(sr?.integration_related),
                                  reportingRelated: Boolean(sr?.reporting_related),
                                  customizationNotes: sr?.customization_notes || '',
                                  referencesCount: Array.isArray(sr?.references) ? sr.references.length : 0
                                }))
                              };
                              downloadEkgAssessmentExcel(assessmentData, `ekg-assessment-${selectedResponse?.id || 'export'}.xlsx`);
                            }}
                            title="Download EKG Assessment as Excel"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1"
                            onClick={handleRegenerateWithAvailable}
                            disabled={isRegeneratingResponse || markedAvailableSubrequirements.length === 0}
                          >
                            {isRegeneratingResponse ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
                            <span>Regenerate answer</span>
                          </Button>
                        </div>
                        {/* Fitment Score Badge - displayed right next to status */}
                        {(() => {
                          const scorePercent = ekgOverallFitmentPercentage !== null 
                            ? ekgOverallFitmentPercentage 
                            : (selectedResponse?.fitmentScore !== null && selectedResponse?.fitmentScore !== undefined
                                ? selectedResponse.fitmentScore * 100
                                : null);
                          if (scorePercent !== null) {
                            const normalized = scorePercent / 100;
                            return (
                              <Badge 
                                variant="outline" 
                                className={`text-xs font-semibold ${
                                  normalized >= 0.8 ? 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200 border-green-300 dark:border-green-700' :
                                  normalized >= 0.5 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300 dark:border-amber-700' :
                                  'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200 border-red-300 dark:border-red-700'
                                }`}
                                title={`Fitment Score: ${scorePercent.toFixed(1)}%`}
                              >
                                Fitment: {scorePercent.toFixed(0)}%
                              </Badge>
                            );
                          } else if (selectedResponse?.ekgStatus) {
                            return (
                              <Badge 
                                variant="outline" 
                                className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                                title="Fitment score not yet calculated"
                              >
                                Fitment: Not calculated
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      {ekgAvailableFeatures.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs uppercase tracking-wide text-purple-700 dark:text-purple-200 mb-1">Available features</p>
                          <ul className="list-disc list-inside text-sm text-purple-900 dark:text-purple-50 space-y-1">
                            {ekgAvailableFeatures.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {ekgGapsCustomizations.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-purple-700 dark:text-purple-200 mb-1">Gaps / customizations</p>
                          <ul className="list-disc list-inside text-sm text-purple-900 dark:text-purple-50 space-y-1">
                            {ekgGapsCustomizations.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {ekgSubrequirements.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-wide text-purple-700 dark:text-purple-200 mb-2">Subrequirements</p>
                          <div className="overflow-x-auto overflow-y-visible rounded-md border border-purple-200 dark:border-purple-800 bg-white/60 dark:bg-purple-900/30 max-h-[60vh]">
                            <table className="min-w-full text-xs text-left">
                              <thead className="bg-purple-100/60 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100 sticky top-0 z-10">
                                <tr>
                                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">ID</th>
                                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Title</th>
                                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Status</th>
                                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Weight</th>
                                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Fitment</th>
                                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Flags</th>
                                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Customization</th>
                                  <th className="px-4 py-2.5 font-semibold text-center whitespace-nowrap">Mark as available</th>
                                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Refs</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ekgSubrequirements.map((sr, idx) => {
                                  const srStatus = (sr?.status || '').replace('_', ' ');
                                  const fitment = parseNumberOrNull(sr?.fitment_percentage);
                                  const weight = parseNumberOrNull(sr?.weight);
                                  const integration = sr?.integration_related;
                                  const reporting = sr?.reporting_related;
                                  const customization = sr?.customization_notes || '';
                                  const refs = Array.isArray(sr?.references) ? sr.references : [];
                                  return (
                                    <tr key={`${sr?.id || idx}-${sr?.title || ''}`} className="border-t border-purple-100 dark:border-purple-800 hover:bg-purple-50/50 dark:hover:bg-purple-900/20">
                                      <td className="px-4 py-2.5 whitespace-nowrap font-medium text-purple-900 dark:text-purple-100">{sr?.id || `SR${idx + 1}`}</td>
                                      <td className="px-3 py-2 min-w-[200px] max-w-[300px] text-purple-900 dark:text-purple-50 break-words">{sr?.title || sr?.description || '—'}</td>
                                      <td className="px-4 py-2.5 whitespace-nowrap">
                                        {srStatus ? (
                                          <Badge variant="outline" className="text-[11px] bg-white/70 dark:bg-purple-900/40 border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-100">
                                            {srStatus}
                                          </Badge>
                                        ) : '—'}
                                      </td>
                                      <td className="px-4 py-2.5 whitespace-nowrap text-purple-900 dark:text-purple-50">{weight !== null ? `${weight}` : '—'}</td>
                                      <td className="px-4 py-2.5 whitespace-nowrap text-purple-900 dark:text-purple-50">{fitment !== null ? `${fitment}%` : '—'}</td>
                                      <td className="px-4 py-2.5 whitespace-nowrap text-purple-900 dark:text-purple-50 space-x-1">
                                        {integration && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100 border-blue-200 dark:border-blue-700">Integration</Badge>}
                                        {reporting && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-100 border-emerald-200 dark:border-emerald-700">Reporting</Badge>}
                                        {!integration && !reporting && '—'}
                                      </td>
                                      <td className="px-3 py-2 min-w-[200px] max-w-[300px] text-purple-900 dark:text-purple-50 break-words">{customization || (sr?.customization_required ? 'Customization required' : '—')}</td>
                                      <td className="px-4 py-2.5 text-center">
                                        <Checkbox 
                                          checked={markedAvailableSubrequirements.includes(String(sr?.id || idx + 1))}
                                          onCheckedChange={(checked) => handleToggleSubreqAvailability(String(sr?.id || idx + 1), Boolean(checked))}
                                          disabled={isUpdatingSubreqAvailability}
                                        />
                                      </td>
                                      <td className="px-4 py-2.5 whitespace-nowrap text-purple-900 dark:text-purple-50">{refs.length || '—'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      {ekgAvailableFeatures.length === 0 && ekgGapsCustomizations.length === 0 && (
                        <></>
                      )}
                    </div>
                  )}
                  <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-md mb-5">
                    {!isEditingResponse ? (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-base font-semibold text-slate-700 dark:text-slate-200">Response:</h4>
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
                          {displayResponseText && (
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {displayResponseText
                                  .replace(/\\n/g, '\n')
                                  .replace(/\\"/g, '"')
                                  .replace(/\\\\/g, '\\')}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                        {['openaiResponse','anthropicResponse','deepseekResponse','moaResponse'].some(
                          (key) => (selectedResponse as any)?.[key]
                        ) && (
                          <div className="mt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Model comparisons</h4>
                              <span className="text-xs text-slate-500">Quickly compare raw outputs</span>
                            </div>
                            <div className="grid md:grid-cols-2 gap-3">
                              {[
                                { label: 'OpenAI', value: selectedResponse?.openaiResponse },
                                { label: 'Anthropic', value: selectedResponse?.anthropicResponse },
                                { label: 'DeepSeek', value: selectedResponse?.deepseekResponse },
                                { label: 'MOA', value: selectedResponse?.moaResponse },
                              ].filter(item => item.value).map(item => (
                                <div key={item.label} className="p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{item.label}</p>
                                  <div className="text-sm text-slate-800 dark:text-slate-100 line-clamp-6">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.value || ''}</ReactMarkdown>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-slate-600 dark:text-slate-300">Insert approved snippet:</span>
                            {approvedSnippets.map((snippet, idx) => (
                              <Button
                                key={idx}
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleInsertSnippet(snippet)}
                                disabled={isSavingEdit}
                              >
                                Add #{idx + 1}
                              </Button>
                            ))}
                          </div>
                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="prose prose-slate dark:prose-invert max-w-none border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 p-3">
                              <p className="text-xs font-semibold text-slate-500 mb-2">Original</p>
                              <div className="text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                                {originalResponseText || 'No prior content'}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Requirements</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItems.length} selected requirement(s)? 
              This will permanently delete all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All AI-generated responses (OpenAI, Anthropic, DeepSeek, MOA, EKG)</li>
                <li>Reference responses</li>
                <li>Fitment scores</li>
                <li>Event mappings</li>
                <li>Similar questions</li>
              </ul>
              <strong className="block mt-3 text-red-600 dark:text-red-400">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequirements}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
