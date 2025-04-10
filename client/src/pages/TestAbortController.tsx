import React, { useState, useRef } from "react";
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
  
  // Reference to the abort controller
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Add a log message
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
    
    addLog("Starting AbortController test");
    
    try {
      // Create a new AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      addLog("Created AbortController");
      
      // Make a simulated API request that takes a while to complete
      addLog("Starting fetch request with 10 second timeout");
      
      // Show progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 500);
      
      try {
        // Use a dummy endpoint with a long timeout to simulate a long API call
        const response = await fetch("/api/echo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "This is a test request with abort controller",
            sleep: 10000 // 10 seconds timeout
          }),
          signal: controller.signal // Connect the AbortController signal to the fetch
        });
        
        // If we get here, the request completed without being cancelled
        addLog("Fetch request completed successfully");
        clearInterval(progressInterval);
        setProgress(100);
        
        const data = await response.json();
        addLog(`Response data: ${JSON.stringify(data)}`);
        
        setTestResult({
          success: true,
          message: "Request completed without cancellation"
        });
      } catch (error) {
        // This is where we'll end up if the request is aborted
        clearInterval(progressInterval);
        
        if (error instanceof DOMException && error.name === "AbortError") {
          addLog("Fetch request was successfully aborted");
          setTestResult({
            success: true,
            message: "Request was successfully cancelled with AbortController"
          });
        } else {
          addLog(`Fetch error: ${error}`);
          setTestResult({
            success: false,
            message: `Error during fetch: ${error}`
          });
        }
      }
    } catch (error) {
      addLog(`Test error: ${error}`);
      setTestResult({
        success: false,
        message: `Error during test: ${error}`
      });
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };
  
  // Cancel the running test
  const cancelTest = () => {
    if (!abortControllerRef.current) {
      addLog("No active AbortController to cancel");
      return;
    }
    
    addLog("Cancelling request via AbortController");
    toast({
      title: "Cancelling request",
      description: "Aborting the fetch request",
      variant: "default"
    });
    
    // This is the key part - calling abort() on the controller
    abortControllerRef.current.abort();
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
  if (error instanceof DOMException && error.name === "AbortError") {
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