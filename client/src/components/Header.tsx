import { Table, HelpCircle, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Header() {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <Table className="h-8 w-8 text-primary" />
                <h1 className="ml-2 text-xl font-semibold text-slate-800 dark:text-slate-100 hidden sm:block">Excel Requirements Analyzer</h1>
                <h1 className="ml-2 text-xl font-semibold text-slate-800 dark:text-slate-100 sm:hidden">RFP Analyzer</h1>
              </div>
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Button variant="outline" className="flex items-center space-x-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Help</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
