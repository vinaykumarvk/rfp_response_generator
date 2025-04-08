import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { 
  Upload, 
  Table, 
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Archive,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      title: 'Upload Requirements',
      icon: <Upload className="h-5 w-5" />,
      path: '/',
      active: location === '/'
    },
    {
      title: 'View Uploaded Data',
      icon: <Table className="h-5 w-5" />,
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
    }
  ];

  return (
    <div 
      className={cn(
        "border-r border-slate-200 bg-white transition-all duration-300 h-full",
        collapsed ? "w-[70px]" : "w-[250px]"
      )}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          {!collapsed && (
            <h2 className="font-semibold text-slate-800">Excel Analyzer</h2>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
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
                      "flex items-center rounded-md px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer",
                      item.active ? "bg-slate-100 text-primary font-medium" : "text-slate-700",
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