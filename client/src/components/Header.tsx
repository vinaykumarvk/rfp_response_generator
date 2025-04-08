import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="ml-2 text-xl font-semibold text-slate-800">RFP Response Generator</h1>
          </div>
          <div>
            <Button variant="outline">
              Help
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
