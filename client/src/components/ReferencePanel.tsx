import { useEffect, useState } from "react";
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

  useEffect(() => {
    const fetchReferences = async () => {
      if (!responseId) {
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`/api/excel-requirements/${responseId}/references`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error("Failed to fetch reference data");
        }
        
        const data = await response.json();
        setReferences(data);
      } catch (e) {
        // Safe type handling for the error
        const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
        const isAbortError = e instanceof Error && e.name === 'AbortError';
        
        if (isAbortError) {
          setError("Request timed out. Please try again.");
        } else {
          console.error("Error fetching references:", errorMessage);
          setError("Could not load reference information");
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchReferences();
    
    // Cleanup function
    return () => {
      setReferences([]);
    };
  }, [responseId]);

  if (!responseId) {
    return null;
  }

  const renderLoading = () => (
    <div className="space-y-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-4 w-2/4" />
      <Skeleton className="h-20 w-full" />
    </div>
  );

  const renderError = () => (
    <div className="text-center py-6 text-slate-600 dark:text-slate-300">
      <Database className="h-10 w-10 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
      <p>{error}</p>
    </div>
  );

  const renderNoReferences = () => (
    <div className="text-center py-6 text-slate-600 dark:text-slate-300">
      <BookOpen className="h-10 w-10 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
      <p>No reference information available for this response</p>
    </div>
  );

  const renderReferences = () => (
    <div className="space-y-4">
      {references.map((reference) => (
        <div key={reference.id} className="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
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
      ))}
    </div>
  );

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