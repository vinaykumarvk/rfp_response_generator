import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRfpForm } from '@/hooks/useRfpForm';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  title: string;
}

export default function StepIndicator({ title }: StepIndicatorProps) {
  const { currentStep, saveProgress, resetForm } = useRfpForm();

  const steps = [
    { id: 1, name: 'RFP Details' },
    { id: 2, name: 'Template Selection' },
    { id: 3, name: 'Generate Response' },
    { id: 4, name: 'Preview & Export' },
  ];

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 sm:mb-0">{title}</h2>
        <div>
          <Button 
            variant="outline" 
            className="mr-2"
            onClick={saveProgress}
          >
            Save Progress
          </Button>
          <Button 
            variant="outline"
            onClick={resetForm}
          >
            New Response
          </Button>
        </div>
      </div>
      
      <div className="flex flex-wrap justify-between mb-8 border-b border-slate-200 pb-4">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center mb-2 sm:mb-0">
            {idx > 0 && (
              <div className="hidden sm:block mx-4 border-t-2 border-slate-200 w-16"></div>
            )}
            <div 
              className={cn(
                "flex items-center",
                currentStep === step.id && "text-primary",
                currentStep > step.id && "text-success"
              )}
            >
              <div 
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center mr-2",
                  currentStep === step.id && "border-primary text-primary bg-blue-50",
                  currentStep > step.id && "border-success text-success bg-green-50",
                  currentStep < step.id && "border-slate-300 text-slate-500"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              <span 
                className={cn(
                  "font-medium",
                  currentStep === step.id && "text-primary",
                  currentStep > step.id && "text-success",
                  currentStep < step.id && "text-slate-500"
                )}
              >
                {step.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
