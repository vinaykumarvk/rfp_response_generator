import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * Test component to verify and debug cancel button functionality
 * This component simulates the response generation process with various delays
 * and checks if the cancellation mechanism works correctly.
 */
export default function TestCancelButton() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCanceled, setIsCanceled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [itemsProcessed, setItemsProcessed] = useState(0);
  const [totalItems, setTotalItems] = useState(10);
  const [testCase, setTestCase] = useState("basic");
  const [testResults, setTestResults] = useState<Array<{
    testCase: string;
    passed: boolean;
    message: string;
    timestamp: Date;
  }>>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // Add log message
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().split("T")[1].substring(0, 8)} - ${message}`]);
  };

  // Handle cancellation
  const handleCancel = () => {
    addLog("Cancel requested");
    setIsCanceled(true);
    toast({
      title: "Canceling...",
      description: "Stopping the process. Please wait...",
      variant: "default"
    });
  };

  // Record test result
  const recordTestResult = (testCase: string, passed: boolean, message: string) => {
    setTestResults(prev => [...prev, {
      testCase,
      passed,
      message,
      timestamp: new Date()
    }]);
    
    if (passed) {
      toast({
        title: "Test Passed",
        description: message,
        variant: "default"
      });
    } else {
      toast({
        title: "Test Failed",
        description: message,
        variant: "destructive"
      });
    }
  };

  // Clear logs and results
  const resetTests = () => {
    setLogs([]);
    setTestResults([]);
  };

  // Test 1: Basic cancellation test
  const runBasicTest = async () => {
    setIsProcessing(true);
    setProgress(0);
    setItemsProcessed(0);
    setIsCanceled(false);
    setTotalItems(10);
    addLog("Starting basic test");

    try {
      for (let i = 0; i < 10; i++) {
        if (isCanceled) {
          addLog("Cancellation detected, exiting loop");
          recordTestResult("basic", true, "Successfully detected cancellation and stopped processing");
          break;
        }

        addLog(`Processing item ${i + 1}`);
        setItemsProcessed(i + 1);
        setProgress(Math.round(((i + 1) / 10) * 100));
        
        // Wait for 500ms to simulate processing
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!isCanceled) {
        addLog("Completed all items without cancellation");
        recordTestResult("basic", true, "Successfully processed all items");
      }
    } catch (error) {
      addLog(`Error in basic test: ${error}`);
      recordTestResult("basic", false, `Error occurred: ${error}`);
    } finally {
      setIsProcessing(false);
      setIsCanceled(false);
    }
  };

  // Test 2: API call cancellation
  const runApiCallTest = async () => {
    setIsProcessing(true);
    setProgress(0);
    setItemsProcessed(0);
    setIsCanceled(false);
    setTotalItems(5);
    addLog("Starting API call test");

    try {
      for (let i = 0; i < 5; i++) {
        // Check for cancellation before starting API call
        if (isCanceled) {
          addLog("Cancellation detected before API call, exiting loop");
          recordTestResult("apiCall", true, "Successfully detected cancellation before API call");
          break;
        }

        addLog(`Preparing API call for item ${i + 1}`);
        
        // Simulate long-running API call (3 seconds)
        addLog(`Starting API call for item ${i + 1}`);
        
        // Use a timeout instead of directly awaiting to allow cancellation during the call
        let apiCallCompleted = false;
        
        // Start the timer for the API call
        const apiCallTimer = setTimeout(() => {
          if (!isCanceled) {
            apiCallCompleted = true;
            addLog(`API call completed for item ${i + 1}`);
          }
        }, 3000);
        
        // Poll for cancellation every 100ms during the API call
        let elapsedTime = 0;
        while (elapsedTime < 3000 && !apiCallCompleted && !isCanceled) {
          await new Promise(resolve => setTimeout(resolve, 100));
          elapsedTime += 100;
          setProgress(Math.round((i * 20) + (elapsedTime / 3000) * 20));
        }
        
        // Clear the timer if we exited early
        clearTimeout(apiCallTimer);
        
        // Check for cancellation after API call
        if (isCanceled) {
          addLog("Cancellation detected during API call, exiting loop");
          recordTestResult("apiCall", true, "Successfully detected cancellation during API call");
          break;
        }
        
        // Update progress
        setItemsProcessed(i + 1);
        setProgress((i + 1) * 20);
      }

      if (!isCanceled) {
        addLog("Completed all API calls without cancellation");
        recordTestResult("apiCall", true, "Successfully processed all API calls");
      }
    } catch (error) {
      addLog(`Error in API call test: ${error}`);
      recordTestResult("apiCall", false, `Error occurred: ${error}`);
    } finally {
      setIsProcessing(false);
      setIsCanceled(false);
    }
  };

  // Test 3: Nested promises test
  const runNestedPromisesTest = async () => {
    setIsProcessing(true);
    setProgress(0);
    setItemsProcessed(0);
    setIsCanceled(false);
    setTotalItems(3);
    addLog("Starting nested promises test");

    try {
      for (let i = 0; i < 3; i++) {
        if (isCanceled) {
          addLog("Cancellation detected at top level, exiting loop");
          recordTestResult("nestedPromises", true, "Successfully detected cancellation at top level");
          break;
        }

        addLog(`Processing item ${i + 1} with nested promises`);
        
        // First level promise
        addLog(`Starting first level promise for item ${i + 1}`);
        await new Promise(async (resolve) => {
          // Check for cancellation inside first level
          if (isCanceled) {
            addLog("Cancellation detected in first level promise");
            resolve(undefined);
            return;
          }
          
          // Set progress for first level
          setProgress(Math.round((i * 33) + 10));
          await new Promise(r => setTimeout(r, 500));
          
          // Second level promise
          addLog(`Starting second level promise for item ${i + 1}`);
          await new Promise(async (innerResolve) => {
            // Check for cancellation inside second level
            if (isCanceled) {
              addLog("Cancellation detected in second level promise");
              innerResolve(undefined);
              resolve(undefined);
              return;
            }
            
            // Set progress for second level
            setProgress(Math.round((i * 33) + 20));
            await new Promise(r => setTimeout(r, 500));
            
            // Simulate work in the innermost promise
            addLog(`Starting innermost work for item ${i + 1}`);
            
            // Check for cancellation periodically during long work
            for (let j = 0; j < 10; j++) {
              if (isCanceled) {
                addLog("Cancellation detected during innermost work");
                innerResolve(undefined);
                resolve(undefined);
                break;
              }
              
              setProgress(Math.round((i * 33) + 20 + j));
              await new Promise(r => setTimeout(r, 200));
            }
            
            innerResolve(undefined);
          });
          
          resolve(undefined);
        });
        
        // Final check after all nested promises
        if (isCanceled) {
          addLog("Cancellation detected after nested promises");
          break;
        }
        
        // Update progress after completed item
        setItemsProcessed(i + 1);
        setProgress((i + 1) * 33);
      }

      if (!isCanceled) {
        addLog("Completed all nested promises without cancellation");
        recordTestResult("nestedPromises", true, "Successfully processed all nested promises");
      }
    } catch (error) {
      addLog(`Error in nested promises test: ${error}`);
      recordTestResult("nestedPromises", false, `Error occurred: ${error}`);
    } finally {
      setIsProcessing(false);
      setIsCanceled(false);
    }
  };

  // Start the selected test
  const startTest = () => {
    if (isProcessing) return;
    
    switch (testCase) {
      case "basic":
        runBasicTest();
        break;
      case "apiCall":
        runApiCallTest();
        break;
      case "nestedPromises":
        runNestedPromisesTest();
        break;
      default:
        toast({
          title: "Invalid Test Case",
          description: "Please select a valid test case",
          variant: "destructive"
        });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Cancel Button Testing Tool</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-md shadow border">
            <h2 className="text-lg font-semibold mb-4">Test Controls</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Test Case</label>
                <select 
                  value={testCase}
                  onChange={(e) => setTestCase(e.target.value)}
                  className="w-full p-2 border rounded"
                  disabled={isProcessing}
                >
                  <option value="basic">Basic Cancellation</option>
                  <option value="apiCall">API Call Cancellation</option>
                  <option value="nestedPromises">Nested Promises Cancellation</option>
                </select>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={startTest}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running...
                    </span>
                  ) : "Start Test"}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={resetTests}
                  disabled={isProcessing}
                >
                  Reset Tests
                </Button>
              </div>
            </div>
          </div>
          
          {isProcessing && (
            <div className="bg-white p-4 rounded-md shadow border">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Test Progress</h3>
                <span className="text-sm">{itemsProcessed} of {totalItems} items</span>
              </div>
              
              <Progress value={progress} animated={true} className="h-2 mb-4" />
              
              <Button 
                variant="destructive" 
                onClick={handleCancel}
                className="w-full"
                disabled={isCanceled}
              >
                {isCanceled ? "Canceling..." : "Cancel Test"}
              </Button>
            </div>
          )}
          
          <div className="bg-white p-4 rounded-md shadow border">
            <h2 className="text-lg font-semibold mb-4">Test Results</h2>
            
            {testResults.length === 0 ? (
              <p className="text-gray-500">No tests have been run yet.</p>
            ) : (
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-md ${result.passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium">{result.testCase}</h4>
                      <span className={`text-sm font-semibold ${result.passed ? "text-green-600" : "text-red-600"}`}>
                        {result.passed ? "PASSED" : "FAILED"}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{result.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {result.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-md shadow border">
          <h2 className="text-lg font-semibold mb-4">Logs</h2>
          
          <div className="bg-gray-100 p-3 rounded-md h-[500px] overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="pb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}