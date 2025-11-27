import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  Check, 
  Plus, 
  RefreshCw, 
  FileInput, 
  User,
  Download,
  Map
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import * as XLSX from 'xlsx';
import { HelpTooltip } from "@/components/HelpTooltip";
import { queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";

// Define the structure of our parsed Excel data
interface ExcelRow {
  category: string;
  requirement: string;
  finalResponse?: string;
  rating?: number;
  // timestamp is set by the database
}

export default function UploadRequirements() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [recordsAdded, setRecordsAdded] = useState<number | null>(null);
  const [rfpName, setRfpName] = useState<string>("");
  const [uploadedBy, setUploadedBy] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showMappingHelp, setShowMappingHelp] = useState<boolean>(false);

  const sampleWorkbook = useMemo(() => {
    const ws = XLSX.utils.json_to_sheet([
      { Category: "Security", Requirement: "System must support SSO", Response: "We integrate with SAML 2.0 and OIDC." },
      { Category: "Integrations", Requirement: "Provide REST API access", Response: "Documented REST APIs are available." }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    return wb;
  }, []);
  
  // Reset the form when file upload is successful
  const resetForm = () => {
    setFile(null);
    setExcelData([]);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const downloadSample = () => {
    const wbout = XLSX.write(sampleWorkbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rfp-sample.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // We'll accept any file type for now and do the parsing client-side
      // In a production environment, we'd validate more strictly
      setFile(selectedFile);
      setUploadStatus({
        type: "success",
        message: `File "${selectedFile.name}" selected successfully.`,
      });
      // Reset records added when a new file is selected
      setRecordsAdded(null);
    }
  };

  const handleUpload = () => {
    if (!file) {
      setUploadStatus({
        type: "error",
        message: "Please select a file first.",
      });
      return;
    }
    
    if (!rfpName.trim()) {
      setUploadStatus({
        type: "error",
        message: "Please enter an RFP name.",
      });
      return;
    }
    
    if (!uploadedBy.trim()) {
      setUploadStatus({
        type: "error",
        message: "Please enter your name in the 'Uploaded By' field.",
      });
      return;
    }

    // Show dialog to confirm append or replace
    setShowDialog(true);
  };
  
  const processFile = async (replaceExisting: boolean) => {
    setShowDialog(false);
    setIsUploading(true);
    setUploadProgress(0);
    
    // Make sure we have a file
    if (!file) {
      setUploadStatus({
        type: "error",
        message: "No file selected. Please select a file first.",
      });
      setIsUploading(false);
      return;
    }
    
    try {
      // Use FileReader to read the file as an ArrayBuffer
      const reader = new FileReader();
      
      // Process the file once it's loaded
      const parseExcel = () => {
        return new Promise<ExcelRow[]>((resolve, reject) => {
          reader.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(percent);
            }
          };
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              setUploadProgress(100);
              
              // Check if workbook has any sheets
              if (workbook.SheetNames.length === 0) {
                reject(new Error("The Excel file is empty. Please upload a file with data."));
                return;
              }
              
              // Get the first worksheet
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              
              // Convert to JSON
              const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
              
              // Check if file has any records
              if (jsonData.length === 0) {
                reject(new Error("The Excel file contains no records. Please upload a file with data."));
                return;
              }
              
              // Validate required columns exist
              const requiredColumns = ['Category', 'Requirement'];
              const alternateColumns = [
                ['category'], // alternates for Category
                ['requirement', 'text', 'Text', 'content', 'Content'] // alternates for Requirement
              ];
              
              // Check the first row to see what columns are available
              const firstRow = jsonData[0];
              const availableColumns = Object.keys(firstRow);
              
              // For each required column, check if it or its alternates exist
              const missingColumns = requiredColumns.filter((col, index) => {
                // Check main column name
                if (availableColumns.includes(col)) return false;
                
                // Check alternate column names
                const alternates = alternateColumns[index];
                return !alternates.some(alt => availableColumns.includes(alt));
              });
              
              if (missingColumns.length > 0) {
                reject(new Error(`Required columns missing: ${missingColumns.join(', ')}. File must contain both 'Category' and 'Requirement' columns.`));
                return;
              }
              
              // Map to our expected format
              const parsedData: ExcelRow[] = jsonData.map(row => ({
                category: row.Category || row.category || "Uncategorized",
                requirement: row.Requirement || row.requirement || row.text || row.Text || row.content || row.Content || "",
                finalResponse: row.Response || row.response || row.finalResponse || "",
                rating: row.Rating || row.rating || undefined
                // timestamp will be set automatically by the database
              }));
              
              // Check if any requirements are empty
              const emptyRequirements = parsedData.some(row => !row.requirement || row.requirement.trim() === '');
              if (emptyRequirements) {
                reject(new Error("Some requirements are empty. Please ensure all rows have a requirement."));
                return;
              }
              
              resolve(parsedData);
            } catch (error) {
              console.error("Error parsing Excel file:", error);
              reject(new Error("Failed to parse Excel file. Make sure the file is in a valid Excel format."));
            }
          };
          
          reader.onerror = () => {
            reject(new Error("Error reading the file."));
          };
        });
      };
      
      // Start reading the file
      reader.readAsArrayBuffer(file);
      
      // Wait for the file to be parsed
      const parsedData = await parseExcel();
      
      // Check if we have any data
      if (parsedData.length === 0) {
        throw new Error("No data found in the Excel file or required columns are missing.");
      }
      
      // Set the Excel data to display in the UI
      setExcelData(parsedData);
      
      // Generate requirementId base for all rows
      const requirementIdBase = rfpName.replace(/\s+/g, '_').toLowerCase();
      
      // Add rfpName, requirementId, and uploadedBy to each row
      const enhancedData = parsedData.map((row, index) => ({
        ...row,
        rfpName: rfpName,
        requirementId: `${requirementIdBase}_${(index + 1).toString().padStart(3, '0')}`,
        uploadedBy: uploadedBy
      }));
      
      // Send the data to the backend to store in the database
      const response = await fetch("/api/analyze-excel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          data: enhancedData,
          replaceExisting: replaceExisting 
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setRecordsAdded(result.recordsAdded || parsedData.length);
        
        setUploadStatus({
          type: "success",
          message: `File processed successfully. ${result.recordsAdded || parsedData.length} records ${replaceExisting ? 'replaced existing data' : 'added to the database'}.`,
        });
        setUploadProgress(0);
        
        // CRITICAL: Always invalidate React Query cache after upload to refresh RFP names dropdown
        // This ensures new RFP names appear in the filter dropdown immediately
        await queryClient.invalidateQueries({ queryKey: ['/api/excel-requirements'] });
        queryClient.removeQueries({ queryKey: ['/api/excel-requirements'] });
        console.log('Invalidated and cleared requirements cache after upload');
        
        if (replaceExisting) {
          console.log('Replace All used - old data should be cleared');
          // If user is on ViewData page, trigger a page refresh to show new data
          if (window.location.pathname === '/view-data' || window.location.pathname === '/') {
            window.dispatchEvent(new CustomEvent('requirements-replaced'));
          }
        } else {
          // For append mode, also trigger refresh to show new RFP names
          if (window.location.pathname === '/view-data' || window.location.pathname === '/') {
            window.dispatchEvent(new CustomEvent('requirements-updated'));
          }
        }
        
        // Reset form on successful upload if desired
        // resetForm();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process file on the server");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      setUploadStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to process file. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full">
      <div className="p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 sm:mb-6 bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">Upload Requirements</h2>
        
        {/* MOBILE: Dialog for append/replace confirmation - responsive width */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>Upload Options</DialogTitle>
                <HelpTooltip text="Choose how to handle the uploaded requirements. Append adds new requirements while keeping existing ones. Replace will remove all previous requirements and add only the new ones." />
              </div>
              <DialogDescription>
                Would you like to append this data to the existing requirements or replace all existing data?
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <Button 
                onClick={() => processFile(false)} 
                className="flex items-center justify-center"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Append Data
              </Button>
              <Button 
                onClick={() => processFile(true)}
                className="flex items-center justify-center"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Replace All
              </Button>
            </div>
            <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <div className="grid grid-cols-1 gap-6 sm:gap-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200">Upload Requirements Excel File</h3>
                <HelpTooltip text="Upload your RFP requirements from an Excel file to generate AI-powered responses. The system will analyze your requirements and provide tailored responses." />
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Upload an Excel file with 'Category' and 'Requirement' columns to view the content.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={downloadSample}>
                  <Download className="h-4 w-4" />
                  Download sample file
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={() => setShowMappingHelp(!showMappingHelp)}>
                  <Map className="h-4 w-4" />
                  {showMappingHelp ? "Hide" : "Show"} column mapping
                </Button>
              </div>
              {showMappingHelp && (
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">
                  <p className="font-medium mb-1">Required columns</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Category</strong> – functional bucket (e.g., Security, Integrations)</li>
                    <li><strong>Requirement</strong> – the question/ask text</li>
                    <li className="text-slate-500">Optional: <strong>Response</strong>, <strong>Rating</strong></li>
                  </ul>
                  <p className="mt-2 text-xs">Alternate headers accepted: Category/category and Requirement/requirement/Text/content.</p>
                </div>
              )}
            </div>
            
            <CardContent className="px-4 sm:px-6 py-4 sm:py-5">
              <div className="space-y-5 sm:space-y-6">
                <div className="space-y-5 sm:space-y-6">
                  {/* RFP Information Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="rfp-name" className="text-sm font-medium">RFP Name</Label>
                        <HelpTooltip text="Enter a descriptive name for the RFP document. This helps you identify and filter requirements later." />
                      </div>
                      <div className="relative">
                        <FileInput className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                          id="rfp-name"
                          value={rfpName}
                          onChange={(e) => setRfpName(e.target.value)}
                          className="pl-8"
                          placeholder="Enter RFP name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="uploaded-by" className="text-sm font-medium">Uploaded By</Label>
                        <HelpTooltip text="Enter your name or identifier. This helps track who uploaded which requirements for collaboration purposes." />
                      </div>
                      <div className="relative">
                        <User className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                          id="uploaded-by"
                          value={uploadedBy}
                          onChange={(e) => setUploadedBy(e.target.value)}
                          className="pl-8"
                          placeholder="Enter your name"
                        />
                      </div>
                    </div>
                  </div>
                
                  {/* ACCESSIBILITY & MOBILE: File Upload Section with Drag & Drop */}
                  <div 
                    className={`border-2 border-dashed ${file ? 'border-primary/60 bg-primary/5' : 'border-slate-200 dark:border-slate-700'} rounded-lg p-4 sm:p-6 md:p-10 text-center transition-colors duration-200 relative max-w-2xl mx-auto`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        // Get the first file
                        const droppedFile = e.dataTransfer.files[0];
                        
                        // USABILITY: Add file size validation (max 10MB)
                        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
                        if (droppedFile.size > MAX_FILE_SIZE) {
                          setUploadStatus({
                            type: "error",
                            message: `File size exceeds 10MB limit. Please upload a smaller file.`,
                          });
                          return;
                        }
                        
                        // Check if it's an Excel file
                        if (droppedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                            droppedFile.type === 'application/vnd.ms-excel' ||
                            droppedFile.name.endsWith('.xlsx') || 
                            droppedFile.name.endsWith('.xls')) {
                          
                          // Create a new change event
                          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                          if (fileInput) {
                            // Create a DataTransfer object
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(droppedFile);
                            fileInput.files = dataTransfer.files;
                            
                            // Trigger the change event
                            const event = new Event('change', { bubbles: true });
                            fileInput.dispatchEvent(event);
                          }
                          
                          // Set the file directly
                          setFile(droppedFile);
                          setUploadStatus({
                            type: "success",
                            message: `File "${droppedFile.name}" selected successfully.`,
                          });
                          setRecordsAdded(null);
                        } else {
                          // Not an Excel file
                          setUploadStatus({
                            type: "error",
                            message: "Please upload only Excel files (.xlsx or .xls)",
                          });
                        }
                      }
                    }}
                    role="region"
                    aria-label="File upload dropzone"
                  >
                    <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4">
                      <div className={`h-14 w-14 ${file ? 'bg-primary/20' : 'bg-slate-100 dark:bg-slate-800'} rounded-full flex items-center justify-center transition-colors duration-200`}>
                        <Upload className={`h-6 w-6 ${file ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <h4 className="text-md font-medium text-slate-700 dark:text-slate-300">Upload Excel File</h4>
                          <HelpTooltip text="Your Excel file must have two specific columns: 'Category' (the type of requirement) and 'Requirement' (the actual request text). The system will automatically extract and process these columns." />
                        </div>
                        <p id="file-upload-description" className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto">
                          <span className="hidden sm:inline">Drag & drop your Excel file here or click to browse. Required columns: 'Category' and 'Requirement'. Alternate headers are shown in the mapping helper above.</span>
                          <span className="sm:hidden">Select an Excel file with the required columns.</span>
                        </p>
                      </div>
                      <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row gap-3 sm:gap-0 w-full sm:w-auto">
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileChange}
                          className="hidden"
                          aria-describedby="file-upload-description"
                          aria-label="Select Excel file to upload"
                        />
                        <label htmlFor="file-upload" className="w-full sm:w-auto">
                          <Button type="button" variant="outline" className="cursor-pointer w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-blue-500" asChild>
                            <span>
                              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                              Select File
                            </span>
                          </Button>
                        </label>
                        <Button
                          type="button"
                          onClick={handleUpload}
                          disabled={!file || isUploading || !rfpName || !uploadedBy}
                          className="w-full sm:w-auto sm:ml-3"
                        >
                          {isUploading ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Process File
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="text-xs sm:text-sm">
                        {file && (
                          <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-md">
                            <span className="font-medium">Selected:</span>{' '}
                            <span className="truncate block max-w-full" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-xs"> ({(file.size / 1024).toFixed(1)} KB)</span>
                          </p>
                        )}
                        {(!rfpName || !uploadedBy) && file && (
                          <p className="text-orange-500 dark:text-orange-400 mt-2 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Please complete all required fields.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {isUploading && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-300">Uploading and parsing...</p>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                {uploadStatus.type && (
                  <Alert variant={uploadStatus.type === "error" ? "destructive" : "default"}>
                    {uploadStatus.type === "error" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {uploadStatus.type === "error" ? "Error" : "Success"}
                    </AlertTitle>
                    <AlertDescription>{uploadStatus.message}</AlertDescription>
                    {recordsAdded !== null && uploadStatus.type === "success" && (
                      <div className="mt-2 p-2 bg-slate-50 rounded-md border border-slate-200">
                        <p className="text-sm font-medium text-slate-700">
                          Records processed: {recordsAdded}
                        </p>
                      </div>
                    )}
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Display uploaded Excel content with responsive table design */}
          {excelData.length > 0 && (
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200">Uploaded Content</h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {excelData.length} requirement{excelData.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="hidden sm:flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
              
              {/* Mobile-optimized card view for smaller screens */}
              <div className="md:hidden">
                {excelData.map((row, index) => (
                  <div 
                    key={index} 
                    className="p-4 border-b border-slate-200 dark:border-slate-700 last:border-0"
                  >
                    <div className="mb-2">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-md">
                        {row.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-200 mb-3">
                      {row.requirement}
                    </p>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>RFP: {rfpName || "—"}</span>
                      <span>By: {uploadedBy || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* MOBILE: Desktop table view with horizontal scroll on mobile */}
              <div className="hidden md:block">
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/6">Category</TableHead>
                        <TableHead className="w-1/2">Requirement</TableHead>
                        <TableHead className="w-1/6">RFP Name</TableHead>
                        <TableHead className="w-1/6">Uploaded By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {excelData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row.category}</TableCell>
                          <TableCell>{row.requirement}</TableCell>
                          <TableCell>{rfpName || "—"}</TableCell>
                          <TableCell>{uploadedBy || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
