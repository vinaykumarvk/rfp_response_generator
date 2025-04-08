import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileText, AlertTriangle, Check } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StepIndicator from "@/components/StepIndicator";

export default function ExcelAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check if the file is an Excel file
      if (
        selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        selectedFile.type === "application/vnd.ms-excel"
      ) {
        setFile(selectedFile);
        setUploadStatus({
          type: "success",
          message: `File "${selectedFile.name}" selected successfully.`,
        });
      } else {
        setFile(null);
        setUploadStatus({
          type: "error",
          message: "Please select a valid Excel file (.xlsx or .xls).",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus({
        type: "error",
        message: "Please select a file first.",
      });
      return;
    }

    setIsUploading(true);
    
    // Simulate file upload (we'll implement real upload later)
    try {
      // In a real implementation, you would upload the file to the server
      // For now, just simulate the process
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setUploadStatus({
        type: "success",
        message: "File uploaded successfully. Ready for analysis.",
      });
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: "Failed to upload file. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setUploadStatus({
        type: "error",
        message: "Please upload a file first.",
      });
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate analysis process (we'll implement real analysis later)
    try {
      // In a real implementation, you would call the backend to process the file
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      setUploadStatus({
        type: "success",
        message: "Analysis complete. Results are ready.",
      });
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: "Failed to analyze file. Please try again.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <StepIndicator title="Excel Requirements Analyzer" />
          
          <div className="grid grid-cols-1 gap-8">
            <Card>
              <div className="px-6 py-5 border-b border-slate-200">
                <h3 className="text-lg font-medium text-slate-800">Upload Requirements Excel File</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Upload an Excel file with 'Category' and 'Requirement' columns to analyze and generate responses.
                </p>
              </div>
              
              <CardContent className="px-6 py-5">
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-10 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="h-14 w-14 bg-slate-100 rounded-full flex items-center justify-center">
                        <Upload className="h-6 w-6 text-slate-500" />
                      </div>
                      <div>
                        <h4 className="text-md font-medium text-slate-700">Upload Excel File</h4>
                        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                          Upload an Excel file (.xlsx or .xls) containing requirements data with 'Category' and 'Requirement' columns.
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
                              Select Excel File
                            </span>
                          </Button>
                        </label>
                        <Button
                          type="button"
                          onClick={handleUpload}
                          disabled={!file || isUploading}
                          className="ml-3"
                        >
                          {isUploading ? "Uploading..." : "Upload"}
                        </Button>
                      </div>
                      <div className="text-sm">
                        {file && (
                          <p className="text-slate-600">
                            <span className="font-medium">Selected file:</span> {file.name} ({(file.size / 1024).toFixed(2)} KB)
                          </p>
                        )}
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
                    </Alert>
                  )}
                  
                  <div className="pt-4 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={!file || uploadStatus.type !== "success" || isAnalyzing}
                      className="min-w-[150px]"
                    >
                      {isAnalyzing ? "Analyzing..." : "Analyze Requirements"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Results will be displayed here after analysis is complete */}
            {/* Will implement in the next iteration */}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}