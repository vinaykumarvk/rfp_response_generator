import { useEffect, useState } from 'react';
import { RfpFormData } from '@/lib/types';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Initial empty form data
const initialData: RfpFormData = {
  clientName: '',
  clientIndustry: '',
  rfpTitle: '',
  rfpId: '',
  submissionDate: '',
  budgetRange: '',
  projectSummary: '',
  companyName: '',
  pointOfContact: '',
  companyStrengths: '',
  selectedTemplate: '',
  customizations: '',
  generatedContent: ''
};

// Hook for managing the RFP form data across steps
export function useRfpForm() {
  const [formData, setFormData] = useState<RfpFormData>(() => {
    // Try to load from localStorage on initial render
    const savedData = localStorage.getItem('rfpFormData');
    return savedData ? JSON.parse(savedData) : initialData;
  });
  
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Auto-save form data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('rfpFormData', JSON.stringify(formData));
  }, [formData]);
  
  // Create new RFP response
  const createRfpResponse = useMutation({
    mutationFn: async (data: RfpFormData) => {
      const response = await apiRequest('POST', '/api/rfp-responses', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rfp-responses'] });
      toast({
        title: "Success!",
        description: "Your RFP response has been saved.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving RFP response",
        description: error.message || "An error occurred while saving your RFP response.",
        variant: "destructive",
      });
    }
  });
  
  // Update existing RFP response
  const updateRfpResponse = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<RfpFormData> }) => {
      const response = await apiRequest('PATCH', `/api/rfp-responses/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rfp-responses'] });
      toast({
        title: "Success!",
        description: "Your RFP response has been updated.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating RFP response",
        description: error.message || "An error occurred while updating your RFP response.",
        variant: "destructive",
      });
    }
  });
  
  // Update form data
  const updateFormData = (newData: Partial<RfpFormData>) => {
    setFormData(prevData => ({ ...prevData, ...newData }));
  };
  
  // Reset form data
  const resetForm = () => {
    setFormData(initialData);
    setCurrentStep(1);
    navigate('/');
    toast({
      title: "Form Reset",
      description: "Started a new RFP response",
      variant: "default",
    });
  };
  
  // Save progress (already auto-saved to localStorage, but this provides user feedback)
  const saveProgress = () => {
    toast({
      title: "Progress Saved",
      description: "Your progress has been saved locally",
      variant: "default",
    });
  };
  
  // Navigate to next step
  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(prevStep => prevStep + 1);
      
      // Navigate to the correct route based on step
      switch (currentStep + 1) {
        case 1:
          navigate('/');
          break;
        case 2:
          navigate('/template-selection');
          break;
        case 3:
          navigate('/generate-response');
          break;
        case 4:
          navigate('/preview-export');
          break;
      }
    }
  };
  
  // Navigate to previous step
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prevStep => prevStep - 1);
      
      // Navigate to the correct route based on step
      switch (currentStep - 1) {
        case 1:
          navigate('/');
          break;
        case 2:
          navigate('/template-selection');
          break;
        case 3:
          navigate('/generate-response');
          break;
      }
    }
  };
  
  // Navigate to specific step
  const goToStep = (step: number) => {
    if (step >= 1 && step <= 4) {
      setCurrentStep(step);
      
      // Navigate to the correct route based on step
      switch (step) {
        case 1:
          navigate('/');
          break;
        case 2:
          navigate('/template-selection');
          break;
        case 3:
          navigate('/generate-response');
          break;
        case 4:
          navigate('/preview-export');
          break;
      }
    }
  };
  
  return {
    formData,
    updateFormData,
    resetForm,
    saveProgress,
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    createRfpResponse,
    updateRfpResponse,
  };
}
