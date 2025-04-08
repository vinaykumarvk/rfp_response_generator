import { Table, HelpCircle } from 'lucide-react';
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
                <Table className="h-8 w-8 text-primary" />
                <h1 className="ml-2 text-xl font-semibold text-slate-800">Excel Requirements Analyzer</h1>
              </div>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
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
