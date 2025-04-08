import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRfpForm } from "@/hooks/useRfpForm";
import { StepInfo } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StepIndicator from "@/components/StepIndicator";
import InfoPanel from "@/components/InfoPanel";

// Form validation schema
const formSchema = z.object({
  customizations: z.string().optional(),
});

export default function GenerateResponse() {
  const { formData, updateFormData, nextStep, prevStep } = useRfpForm();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Step info for the sidebar
  const stepInfo: StepInfo = {
    title: "Generate Response",
    description: "Customize your selected template and generate a tailored RFP response.",
    tips: [
      {
        title: "Customization Tips",
        content: (
          <ul className="list-disc list-inside text-slate-600 space-y-1">
            <li>Include specific details about your approach</li>
            <li>Highlight relevant experience and case studies</li>
            <li>Address all requirements mentioned in the RFP</li>
          </ul>
        ),
      },
      {
        title: "Content Generation",
        content: "The generator combines your RFP details with the selected template to create a professional response. Review the generated content carefully before proceeding."
      }
    ],
    nextStep: "After generating your response, you'll be able to preview, edit, and export the final document.",
  };
  
  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customizations: formData.customizations || "",
    },
  });
  
  // Function to simulate response generation
  const generateResponse = async (values: z.infer<typeof formSchema>) => {
    setIsGenerating(true);
    
    try {
      // Save form values
      updateFormData({ 
        customizations: values.customizations,
      });
      
      // In a real application, this would make an API call to generate content
      // For now, we'll simulate with a timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate basic content based on the template and form data
      const generatedContent = `Generated RFP response for ${formData.clientName} using the ${formData.selectedTemplate} template.`;
      
      // Update form data with generated content
      updateFormData({ generatedContent });
      
      // Proceed to next step
      nextStep();
    } catch (error) {
      console.error("Error generating response:", error);
    } finally {
      setIsGenerating(false);
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
                  <h3 className="text-lg font-medium text-slate-800">Response Generation</h3>
                  <p className="mt-1 text-sm text-slate-500">Customize and generate your RFP response based on the selected template.</p>
                </div>
                
                <CardContent className="px-6 py-5">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(generateResponse)} className="space-y-6">
                      <div>
                        <h4 className="text-md font-medium text-slate-700 mb-3">Selected Template</h4>
                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                          <p className="font-medium">
                            {formData.selectedTemplate === 'standard' && 'Standard Business Proposal'}
                            {formData.selectedTemplate === 'technical' && 'Technical Solution Proposal'}
                            {formData.selectedTemplate === 'government' && 'Government/Public Sector Response'}
                          </p>
                          <p className="text-sm text-slate-600 mt-1">
                            {formData.selectedTemplate === 'standard' && 
                              'A comprehensive template suitable for most business RFPs with executive summary, company background, solution approach, pricing, and implementation timeline.'}
                            {formData.selectedTemplate === 'technical' && 
                              'Focused on technical specifications and implementation details, ideal for IT, software, and infrastructure projects.'}
                            {formData.selectedTemplate === 'government' && 
                              'Structured to meet the formal requirements of government RFPs, including compliance documentation and detailed cost breakdowns.'}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-md font-medium text-slate-700 mb-3">RFP Summary</h4>
                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><strong>Client:</strong> {formData.clientName}</p>
                              <p><strong>Industry:</strong> {formData.clientIndustry}</p>
                              <p><strong>RFP Title:</strong> {formData.rfpTitle}</p>
                            </div>
                            <div>
                              <p><strong>Deadline:</strong> {formData.submissionDate}</p>
                              <p><strong>Company:</strong> {formData.companyName}</p>
                              <p><strong>Contact:</strong> {formData.pointOfContact}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name="customizations"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Customizations</FormLabel>
                              <FormDescription>
                                Add any specific details, unique selling points, or additional information you want to include in your response.
                              </FormDescription>
                              <FormControl>
                                <Textarea 
                                  placeholder="Example: Our team has successfully completed 5 similar projects in the healthcare industry. We can offer a 10% discount for early completion..."
                                  className="min-h-32"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="pt-6 flex justify-between">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={prevStep}
                          className="flex items-center"
                        >
                          <ChevronLeft className="mr-1 h-5 w-5" />
                          Back to Template Selection
                        </Button>
                        
                        <Button 
                          type="submit" 
                          disabled={isGenerating}
                          className={cn(
                            "flex items-center",
                            isGenerating && "opacity-80"
                          )}
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw className="mr-1 h-5 w-5 animate-spin" />
                              Generating Response...
                            </>
                          ) : (
                            <>
                              Generate & Preview Response
                              <ChevronRight className="ml-1 h-5 w-5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
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
