import { FileText, HelpCircle, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="ml-2 text-xl font-semibold text-slate-800">RFP Response Generator</h1>
              </div>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/excel-analyzer">
              <Button variant="outline" className="flex items-center space-x-2">
                <Table className="h-4 w-4" />
                <span>Excel Analyzer</span>
              </Button>
            </Link>
            <Button variant="outline" className="flex items-center space-x-2">
              <HelpCircle className="h-4 w-4" />
              <span>Help</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
