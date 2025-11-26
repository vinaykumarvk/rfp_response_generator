import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  MessageSquare, 
  BookOpen, 
  Check,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ExcelRequirementResponse } from '@shared/schema';

type CategoryGroupProps = {
  category: string;
  items: ExcelRequirementResponse[];
  selectedItems: number[];
  setSelectedItems: React.Dispatch<React.SetStateAction<number[]>>;
  processingIndividualItems: {[key: number]: {stage: string, model: string}};
  handleViewResponse: (row: ExcelRequirementResponse) => void;
  toggleSelectItem: (id: number) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
};

const CategoryGroup: React.FC<CategoryGroupProps> = ({
  category,
  items,
  selectedItems,
  setSelectedItems,
  processingIndividualItems,
  handleViewResponse,
  toggleSelectItem,
  setActiveTab
}) => {
  // Track if this category is expanded (starts expanded by default)
  const [isExpanded, setIsExpanded] = React.useState(true);
  
  // Check if all items in this category are selected
  const allSelected = items.every(
    item => item.id && selectedItems.includes(item.id)
  );
  
  // Handle selecting all items in this category
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Add all item IDs that aren't already selected
      const itemsToAdd = items
        .filter(item => item.id && !selectedItems.includes(item.id))
        .map(item => item.id)
        .filter(Boolean) as number[];
      
      setSelectedItems(prev => [...prev, ...itemsToAdd]);
    } else {
      // Remove all item IDs from this category
      const itemIdsToRemove = new Set(items.map(item => item.id).filter(Boolean));
      setSelectedItems(prev => prev.filter(id => !itemIdsToRemove.has(id)));
    }
  };

  // Get model-specific color classes for styling badges
  const getModelColorClasses = (modelProvider: string | null) => {
    switch(modelProvider) {
      case 'openai':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      case 'anthropic':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-200 border-purple-200 dark:border-purple-800';
      case 'deepseek':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200 border-amber-200 dark:border-amber-800';
      case 'moa':
        return 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200 border-green-200 dark:border-green-800';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
    }
  };
  
  // ACCESSIBILITY: Handle keyboard events for expander
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="border rounded-lg bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      {/* ACCESSIBILITY: Category header with toggle - converted to button for keyboard operability */}
      <button
        type="button"
        className="w-full p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 border-b focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-controls={`category-content-${category}`}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category} category`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Checkbox 
            id={`select-category-${category}`}
            checked={allSelected && items.length > 0}
            onCheckedChange={handleSelectAll}
            onClick={(e) => e.stopPropagation()} 
          />
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold">{category}</h3>
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 transform transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      
      {/* Collapsible content */}
      {isExpanded && (
        <div id={`category-content-${category}`} className="p-3 space-y-2">
          {items.map((row, index) => {
            const isSelected = row.id ? selectedItems.includes(row.id) : false;
            
            return (
              <Card 
                key={row.id || index} 
                className={`overflow-hidden border relative transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-800 ${
                  isSelected ? 'border-blue-400 dark:border-blue-600 shadow-md' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-start">
                    <div className="mr-2 sm:mr-3 pt-1">
                      {row.id && (
                        <Checkbox 
                          id={`select-${row.id}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectItem(row.id || 0)}
                        />
                      )}
                    </div>
                    
                    {/* Processing Indicator */}
                    {row.id && processingIndividualItems[row.id] && (
                      <div className="absolute top-1 right-1 z-10">
                        <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full px-2 py-0.5 shadow-sm border border-blue-200 dark:border-blue-800">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>{processingIndividualItems[row.id].stage}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {/* ACCESSIBILITY & MOBILE: Compact attributes with flex-wrap to prevent overflow */}
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-1.5">
                        {/* ID Badge */}
                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
                          ID: {row.id}
                        </Badge>
                        
                        {/* Category Badge */}
                        <Badge variant="outline" className="text-[10px] sm:text-xs bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                          {row.category}
                        </Badge>
                        
                        {/* RFP Badge */}
                        {row.rfpName && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200 border-blue-200 dark:border-blue-800">
                            {row.rfpName}
                          </Badge>
                        )}
                        
                        {/* Status tag with Model Provider - now with consistent color coding */}
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] sm:text-xs px-1.5 py-0 ${
                            row.finalResponse ? getModelColorClasses(row.modelProvider) : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {row.finalResponse ? (
                            <>
                              <Check className="h-3 w-3 mr-0.5" /> 
                              {row.modelProvider === 'openai' ? 'OpenAI' : 
                              row.modelProvider === 'anthropic' ? 'Anthropic' : 
                              row.modelProvider === 'deepseek' ? 'DeepSeek' : 
                              row.modelProvider === 'moa' ? 'MOA' : 
                              'Generated'}
                            </>
                          ) : (
                            'Not Generated'
                          )}
                        </Badge>
                      </div>
                      
                      {/* Requirement text */}
                      <div className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 line-clamp-3 mb-2">
                        {row.requirement}
                      </div>
                      
                      {/* MOBILE: Action buttons stack on small screens, timestamp moves below */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant={row.finalResponse ? "default" : "outline"}
                            className={`h-7 px-2 gap-1 text-xs ${!row.finalResponse ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (row.finalResponse) {
                                setActiveTab('response');
                                handleViewResponse(row);
                              }
                            }}
                            disabled={!row.finalResponse}
                            aria-label={row.finalResponse ? "View response" : "No response available yet"}
                          >
                            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Response</span>
                          </Button>
                          
                          <Button
                            size="sm"
                            variant={row.similarQuestions ? "secondary" : "outline"}
                            className={`h-7 px-2 gap-1 text-xs ${!row.similarQuestions ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (row.similarQuestions) {
                                setActiveTab('references');
                                handleViewResponse(row);
                              }
                            }}
                            disabled={!row.similarQuestions}
                            aria-label={row.similarQuestions ? "View references" : "No references available yet"}
                          >
                            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>References</span>
                          </Button>
                        </div>
                        
                        {/* ACCESSIBILITY: Improved contrast for timestamp */}
                        {row.timestamp && (
                          <div className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-300 sm:ml-auto sm:pl-2">
                            {(() => {
                              try {
                                return formatDistanceToNow(new Date(row.timestamp), { addSuffix: true });
                              } catch (e) {
                                return String(row.timestamp);
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryGroup;