import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, ArrowLeft, BookOpen, Eye, RefreshCcw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import ReferencePanel from '@/components/ReferencePanel';
import { ExcelRequirementResponse } from '@shared/schema';

export default function ViewData() {
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<ExcelRequirementResponse | null>(null);
  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('response');
  const isMobile = useIsMobile();
  
  const { data: excelData = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['/api/excel-requirements'],
  });
  
  const handleViewResponse = (row: ExcelRequirementResponse) => {
    setSelectedResponse(row);
    setSelectedResponseId(row.id);
    setShowResponseDialog(true);
  };
  
  const handleRefresh = () => {
    refetch();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">View Uploaded Requirements</h1>
      </div>
      
      <div className="pt-2">
        <Card>
          <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Requirements Data</h2>
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
          
          <CardContent className={isMobile ? "p-4" : "p-0 overflow-auto"}>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : excelData.length > 0 ? (
              <div className={isMobile ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
                {excelData.map((row: ExcelRequirementResponse, index: number) => (
                  <Card key={row.id || index} className="overflow-hidden h-full">
                    <CardContent className="p-0 h-full flex flex-col">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-slate-800 dark:text-slate-100">{row.category}</div>
                          {row.rating !== undefined && (
                            <div className="text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                              Rating: {row.rating}/5
                            </div>
                          )}
                        </div>
                        <div className="text-sm line-clamp-2 mt-1 text-slate-600 dark:text-slate-300">{row.requirement}</div>
                      </div>
                      
                      <div className="p-4 flex-1 flex flex-col">
                        {row.finalResponse ? (
                          <>
                            <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Response Preview:</h4>
                            <div className="text-sm line-clamp-3 mb-4 text-slate-700 dark:text-slate-200">
                              {row.finalResponse}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-slate-400 dark:text-slate-500 italic mb-4">No response generated yet</div>
                        )}
                        
                        {row.timestamp && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 mt-auto">
                            Generated: {(() => {
                              try {
                                return format(new Date(row.timestamp), 'MMM d, yyyy HH:mm');
                              } catch (e) {
                                return row.timestamp;
                              }
                            })()}
                          </div>
                        )}
                        
                        <div className="flex justify-end mt-2">
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
                    </CardContent>
                  </Card>
                ))}
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