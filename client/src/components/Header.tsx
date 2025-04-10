import { HelpCircle, Info, Sparkles, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useState } from 'react';
import { useIsMobile, useScreenSize } from '@/hooks/use-mobile';
import { ThemeToggle } from '@/components/ThemeToggle';
import intellectLogo from '@assets/intellect_logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Header() {
  const isMobile = useIsMobile();
  const screenSize = useScreenSize();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 md:py-4">
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <img 
                  src={intellectLogo} 
                  alt="intellectAI Logo" 
                  className="h-8 w-auto"
                />
                {/* Responsive heading with gradient text on larger screens */}
                <h1 className="ml-3 text-lg font-bold text-slate-800 dark:text-slate-100 hidden sm:block md:text-xl lg:text-2xl bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">
                  RFP Response Generator
                </h1>
                {/* Shortened heading for mobile */}
                <h1 className="ml-3 text-lg font-bold text-slate-800 dark:text-slate-100 sm:hidden">
                  RFP Gen
                </h1>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {/* Badge showing version */}
            <div className="hidden md:flex items-center px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              v0.3
            </div>
            
            <ThemeToggle />
            
            {screenSize === 'xs' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                    <Info className="h-4 w-4" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Help</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span>New Features</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Export</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Help</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Get help using the app</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
