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
  
  return (
    <div className="border rounded-lg bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      {/* Category header with toggle */}
      <div 
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 border-b"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Checkbox 
            id={`select-category-${category}`}
            checked={allSelected && items.length > 0}
            onCheckedChange={handleSelectAll}
            onClick={(e) => e.stopPropagation()} 
          />
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{category}</h3>
            <Badge variant="outline" className="text-xs">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </div>
      
      {/* Collapsible content */}
      {isExpanded && (
        <div className="p-3 space-y-2">
          {items.map((row, index) => {
            const isSelected = row.id ? selectedItems.includes(row.id) : false;
            
            return (
              <Card 
                key={row.id || index} 
                className={`overflow-hidden border relative transition-all duration-200 ${
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
                      {/* Compact single-line attributes */}
                      <div className="flex flex-wrap items-center gap-1 mb-1.5">
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
                      
                      {/* Action buttons and timestamp in one row */}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
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
                            title={row.finalResponse ? "View response" : "No response available yet"}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
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
                            title={row.similarQuestions ? "View references" : "No references available yet"}
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>References</span>
                          </Button>
                        </div>
                        
                        {/* Timestamp */}
                        {row.timestamp && (
                          <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 ml-auto pl-2">
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