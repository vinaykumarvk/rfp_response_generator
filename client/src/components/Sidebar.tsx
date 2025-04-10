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
  Terminal
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
      title: 'View Uploaded Data',
      icon: <FileText className="h-5 w-5" />,
      path: '/view-data',
      active: location === '/view-data'
    },
    {
      title: 'Generate Response',
      icon: <MessageSquare className="h-5 w-5" />,
      path: '/generate-response',
      active: location === '/generate-response'
    },
    {
      title: 'Generated Responses',
      icon: <BookOpen className="h-5 w-5" />,
      path: '/generated-responses',
      active: location === '/generated-responses'
    },
    {
      title: 'LLM Test',
      icon: <Terminal className="h-5 w-5" />,
      path: '/llm-test',
      active: location === '/llm-test'
    },
    {
      title: 'API Test',
      icon: <Terminal className="h-5 w-5" />,
      path: '/simple-api-test',
      active: location === '/simple-api-test'
    },
    {
      title: 'LLM Response Viewer',
      icon: <BookOpen className="h-5 w-5" />,
      path: '/llm-response-viewer',
      active: location === '/llm-response-viewer'
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

  // Render mobile menu overlay
  if (isMobile && mobileMenuOpen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
        <div className="bg-white dark:bg-slate-800 w-[250px] h-full">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <div className="flex items-center">
              <img src={intellectLogo} alt="intellectAI Logo" className="h-6 w-auto" />
              <h2 className="ml-2 font-semibold text-slate-800 dark:text-slate-100">RFP Generator</h2>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleMobileMenu}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 p-2">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link href={item.path}>
                    <span 
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer",
                        item.active 
                          ? "bg-slate-100 dark:bg-slate-700 text-primary font-medium" 
                          : "text-slate-700 dark:text-slate-200"
                      )}
                    >
                      <span className="flex-shrink-0 mr-3">
                        {item.icon}
                      </span>
                      <span>{item.title}</span>
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

  // On mobile, show a fixed menu button
  if (isMobile) {
    return (
      <div className="fixed bottom-4 left-4 z-40">
        <Button 
          onClick={toggleMobileMenu} 
          className="rounded-full h-12 w-12 shadow-lg"
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
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          {!collapsed && (
            <div className="flex items-center">
              <img src={intellectLogo} alt="intellectAI Logo" className="h-6 w-auto" />
              <h2 className="ml-2 font-semibold text-slate-800 dark:text-slate-100">RFP Generator</h2>
            </div>
          )}
          {collapsed && (
            <img src={intellectLogo} alt="intellectAI Logo" className="h-6 w-auto mx-auto" />
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCollapsed(!collapsed)}
            className={!collapsed ? "ml-auto" : "ml-auto mt-3"}
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