import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HelpTooltipProps {
  text: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  iconSize?: number;
}

export function HelpTooltip({ 
  text, 
  side = "top", 
  className = "", 
  iconSize = 16 
}: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center cursor-help ${className}`}>
            <HelpCircle className="text-muted-foreground hover:text-primary transition-colors" size={iconSize} />
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-sm text-sm bg-background border border-border p-3 shadow-lg rounded-lg">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}