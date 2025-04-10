import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
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
  Square,
  Check,
  Filter,
  X
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
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
  
  const isMobile = useIsMobile();
  
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
  
  // Apply filters to the data
  const filteredData = excelData.filter(row => {
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
  
  const handleBulkAction = (action: string) => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item first');
      return;
    }
    
    // Demo actions for now - would be connected to API endpoints
    switch (action) {
      case 'generate':
        console.log('Generate answers for:', selectedItems);
        alert(`Generate answers for ${selectedItems.length} selected items`);
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
                  <DropdownMenuItem onClick={() => handleBulkAction('generate')} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Answers</span>
                  </DropdownMenuItem>
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
                                <div className="text-sm text-slate-700 dark:text-slate-200 line-clamp-3">
                                  {row.finalResponse}
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
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{selectedResponse.finalResponse}</p>
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