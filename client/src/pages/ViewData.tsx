import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { RefreshCw, BookOpen, Eye, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import ReferencePanel from "@/components/ReferencePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define the structure of our parsed Excel data
interface ExcelRow {
  id?: number;
  category: string;
  requirement: string;
  finalResponse?: string;
  timestamp?: string;
  rating?: number;
}

export default function ViewData() {
  const [loading, setLoading] = useState(true);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<ExcelRow | null>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("response");

  // Function to fetch data from the API
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/excel-requirements");
      if (response.ok) {
        const data = await response.json();
        setExcelData(data);
      } else {
        console.error("Failed to fetch data");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);
  
  // Handle viewing a response with its references
  const handleViewResponse = (row: ExcelRow) => {
    if (!row.id) return;
    
    setSelectedResponseId(row.id);
    setSelectedResponse(row);
    setShowResponseDialog(true);
    setActiveTab("response");  // Default to response tab
  };

  return (
    <div className="h-full">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">View Uploaded Data</h2>
        
        <Card>
          <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-slate-800">Requirement Data</h3>
              <p className="mt-1 text-sm text-slate-500">
                {excelData.length > 0 
                  ? `Showing ${excelData.length} record${excelData.length === 1 ? '' : 's'}.`
                  : 'All uploaded Excel requirements are displayed below.'}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData} 
              disabled={loading}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          </div>
          
          <CardContent className="p-0 overflow-auto">
            {loading ? (
              <div className="p-6">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ) : excelData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Requirement</TableHead>
                    <TableHead>Final Response</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {excelData.map((row, index) => (
                    <TableRow key={row.id || index}>
                      <TableCell>{row.category}</TableCell>
                      <TableCell className="max-w-md break-words">{row.requirement}</TableCell>
                      <TableCell>{row.finalResponse ? (
                        <div className="max-w-md truncate">
                          {row.finalResponse.length > 100 
                            ? `${row.finalResponse.substring(0, 100)}...` 
                            : row.finalResponse}
                        </div>) : "—"}
                      </TableCell>
                      <TableCell>{row.rating !== undefined ? row.rating : "—"}</TableCell>
                      <TableCell>
                        {row.timestamp ? (
                          <span title={row.timestamp}>
                            {
                              // Try to format the date if it's valid
                              (() => {
                                try {
                                  return format(new Date(row.timestamp), 'MMM d, yyyy HH:mm');
                                } catch (e) {
                                  return row.timestamp;
                                }
                              })()
                            }
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewResponse(row)}
                          className="px-2 h-8"
                          disabled={!row.finalResponse}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          <span className="sr-only">View</span>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <p className="text-slate-500">No data available. Please upload Excel files first.</p>
                <p className="text-slate-400 text-sm mt-2">
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
              <div className="p-4 bg-slate-50 rounded-md mb-4">
                <h4 className="text-sm font-medium text-slate-500 mb-1">Category:</h4>
                <p className="text-slate-800">{selectedResponse.category}</p>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-md mb-4">
                <h4 className="text-sm font-medium text-slate-500 mb-1">Requirement:</h4>
                <p className="text-slate-800">{selectedResponse.requirement}</p>
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
                  <div className="p-4 bg-slate-50 rounded-md mb-4">
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Response:</h4>
                    <p className="text-slate-800 whitespace-pre-wrap">{selectedResponse.finalResponse}</p>
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