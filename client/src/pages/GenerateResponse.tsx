import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Loader2 } from "lucide-react";

// Define the structure of our parsed Excel data
interface ExcelRow {
  id?: number;
  category: string;
  requirement: string;
  finalResponse?: string;
  timestamp?: string;
  rating?: number;
}

export default function GenerateResponse() {
  const [requirements, setRequirements] = useState<ExcelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequirement, setSelectedRequirement] = useState<string>("");
  const [responseText, setResponseText] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    // Fetch the data from the API
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/excel-requirements");
        if (response.ok) {
          const data = await response.json();
          setRequirements(data);
        } else {
          console.error("Failed to fetch data");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRequirementChange = (value: string) => {
    setSelectedRequirement(value);
    // Clear the response when selecting a new requirement
    setResponseText("");
  };

  const handleGenerateResponse = async () => {
    if (!selectedRequirement) return;
    
    setGenerating(true);
    
    try {
      // In a real implementation, this would call an AI service or custom logic
      // For now, we'll simulate a response generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const selectedItem = requirements.find(req => req.id?.toString() === selectedRequirement);
      
      if (selectedItem) {
        setResponseText(`Our solution for "${selectedItem.requirement}" provides a comprehensive approach that addresses this requirement through the following:

1. Implementation of industry-standard best practices
2. Customizable configuration to meet specific needs
3. Continuous monitoring and reporting capabilities
4. Full compliance with relevant regulations
5. Extensive documentation and support resources`);
        
        // In a real implementation, we would also save this response to the database
        const response = await fetch(`/api/excel-requirements/${selectedRequirement}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            finalResponse: responseText
          })
        });
        
        if (!response.ok) {
          console.error("Failed to save response");
        }
      }
    } catch (error) {
      console.error("Error generating response:", error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="h-full">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Generate Response</h2>
        
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <div className="px-6 py-5 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-800">Select Requirement</h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose a requirement to generate a response.
              </p>
            </div>
            
            <CardContent className="p-6">
              {loading ? (
                <div className="text-center py-4">Loading requirements...</div>
              ) : requirements.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="requirement-select">Requirement</Label>
                    <Select value={selectedRequirement} onValueChange={handleRequirementChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a requirement" />
                      </SelectTrigger>
                      <SelectContent>
                        {requirements.map((req) => (
                          <SelectItem key={req.id} value={req.id?.toString() || ""}>
                            {req.category}: {req.requirement}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={handleGenerateResponse}
                    disabled={!selectedRequirement || generating}
                    className="w-full"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Generate Response
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-500">No requirements available. Please upload Excel files first.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {responseText && (
            <Card>
              <div className="px-6 py-5 border-b border-slate-200">
                <h3 className="text-lg font-medium text-slate-800">Generated Response</h3>
                <p className="mt-1 text-sm text-slate-500">
                  This response addresses the selected requirement.
                </p>
              </div>
              
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Textarea 
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="min-h-[200px]"
                  />
                  
                  <div className="flex justify-end space-x-3">
                    <Button variant="outline">
                      Copy to Clipboard
                    </Button>
                    <Button>
                      Save Response
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}