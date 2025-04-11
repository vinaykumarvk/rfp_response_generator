import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { 
  Upload, 
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Archive,
  BookOpen,
  Menu,
  X,
  FileText,
  Terminal,
  TerminalSquare
} from 'lucide-react';
import intellectLogo from '@assets/intellect_logo.png';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  const navItems = [
    {
      title: 'Upload Requirements',
      icon: <Upload className="h-5 w-5" />,
      path: '/',
      active: location === '/'
    },
    {
      title: 'View Requirements',
      icon: <FileText className="h-5 w-5" />,
      path: '/view-data',
      active: location === '/view-data'
    },
    {
      title: 'Standalone Response',
      icon: <BookOpen className="h-5 w-5" />,
      path: '/llm-response-viewer',
      active: location === '/llm-response-viewer'
    },
    {
      title: 'MOA Test Tool',
      icon: <Terminal className="h-5 w-5" />,
      path: '/moa-test',
      active: location === '/moa-test'
    }
  ];

  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // When a link is clicked on mobile, close the menu
  const handleLinkClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  // Render mobile menu overlay with improved UX and transitions
  if (isMobile && mobileMenuOpen) {
    return (
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end"
        onClick={(e) => {
          // Close when clicking outside the menu
          if (e.target === e.currentTarget) {
            toggleMobileMenu();
          }
        }}
      >
        <div className="bg-white dark:bg-slate-800 w-full max-w-[300px] h-full shadow-xl animate-in slide-in-from-right">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">Menu</h2>
            <Button 
              variant="ghost" 
              size="sm"
              className="rounded-full h-8 w-8 p-0"
              onClick={toggleMobileMenu}
              aria-label="Close menu"
              title="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link href={item.path}>
                    <span 
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center rounded-md px-4 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors",
                        item.active 
                          ? "bg-primary/10 dark:bg-primary/20 text-primary font-medium border-l-4 border-primary" 
                          : "text-slate-700 dark:text-slate-200"
                      )}
                    >
                      <span className="flex-shrink-0 mr-4">
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.title}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            
            <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 px-4">Version 0.3</div>
            </div>
          </nav>
        </div>
      </div>
    );
  }

  // On mobile, show a fixed menu button with better positioning and visual feedback
  if (isMobile) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Button 
          onClick={toggleMobileMenu} 
          className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90 transition-all duration-200 flex items-center justify-center"
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  // Desktop sidebar
  return (
    <div 
      className={cn(
        "border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all duration-300 h-full",
        collapsed ? "w-[70px]" : "w-[250px]"
      )}
    >
      <div className="flex flex-col h-full">
        <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex justify-end items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 p-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path}>
                  <span 
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer",
                      item.active 
                        ? "bg-slate-100 dark:bg-slate-700 text-primary font-medium" 
                        : "text-slate-700 dark:text-slate-200",
                      collapsed && "justify-center"
                    )}
                    title={item.title}
                  >
                    <span className={cn("flex-shrink-0", collapsed ? "" : "mr-3")}>
                      {item.icon}
                    </span>
                    {!collapsed && <span>{item.title}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}