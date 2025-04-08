import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRfpForm } from "@/hooks/useRfpForm";
import { Template, StepInfo } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StepIndicator from "@/components/StepIndicator";
import InfoPanel from "@/components/InfoPanel";

export default function TemplateSelection() {
  const { formData, updateFormData, nextStep, prevStep } = useRfpForm();
  const [selectedTemplate, setSelectedTemplate] = useState<string>(formData.selectedTemplate || "");
  
  // Step info for the sidebar
  const stepInfo: StepInfo = {
    title: "Template Selection",
    description: "Choose the right template that best matches the RFP type and your industry focus.",
    tips: [
      {
        title: "Choosing the Right Template",
        content: (
          <ul className="list-disc list-inside text-slate-600 space-y-1">
            <li>Consider the formality level required by the client</li>
            <li>Match the template to the client's industry</li>
            <li>Look for templates that highlight your company's strengths</li>
          </ul>
        ),
      },
      {
        title: "Template Features",
        content: "Each template is designed with specific sections and formatting appropriate for different types of RFPs. Review the template structure to ensure it includes all necessary components."
      }
    ],
    nextStep: "After selecting a template, you'll customize the response with specific details tailored to the RFP.",
  };
  
  // Fetch templates from API
  const { data: templates, isLoading, error } = useQuery<Template[]>({
    queryKey: ['/api/templates'],
  });
  
  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };
  
  // Handle continue button click
  const handleContinue = () => {
    if (selectedTemplate) {
      updateFormData({ selectedTemplate });
      nextStep();
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
                  <h3 className="text-lg font-medium text-slate-800">Template Selection</h3>
                  <p className="mt-1 text-sm text-slate-500">Choose the most appropriate template for your RFP response.</p>
                </div>
                
                <CardContent className="px-6 py-5">
                  {isLoading ? (
                    <div className="py-8 text-center">
                      <p>Loading available templates...</p>
                    </div>
                  ) : error ? (
                    <div className="py-8 text-center text-red-500">
                      <p>Error loading templates. Please try again.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="my-2">
                        <p className="text-sm text-slate-500 mb-4">
                          Select the template that best fits the type of RFP and industry for <strong>{formData.clientName}</strong> in the <strong>{formData.clientIndustry}</strong> industry.
                        </p>
                        
                        <div className="space-y-4">
                          {templates?.map((template) => (
                            <div 
                              key={template.id}
                              className={cn(
                                "border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors",
                                selectedTemplate === template.id ? "border-primary bg-blue-50" : "border-slate-200"
                              )}
                              onClick={() => handleTemplateSelect(template.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-medium text-slate-800 flex items-center">
                                    {template.name}
                                    {selectedTemplate === template.id && (
                                      <Check className="ml-2 h-5 w-5 text-primary" />
                                    )}
                                  </h4>
                                  <p className="mt-1 text-sm text-slate-600">{template.description}</p>
                                </div>
                                <div className="ml-4">
                                  <span className={cn(
                                    "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                                    selectedTemplate === template.id 
                                      ? "bg-primary text-white" 
                                      : "bg-slate-100 text-slate-800"
                                  )}>
                                    Recommended
                                  </span>
                                </div>
                              </div>
                              
                              <div className="mt-3">
                                <h5 className="text-sm font-medium text-slate-700">Suitable for:</h5>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {template.suitableFor.map((industry) => (
                                    <span 
                                      key={industry} 
                                      className={cn(
                                        "inline-block rounded-full px-2 py-1 text-xs",
                                        industry.toLowerCase() === formData.clientIndustry.toLowerCase()
                                          ? "bg-green-100 text-green-800"
                                          : "bg-slate-100 text-slate-600"
                                      )}
                                    >
                                      {industry}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="mt-3">
                                <h5 className="text-sm font-medium text-slate-700">Template Structure:</h5>
                                <ul className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                  {template.structure.slice(0, 6).map((section, index) => (
                                    <li key={index} className="text-xs text-slate-600">• {section}</li>
                                  ))}
                                  {template.structure.length > 6 && (
                                    <li className="text-xs text-slate-600">• And {template.structure.length - 6} more sections...</li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="pt-6 flex justify-between">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={prevStep}
                          className="flex items-center"
                        >
                          <ChevronLeft className="mr-1 h-5 w-5" />
                          Back to RFP Details
                        </Button>
                        
                        <Button 
                          type="button" 
                          onClick={handleContinue}
                          disabled={!selectedTemplate}
                          className="flex items-center"
                        >
                          Continue to Response Generation
                          <ChevronRight className="ml-1 h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  )}
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
