import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Link as LinkIcon, 
  Edit2, 
  Save, 
  X, 
  Loader2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

// OpenAI Responses API file_search tool has a hard limit of 2 vector stores per request
const MAX_VECTOR_STORES = 2;

interface VectorStore {
  id: string;
  name: string;
  status: string;
  fileCounts?: {
    in_progress?: number;
    completed?: number;
    failed?: number;
    cancelled?: number;
  };
  createdAt?: number;
}

interface BoundVectorStore {
  id: string;
  name: string;
  rfpName: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function BindEKG() {
  const [selectedRfpName, setSelectedRfpName] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedVectorStores, setSelectedVectorStores] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Fetch unique RFP names
  const { data: rfpNames = [] } = useQuery({
    queryKey: ['rfp-names'],
    queryFn: async () => {
      const response = await fetch('/api/excel-requirements');
      if (!response.ok) throw new Error('Failed to fetch requirements');
      const data = await response.json();
      const uniqueNames = Array.from(new Set(
        data
          .map((r: any) => r.rfpName)
          .filter((name: any): name is string => !!name && name.trim() !== '')
      )).sort();
      return uniqueNames as string[];
    },
  });

  // Fetch available vector stores
  const { data: vectorStores = [], isLoading: isLoadingStores } = useQuery<VectorStore[]>({
    queryKey: ['vector-stores'],
    queryFn: async () => {
      const response = await fetch('/api/vector-stores');
      if (!response.ok) throw new Error('Failed to fetch vector stores');
      const result = await response.json();
      return result.data || [];
    },
  });

  // Fetch bound vector stores for selected RFP
  const { data: boundStores = [], refetch: refetchBoundStores } = useQuery<BoundVectorStore[]>({
    queryKey: ['rfp-vector-stores', selectedRfpName],
    queryFn: async () => {
      if (!selectedRfpName) return [];
      const response = await fetch(`/api/rfp-vector-stores/${encodeURIComponent(selectedRfpName)}`);
      if (!response.ok) throw new Error('Failed to fetch bound vector stores');
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!selectedRfpName,
  });

  // Initialize selected stores when bound stores are loaded
  useEffect(() => {
    if (boundStores.length > 0 && !isEditMode) {
      setSelectedVectorStores(new Set(boundStores.map(bs => bs.id)));
    }
  }, [boundStores, isEditMode]);

  const handleEdit = () => {
    setIsEditMode(true);
    // Initialize with currently bound stores
    setSelectedVectorStores(new Set(boundStores.map(bs => bs.id)));
  };

  const handleCancel = () => {
    setIsEditMode(false);
    // Reset to bound stores
    setSelectedVectorStores(new Set(boundStores.map(bs => bs.id)));
  };

  const handleToggleVectorStore = (vectorStoreId: string) => {
    if (!isEditMode) return;
    
    setSelectedVectorStores(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vectorStoreId)) {
        newSet.delete(vectorStoreId);
      } else {
        // Check if we're at the limit before adding
        if (newSet.size >= MAX_VECTOR_STORES) {
          toast({
            title: 'Vector Store Limit Reached',
            description: `OpenAI's API allows a maximum of ${MAX_VECTOR_STORES} vector stores per request. Please deselect one before adding another.`,
            variant: 'destructive',
          });
          return prev; // Return unchanged set
        }
        newSet.add(vectorStoreId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!selectedRfpName) {
      toast({
        title: 'Error',
        description: 'Please select an RFP first',
        variant: 'destructive',
      });
      return;
    }

    // Warn if no vector stores selected
    if (selectedVectorStores.size === 0) {
      const confirmed = window.confirm(
        'Warning: No vector stores are selected. EKG generation will be blocked for this RFP if you save with no bindings. Do you want to continue?'
      );
      if (!confirmed) return;
    }

    setIsSaving(true);
    try {
      const vectorStoresToSave = Array.from(selectedVectorStores).map(id => {
        const store = vectorStores.find(vs => vs.id === id);
        return {
          id,
          name: store?.name || id,
        };
      });

      const response = await fetch(`/api/rfp-vector-stores/${encodeURIComponent(selectedRfpName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vectorStores: vectorStoresToSave }),
      });

      if (!response.ok) {
        throw new Error('Failed to save vector store bindings');
      }

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: result.message || 'Vector store bindings saved successfully',
        variant: result.warning ? 'default' : 'default',
      });

      if (result.warning) {
        toast({
          title: 'Warning',
          description: result.warning,
          variant: 'destructive',
        });
      }

      setIsEditMode(false);
      await refetchBoundStores();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save vector store bindings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Bind EKG Vector Stores</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Bind vector stores to RFPs for EKG response generation
        </p>
      </div>

      {/* RFP Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select RFP</CardTitle>
          <CardDescription>Choose an RFP to bind vector stores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedRfpName} onValueChange={(value) => {
                setSelectedRfpName(value);
                setIsEditMode(false);
                setSelectedVectorStores(new Set());
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an RFP" />
                </SelectTrigger>
                <SelectContent>
                  {rfpNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRfpName && !isEditMode && (
              <Button onClick={handleEdit} variant="outline" className="gap-2">
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bound Vector Stores Summary */}
      {selectedRfpName && boundStores.length > 0 && !isEditMode && (
        <Card className="border-primary bg-primary/5 dark:bg-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              Bound Vector Stores for "{selectedRfpName}"
            </CardTitle>
            <CardDescription>
              {boundStores.length} vector store{boundStores.length !== 1 ? 's' : ''} currently bound
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {boundStores.map((store) => (
                <Badge 
                  key={store.id} 
                  variant="default" 
                  className="text-sm px-3 py-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  {store.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vector Stores List */}
      {selectedRfpName && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Available Vector Stores</CardTitle>
                <CardDescription>
                  {isEditMode 
                    ? `Select vector stores to bind to this RFP (${selectedVectorStores.size}/${MAX_VECTOR_STORES} selected — OpenAI API limit)` 
                    : boundStores.length > 0
                      ? 'All available vector stores (bound stores are highlighted)'
                      : 'No vector stores are currently bound. Click "Edit" to bind vector stores.'}
                </CardDescription>
              </div>
              {isEditMode && (
                <div className="flex items-center gap-2">
                  <Button onClick={handleCancel} variant="outline" size="sm" className="gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} size="sm" className="gap-2" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStores ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : vectorStores.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No vector stores available
              </div>
            ) : (
              <div className="space-y-3">
                {vectorStores.map((store) => {
                  const isBound = boundStores.some(bs => bs.id === store.id);
                  const isSelected = selectedVectorStores.has(store.id);
                  const isDisabled = !isSelected && selectedVectorStores.size >= MAX_VECTOR_STORES;
                  
                  return (
                    <div
                      key={store.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isEditMode
                          ? isSelected
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : isDisabled
                              ? 'border-slate-200 dark:border-slate-700 opacity-40 cursor-not-allowed'
                              : 'border-slate-200 dark:border-slate-700'
                          : isBound
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : 'border-slate-200 dark:border-slate-700 opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {isEditMode && (
                          <Checkbox
                            checked={isSelected}
                            disabled={isDisabled}
                            onCheckedChange={() => handleToggleVectorStore(store.id)}
                            className="mt-1"
                          />
                        )}
                        {!isEditMode && isBound && (
                          <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-50">
                              {store.name}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {store.status}
                            </Badge>
                            {isBound && !isEditMode && (
                              <Badge variant="default" className="text-xs">
                                Bound
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                            {store.id}
                          </p>
                          {store.fileCounts && (
                            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                              {store.fileCounts.completed !== undefined && (
                                <span>Files: {store.fileCounts.completed}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Warning: Too many vector stores bound */}
      {selectedRfpName && boundStores.length > MAX_VECTOR_STORES && !isEditMode && (
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Too Many Vector Stores Bound
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200">
                  This RFP has {boundStores.length} vector stores bound, but OpenAI's API only allows a maximum of {MAX_VECTOR_STORES} per request. 
                  EKG generation will fail until you reduce the bindings. Click "Edit" to select which {MAX_VECTOR_STORES} vector stores to keep.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      {selectedRfpName && boundStores.length === 0 && !isEditMode && (
        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  No Vector Stores Bound
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  This RFP has no vector stores bound. EKG response generation will be blocked until you bind at least one vector store. Click "Edit" to bind vector stores.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

