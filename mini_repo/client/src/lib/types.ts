export interface RfpFormData {
  // Client Information
  clientName: string;
  clientIndustry: string;
  
  // RFP Details
  rfpTitle: string;
  rfpId?: string;
  submissionDate: string;
  budgetRange?: string;
  projectSummary: string;
  
  // Company Information
  companyName: string;
  pointOfContact: string;
  companyStrengths?: string;
  
  // Response Generation
  selectedTemplate: string;
  customizations?: string;
  generatedContent?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  suitableFor: string[];
  structure: string[];
}

export interface StepInfo {
  title: string;
  description: string;
  tips: {
    title: string;
    content: string | React.ReactNode;
  }[];
  nextStep?: string;
}

export type StepData = {
  [key: string]: StepInfo;
};
