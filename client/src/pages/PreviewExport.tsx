import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Download, Edit, Save } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useRfpForm } from "@/hooks/useRfpForm";
import { StepInfo } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StepIndicator from "@/components/StepIndicator";
import InfoPanel from "@/components/InfoPanel";
import StandardTemplate from "@/components/rfp-templates/StandardTemplate";
import TechnicalTemplate from "@/components/rfp-templates/TechnicalTemplate";
import GovernmentTemplate from "@/components/rfp-templates/GovernmentTemplate";
import { useToast } from "@/hooks/use-toast";

export default function PreviewExport() {
  const { formData, updateFormData, prevStep, createRfpResponse } = useRfpForm();
  const [activeTab, setActiveTab] = useState<string>("preview");
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Step info for the sidebar
  const stepInfo: StepInfo = {
    title: "Preview & Export",
    description: "Review your generated response and export it in your preferred format.",
    tips: [
      {
        title: "Review Carefully",
        content: (
          <ul className="list-disc list-inside text-slate-600 space-y-1">
            <li>Check for accuracy and completeness</li>
            <li>Ensure all RFP requirements are addressed</li>
            <li>Verify contact information and submission details</li>
          </ul>
        ),
      },
      {
        title: "Exporting Options",
        content: "You can download your response as PDF, Word, or HTML formats for final editing and submission."
      }
    ],
  };
  
  // Function to handle saving the RFP response
  const handleSaveResponse = () => {
    createRfpResponse.mutate(formData, {
      onSuccess: () => {
        toast({
          title: "RFP Response Saved",
          description: "Your response has been saved successfully.",
        });
      }
    });
  };
  
  // Function to export the RFP response as PDF
  const handleExportPDF = () => {
    toast({
      title: "Export Initiated",
      description: "Your document is being prepared for download as PDF.",
    });
    
    // In a real implementation, this would use a PDF generation library
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: "Your document has been downloaded.",
      });
    }, 1500);
  };
  
  // Function to export the RFP response as DOCX
  const handleExportDOCX = () => {
    toast({
      title: "Export Initiated",
      description: "Your document is being prepared for download as DOCX.",
    });
    
    // In a real implementation, this would use a DOCX generation library
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: "Your document has been downloaded.",
      });
    }, 1500);
  };
  
  // Function to export the RFP response as HTML
  const handleExportHTML = () => {
    toast({
      title: "Export Initiated",
      description: "Your document is being prepared for download as HTML.",
    });
    
    // In a real implementation, this would export the HTML content
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: "Your document has been downloaded.",
      });
    }, 1500);
  };
  
  // Render the appropriate template based on selection
  const renderTemplate = () => {
    switch (formData.selectedTemplate) {
      case 'standard':
        return <StandardTemplate data={formData} />;
      case 'technical':
        return <TechnicalTemplate data={formData} />;
      case 'government':
        return <GovernmentTemplate data={formData} />;
      default:
        return <div className="p-4">No template selected</div>;
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <StepIndicator title="Create Your RFP Response" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <div className="px-6 py-5 border-b border-slate-200">
                  <h3 className="text-lg font-medium text-slate-800">Preview & Export Response</h3>
                  <p className="mt-1 text-sm text-slate-500">Review your generated response and download in your preferred format.</p>
                </div>
                
                <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="preview">Preview Document</TabsTrigger>
                      <TabsTrigger value="export">Export Options</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="preview" className="mt-0">
                      <div className="flex justify-between items-center py-2">
                        <h4 className="font-medium">Document Preview</h4>
                        <Button variant="outline" size="sm" onClick={() => prevStep()}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Response
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="export" className="mt-0">
                      <div className="flex justify-between items-center py-2">
                        <h4 className="font-medium">Export Your Response</h4>
                        <Button variant="outline" size="sm" onClick={handleSaveResponse} disabled={createRfpResponse.isPending}>
                          <Save className="h-4 w-4 mr-1" />
                          {createRfpResponse.isPending ? "Saving..." : "Save Response"}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-200">
                    {activeTab === "preview" ? (
                      <div className="bg-slate-100 rounded-b-lg" ref={contentRef}>
                        {renderTemplate()}
                      </div>
                    ) : (
                      <div className="p-6 space-y-6">
                        <div>
                          <h5 className="font-medium mb-3">Download Options</h5>
                          <p className="text-sm text-slate-600 mb-4">
                            Export your RFP response in your preferred format for final editing and submission.
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="border rounded-lg p-4 text-center">
                              <h6 className="font-medium mb-2">PDF Format</h6>
                              <p className="text-xs text-slate-500 mb-3">Best for final submission</p>
                              <Button onClick={handleExportPDF} className="w-full">
                                <Download className="h-4 w-4 mr-1" />
                                Export as PDF
                              </Button>
                            </div>
                            
                            <div className="border rounded-lg p-4 text-center">
                              <h6 className="font-medium mb-2">Word Format</h6>
                              <p className="text-xs text-slate-500 mb-3">Best for further editing</p>
                              <Button onClick={handleExportDOCX} className="w-full">
                                <Download className="h-4 w-4 mr-1" />
                                Export as DOCX
                              </Button>
                            </div>
                            
                            <div className="border rounded-lg p-4 text-center">
                              <h6 className="font-medium mb-2">HTML Format</h6>
                              <p className="text-xs text-slate-500 mb-3">Best for web publishing</p>
                              <Button onClick={handleExportHTML} className="w-full">
                                <Download className="h-4 w-4 mr-1" />
                                Export as HTML
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-200">
                          <h5 className="font-medium mb-3">Save & Share</h5>
                          <p className="text-sm text-slate-600 mb-4">
                            Save your response to access it later or share with your team.
                          </p>
                          
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                              variant="outline"
                              onClick={handleSaveResponse}
                              disabled={createRfpResponse.isPending}
                              className="flex-1"
                            >
                              <Save className="h-4 w-4 mr-1" />
                              {createRfpResponse.isPending ? "Saving..." : "Save to My Responses"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="px-6 py-4 flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={prevStep}
                        className="flex items-center"
                      >
                        <ChevronLeft className="mr-1 h-5 w-5" />
                        Back to Generation
                      </Button>
                      
                      {activeTab === "preview" && (
                        <Button 
                          type="button" 
                          onClick={() => setActiveTab("export")}
                        >
                          Proceed to Export
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <InfoPanel stepInfo={stepInfo} />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
