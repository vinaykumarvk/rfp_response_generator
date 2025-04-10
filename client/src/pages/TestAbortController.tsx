import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Clock, Info, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/**
 * Test component for AbortController implementation
 * Demonstrates how to properly use AbortController with fetch requests
 * to make them cancellable
 */
export default function TestAbortController() {
  // State for keeping track of the test process
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  
  // Store controller in state instead of ref
  const [controller, setController] = useState<AbortController | null>(null);
  
  // Add a log message with timestamp
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };
  
  // Start the test
  const startTest = async () => {
    // Reset state
    setIsRunning(true);
    setProgress(0);
    setLogs([]);
    setTestResult(null);
    
    // Create new controller and store in state
    const newController = new AbortController();
    setController(newController);
    
    addLog("Starting AbortController test");
    addLog("Created AbortController");
    addLog("Starting fetch request with 10 second timeout");
    
    // Progress interval
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 95));
    }, 500);
    
    try {
      // Perform fetch with signal
      const response = await fetch("/api/echo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Test request",
          sleep: 10000 // 10 seconds delay
        }),
        signal: newController.signal
      });
      
      // Request completed successfully
      clearInterval(progressInterval);
      setProgress(100);
      addLog("Fetch completed successfully");
      
      const data = await response.json();
      addLog(`Response: ${JSON.stringify(data)}`);
      
      setTestResult({
        success: true,
        message: "Request completed without cancellation"
      });
    } catch (error: any) {
      clearInterval(progressInterval);
      
      // Check for AbortError
      if (error.name === "AbortError") {
        addLog("Request was successfully aborted!");
        setProgress(0);
        setTestResult({
          success: true,
          message: "Request was successfully cancelled"
        });
      } else {
        addLog(`Error: ${error.message}`);
        setTestResult({
          success: false,
          message: `An error occurred: ${error.message}`
        });
      }
    } finally {
      setIsRunning(false);
      // Don't clear controller here, we'll do it in cancelTest
    }
  };
  
  // Cancel the request
  const cancelTest = () => {
    if (!controller) {
      addLog("No active controller to cancel");
      return;
    }
    
    addLog("Attempting to cancel request...");
    
    try {
      // Simple direct abort call
      controller.abort();
      addLog("Abort signal sent successfully");
      
      toast({
        title: "Request cancelled",
        description: "Cancel signal sent to the API request",
      });
    } catch (error: any) {
      addLog(`Error cancelling: ${error.message}`);
      console.error("Error during cancellation:", error);
      
      toast({
        title: "Cancellation error",
        description: `Failed to cancel: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      // Reset controller after cancellation
      setController(null);
    }
  };
  
  // Clear all logs and results
  const clearLogs = () => {
    setLogs([]);
    setTestResult(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">AbortController Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
            <CardDescription>
              Start a long-running fetch request that can be cancelled with AbortController
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isRunning ? (
                <>
                  <div className="mb-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Request in progress</span>
                      <span className="text-sm text-gray-500">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  
                  <Button 
                    variant="destructive" 
                    onClick={cancelTest} 
                    className="w-full"
                  >
                    Cancel Request
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={startTest} 
                  className="w-full"
                >
                  Start Test Request
                </Button>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-gray-500">
              Tests proper implementation of AbortController
            </div>
            <Button variant="outline" size="sm" onClick={clearLogs} disabled={isRunning}>
              Clear Logs
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Output from the AbortController test
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResult && (
              <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex gap-2 items-center mb-1">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {testResult.success ? 'Success' : 'Error'}
                  </span>
                </div>
                <p className="text-sm">{testResult.message}</p>
              </div>
            )}
            
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Logs
              </h3>
              <div className="bg-gray-50 p-3 rounded-md h-[300px] overflow-y-auto font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-gray-400 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    No logs yet. Start the test to see output.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="pb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Implementation Notes</CardTitle>
            <CardDescription>
              How to properly implement AbortController for cancellable fetch requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">1. Create an AbortController</h3>
                <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto text-xs">
                  {`const controller = new AbortController();`}
                </pre>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">2. Pass the signal to fetch</h3>
                <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto text-xs">
                  {`const response = await fetch("/api/endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
  signal: controller.signal // This connects the controller to the fetch
});`}
                </pre>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">3. Call abort() to cancel the request</h3>
                <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto text-xs">
                  {`// When the user wants to cancel:
controller.abort();`}
                </pre>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">4. Handle the AbortError</h3>
                <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto text-xs">
                  {`try {
  const response = await fetch("/api/endpoint", { signal: controller.signal });
  // Process response
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Fetch was cancelled");
  } else {
    console.error("Other fetch error:", error);
  }
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}