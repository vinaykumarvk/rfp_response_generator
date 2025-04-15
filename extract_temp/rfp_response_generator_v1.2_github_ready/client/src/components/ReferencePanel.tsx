import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, BookOpen, Database, ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ReactMarkdown from 'react-markdown';

// Define the structure of reference data
interface Reference {
  id: number;
  responseId: number;
  category: string;
  requirement: string;
  response: string;
  reference?: string;
  score: number;
  timestamp?: string;
}

interface ReferencePanelProps {
  responseId?: number;
  showTitle?: boolean;
  onReferencesLoaded?: (count: number) => void;
}

export default function ReferencePanel({ responseId, showTitle = true, onReferencesLoaded }: ReferencePanelProps) {
  const [loading, setLoading] = useState(false);
  const [references, setReferences] = useState<Reference[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Memoize the fetch references function to avoid recreating it on each render
  // Improved with better error handling and retry logic
  const fetchReferences = useCallback(async (id: number, signal: AbortSignal) => {
    // Maximum number of retries for transient errors
    const MAX_RETRIES = 1;
    let retries = 0;
    
    while (retries <= MAX_RETRIES) {
      try {
        // Add timeout for fetch operations that hang
        const response = await fetch(`/api/excel-requirements/${id}/references`, {
          signal: signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch reference data: ${response.status} ${response.statusText}`);
        }
        
        // Parse response safely
        const text = await response.text();
        if (!text) {
          return []; // Return empty array if no response body
        }
        
        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.error("Failed to parse reference data:", parseError);
          throw new Error("Invalid response format from server");
        }
      } catch (e) {
        // Only retry for certain errors that might be transient
        const isTransientError = 
          e instanceof Error && 
          !(e.name === 'AbortError') && 
          (e.message.includes('network') || e.message.includes('timeout') || e.message.includes('failed'));
          
        if (isTransientError && retries < MAX_RETRIES) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 800)); // Wait before retry
          console.log(`Retrying fetch (${retries}/${MAX_RETRIES})...`);
          continue;
        }
        
        // Re-throw if we can't retry
        throw e;
      }
    }
    
    // This should never be reached but TypeScript needs a return
    return [];
  }, []);
  
  // Effect to load references when responseId changes
  useEffect(() => {
    // Skip if no responseId
    if (!responseId) {
      return;
    }
    
    // Set up the request state
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    // Create abort controller for cleanup
    const controller = new AbortController();
    // Use a safer approach for the timeout
    const timeoutId = setTimeout(() => {
      try {
        controller.abort();
      } catch (err) {
        console.warn("Could not abort fetch operation:", err);
      }
    }, 10000); // 10-second timeout
    
    // Make the request
    fetchReferences(responseId, controller.signal)
      .then(data => {
        if (isMounted) {
          setReferences(data || []);
          clearTimeout(timeoutId);
        }
      })
      .catch(e => {
        if (isMounted) {
          // Safe type handling for the error
          const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
          const isAbortError = e instanceof Error && e.name === 'AbortError';
          
          if (isAbortError) {
            setError("Request timed out. Please try again.");
          } else {
            console.error("Error fetching references:", errorMessage);
            setError("Could not load reference information");
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    
    // Cleanup function with improved error handling
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      try {
        controller.abort();
      } catch (err) {
        console.warn("Could not abort fetch operation during cleanup:", err);
      }
      setReferences([]);
    };
  }, [responseId, fetchReferences]);

  if (!responseId) {
    return null;
  }

  // Memoize the loading state component to avoid unnecessary re-renders
  const renderLoading = useCallback(() => (
    <div className="space-y-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-4 w-2/4" />
      <Skeleton className="h-20 w-full" />
    </div>
  ), []);

  // Memoize the error component, only recreate when error changes
  const renderError = useCallback(() => (
    <div className="text-center py-6 text-slate-600 dark:text-slate-300">
      <Database className="h-10 w-10 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
      <p>{error}</p>
    </div>
  ), [error]);

  // Memoize the empty state component since it never changes
  const renderNoReferences = useCallback(() => (
    <div className="text-center py-6 text-slate-600 dark:text-slate-300">
      <BookOpen className="h-10 w-10 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
      <p>No reference information available for this response</p>
    </div>
  ), []);

  // Create an optimized individual reference item component
  const ReferenceItem = React.memo(({ reference }: { reference: Reference }) => (
    <div className="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={`reference-${reference.id}`} className="border-none">
          <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800">
            <div className="flex items-center gap-3 text-left">
              <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    Reference {reference.reference || `#${reference.id}`}
                  </span>
                  <Badge variant="outline" className="h-5 text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                    Score: {(reference.score * 100).toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {reference.category}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="px-4 space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700">
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Requirement:</span>
                <p className="text-sm text-slate-800 dark:text-slate-100">{reference.requirement}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700">
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Response Text:</span>
                <div className="prose prose-sm max-w-none text-slate-800 dark:text-slate-100">
                  <ReactMarkdown>{reference.response}</ReactMarkdown>
                </div>
              </div>
              {reference.reference && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <ExternalLink className="h-4 w-4" />
                  <span>Reference ID: {reference.reference}</span>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ));

  // Memoize the references list, only recreate when references array changes
  const renderReferences = useCallback(() => (
    <div className="space-y-4">
      {references.map((reference) => (
        <ReferenceItem key={reference.id} reference={reference} />
      ))}
    </div>
  ), [references]);

  // Notify parent component about the reference count
  useEffect(() => {
    if (onReferencesLoaded) {
      onReferencesLoaded(references.length);
    }
  }, [references.length, onReferencesLoaded]);

  return (
    <Card className="mt-6">
      {showTitle && (
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">Reference Information</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Historical reference data used to generate this response.
          </p>
        </div>
      )}
      
      <CardContent className="p-6">
        {loading ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : references.length === 0 ? (
          renderNoReferences()
        ) : (
          renderReferences()
        )}
      </CardContent>
    </Card>
  );
}