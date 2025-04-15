import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRfpForm } from '@/hooks/useRfpForm';
import { Progress } from '@/components/ui/progress';
import { StepInfo } from '@/lib/types';

interface InfoPanelProps {
  stepInfo: StepInfo;
}

export default function InfoPanel({ stepInfo }: InfoPanelProps) {
  const { currentStep } = useRfpForm();
  
  // Calculate progress percentage
  const progressPercentage = (currentStep / 4) * 100;
  
  return (
    <div className="lg:col-span-1">
      <Card className="sticky top-8">
        <CardHeader className="pb-3">
          <CardTitle>Tips & Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-4">
          <div>
            <h4 className="font-medium text-slate-700 mb-2">Current Step: {stepInfo.title}</h4>
            <p className="text-slate-600">{stepInfo.description}</p>
          </div>
          
          {stepInfo.tips.map((tip, index) => (
            <div key={index} className="mb-4">
              <h4 className="font-medium text-slate-700 mb-2">{tip.title}</h4>
              {typeof tip.content === 'string' ? (
                <p className="text-slate-600">{tip.content}</p>
              ) : (
                tip.content
              )}
            </div>
          ))}
          
          {stepInfo.nextStep && (
            <div className="mb-4 pt-3 border-t border-slate-200">
              <h4 className="font-medium text-slate-700 mb-2">Next Steps</h4>
              <p className="text-slate-600">{stepInfo.nextStep}</p>
            </div>
          )}
          
          <div className="pt-3 border-t border-slate-200">
            <h4 className="font-medium text-slate-700 mb-2">Need Help?</h4>
            <a href="#" className="text-primary hover:text-blue-700 font-medium inline-flex items-center">
              <Info className="h-4 w-4 mr-1" />
              View RFP Response Guide
            </a>
          </div>
          
          <div className="pt-3 border-t border-slate-200">
            <h4 className="font-medium text-slate-700 mb-2">Your Progress</h4>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-slate-500 mt-1">Step {currentStep} of 4</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
