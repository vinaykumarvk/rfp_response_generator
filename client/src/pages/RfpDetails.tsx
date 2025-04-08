import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useRfpForm } from "@/hooks/useRfpForm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StepIndicator from "@/components/StepIndicator";
import InfoPanel from "@/components/InfoPanel";
import { StepInfo } from "@/lib/types";

// Form validation schema
const formSchema = z.object({
  clientName: z.string().min(1, { message: "Client name is required" }),
  clientIndustry: z.string().min(1, { message: "Industry is required" }),
  rfpTitle: z.string().min(1, { message: "RFP title is required" }),
  rfpId: z.string().optional(),
  submissionDate: z.string().min(1, { message: "Submission deadline is required" }),
  budgetRange: z.string().optional(),
  projectSummary: z.string().min(1, { message: "Project summary is required" }),
  companyName: z.string().min(1, { message: "Company name is required" }),
  pointOfContact: z.string().min(1, { message: "Point of contact is required" }),
  companyStrengths: z.string().optional(),
});

export default function RfpDetails() {
  const { formData, updateFormData, nextStep } = useRfpForm();
  
  // Step info for the sidebar
  const stepInfo: StepInfo = {
    title: "RFP Details",
    description: "Provide accurate information about the RFP to generate a tailored response that meets the client's requirements.",
    tips: [
      {
        title: "Why This Matters",
        content: (
          <ul className="list-disc list-inside text-slate-600 space-y-1">
            <li>Helps customize the response to the client's specific industry needs</li>
            <li>Ensures all required RFP sections are addressed</li>
            <li>Aligns your company's strengths with the project requirements</li>
          </ul>
        ),
      },
    ],
    nextStep: "After completing this form, you'll select a response template that best fits this type of RFP.",
  };
  
  // Initialize form with current values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: formData.clientName || "",
      clientIndustry: formData.clientIndustry || "",
      rfpTitle: formData.rfpTitle || "",
      rfpId: formData.rfpId || "",
      submissionDate: formData.submissionDate || "",
      budgetRange: formData.budgetRange || "",
      projectSummary: formData.projectSummary || "",
      companyName: formData.companyName || "",
      pointOfContact: formData.pointOfContact || "",
      companyStrengths: formData.companyStrengths || "",
    },
  });
  
  // Form submission handler
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updateFormData(values);
    nextStep();
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
                  <h3 className="text-lg font-medium text-slate-800">RFP Information</h3>
                  <p className="mt-1 text-sm text-slate-500">Enter the details about the Request for Proposal you're responding to.</p>
                </div>
                
                <CardContent className="px-6 py-5">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Client Information Section */}
                      <div>
                        <h4 className="text-md font-medium text-slate-700 mb-4">Client Information</h4>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                          <div className="sm:col-span-3">
                            <FormField
                              control={form.control}
                              name="clientName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Client Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Acme Corporation" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="sm:col-span-3">
                            <FormField
                              control={form.control}
                              name="clientIndustry"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Industry</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select an industry" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="placeholder">Select an industry</SelectItem>
                                      <SelectItem value="technology">Technology</SelectItem>
                                      <SelectItem value="healthcare">Healthcare</SelectItem>
                                      <SelectItem value="finance">Finance</SelectItem>
                                      <SelectItem value="education">Education</SelectItem>
                                      <SelectItem value="government">Government</SelectItem>
                                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                                      <SelectItem value="retail">Retail</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* RFP Details Section */}
                      <div>
                        <h4 className="text-md font-medium text-slate-700 mb-4 pt-4">RFP Details</h4>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                          <div className="sm:col-span-4">
                            <FormField
                              control={form.control}
                              name="rfpTitle"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>RFP Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enterprise CRM Implementation" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="sm:col-span-2">
                            <FormField
                              control={form.control}
                              name="rfpId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>RFP ID/Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="RFP-2023-001" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="sm:col-span-3">
                            <FormField
                              control={form.control}
                              name="submissionDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Submission Deadline</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="sm:col-span-3">
                            <FormField
                              control={form.control}
                              name="budgetRange"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Estimated Budget Range</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select budget range" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="placeholder">Select budget range</SelectItem>
                                      <SelectItem value="under_50k">Under $50,000</SelectItem>
                                      <SelectItem value="50k_100k">$50,000 - $100,000</SelectItem>
                                      <SelectItem value="100k_250k">$100,000 - $250,000</SelectItem>
                                      <SelectItem value="250k_500k">$250,000 - $500,000</SelectItem>
                                      <SelectItem value="over_500k">Over $500,000</SelectItem>
                                      <SelectItem value="not_specified">Not Specified</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="sm:col-span-6">
                            <FormField
                              control={form.control}
                              name="projectSummary"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Project Summary</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Brief description of the project requirements and objectives..." 
                                      className="resize-none h-24"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Company Information Section */}
                      <div>
                        <h4 className="text-md font-medium text-slate-700 mb-4 pt-4">Your Company Information</h4>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                          <div className="sm:col-span-3">
                            <FormField
                              control={form.control}
                              name="companyName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Company Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Your Company Name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="sm:col-span-3">
                            <FormField
                              control={form.control}
                              name="pointOfContact"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Primary Point of Contact</FormLabel>
                                  <FormControl>
                                    <Input placeholder="John Smith" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="sm:col-span-6">
                            <FormField
                              control={form.control}
                              name="companyStrengths"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Key Company Strengths</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="List your main competitive advantages and strengths..." 
                                      className="resize-none h-24"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-6 flex justify-end">
                        <Button type="submit" className="ml-3 inline-flex items-center">
                          Continue to Template Selection
                          <ChevronRight className="ml-1 h-5 w-5" />
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
