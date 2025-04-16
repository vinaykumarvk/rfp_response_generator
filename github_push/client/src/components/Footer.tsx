import { Github, Linkedin, Twitter, Mail, Heart } from 'lucide-react';
import { useIsMobile, useScreenSize } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import intellectLogo from '@assets/intellect_logo.png';

export default function Footer() {
  const isMobile = useIsMobile();
  const screenSize = useScreenSize();
  
  return (
    <footer className="bg-white dark:bg-slate-800 shadow-sm border-t border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Full footer for desktop */}
        <div className="hidden md:flex py-6 justify-between items-center">
          <div className="flex items-center">
            <img src={intellectLogo} alt="intellectAI Logo" className="h-6 w-auto mr-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">RFP Response Generator</p>
          </div>
          
          {/* Quick links */}
          <div className="flex space-x-6 text-sm">
            <a href="#" className="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors">
              Documentation
            </a>
            <a href="#" className="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors">
              API
            </a>
            <a href="#" className="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors">
              Pricing
            </a>
            <a href="#" className="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors">
              Support
            </a>
          </div>
          
          {/* Social links */}
          <div className="flex space-x-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Github className="h-4 w-4" />
              <span className="sr-only">GitHub</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Linkedin className="h-4 w-4" />
              <span className="sr-only">LinkedIn</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Twitter className="h-4 w-4" />
              <span className="sr-only">Twitter</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Mail className="h-4 w-4" />
              <span className="sr-only">Email</span>
            </Button>
          </div>
        </div>
        
        {/* Compact footer for mobile */}
        <div className="md:hidden py-4">
          <div className="flex justify-center mb-3">
            <div className="flex space-x-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Github className="h-4 w-4" />
                <span className="sr-only">GitHub</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Linkedin className="h-4 w-4" />
                <span className="sr-only">LinkedIn</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Twitter className="h-4 w-4" />
                <span className="sr-only">Twitter</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Copyright notice */}
        <div className="py-3 text-center border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center">
            Made with <Heart className="h-3 w-3 mx-1 text-red-500" /> by intellectAI &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
