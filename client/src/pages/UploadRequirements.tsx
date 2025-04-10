import { useState } from "react";
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
  User
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
  
  // Reset the form when file upload is successful
  const resetForm = () => {
    setFile(null);
    setExcelData([]);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
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
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              
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
              
              // Check if file has extra columns not in our schema
              const allowedColumns = [
                'Category', 'category', 
                'Requirement', 'requirement', 'text', 'Text', 'content', 'Content',
                'Response', 'response', 'finalResponse',
                'Rating', 'rating'
              ];
              
              const extraColumns = availableColumns.filter(col => !allowedColumns.includes(col));
              if (extraColumns.length > 0) {
                reject(new Error(`File contains extra columns: ${extraColumns.join(', ')}. Only 'Category' and 'Requirement' columns are supported.`));
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
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Upload Requirements</h2>
        
        {/* Dialog for append/replace confirmation */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Options</DialogTitle>
              <DialogDescription>
                Would you like to append this data to the existing requirements or replace all existing data?
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
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
        
        <div className="grid grid-cols-1 gap-8">
          <Card>
            <div className="px-6 py-5 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-800">Upload Requirements Excel File</h3>
              <p className="mt-1 text-sm text-slate-500">
                Upload an Excel file with 'Category' and 'Requirement' columns to view the content.
              </p>
            </div>
            
            <CardContent className="px-6 py-5">
              <div className="space-y-6">
                <div className="space-y-6">
                  {/* RFP Information Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rfp-name">RFP Name</Label>
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
                      <Label htmlFor="uploaded-by">Uploaded By</Label>
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
                
                  {/* File Upload Section with Drag & Drop */}
                  <div 
                    className={`border-2 border-dashed ${file ? 'border-blue-400 bg-blue-50' : 'border-slate-200'} rounded-lg p-10 text-center transition-colors duration-200 relative`}
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
                  >
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className={`h-14 w-14 ${file ? 'bg-blue-100' : 'bg-slate-100'} rounded-full flex items-center justify-center transition-colors duration-200`}>
                        <Upload className={`h-6 w-6 ${file ? 'text-blue-500' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <h4 className="text-md font-medium text-slate-700">Upload Excel File</h4>
                        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                          Drag & drop your Excel file here or click to browse. File must contain 'Category' and 'Requirement' columns.
                        </p>
                      </div>
                      <div className="mt-2">
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label htmlFor="file-upload">
                          <Button type="button" variant="outline" className="cursor-pointer" asChild>
                            <span>
                              <FileText className="mr-2 h-4 w-4" />
                              Select File
                            </span>
                          </Button>
                        </label>
                        <Button
                          type="button"
                          onClick={handleUpload}
                          disabled={!file || isUploading || !rfpName || !uploadedBy}
                          className="ml-3"
                        >
                          {isUploading ? "Processing..." : "Process File"}
                        </Button>
                      </div>
                      <div className="text-sm">
                        {file && (
                          <p className="text-slate-600">
                            <span className="font-medium">Selected file:</span> {file.name} ({(file.size / 1024).toFixed(2)} KB)
                          </p>
                        )}
                        {(!rfpName || !uploadedBy) && file && (
                          <p className="text-orange-500 mt-2">
                            Please enter RFP name and uploader information to continue.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
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
          
          {/* Display uploaded Excel content */}
          {excelData.length > 0 && (
            <Card>
              <div className="px-6 py-5 border-b border-slate-200">
                <h3 className="text-lg font-medium text-slate-800">Uploaded Content</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Displaying the content from the uploaded file.
                </p>
              </div>
              
              <CardContent className="p-0 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Requirement</TableHead>
                      <TableHead>RFP Name</TableHead>
                      <TableHead>Uploaded By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {excelData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.requirement}</TableCell>
                        <TableCell>{rfpName || "—"}</TableCell>
                        <TableCell>{uploadedBy || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}