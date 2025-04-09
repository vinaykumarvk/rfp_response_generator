import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Direct test implementation
const testOpenAiApi = async () => {
  try {
    // Create a module to use OpenAI
    const module = `
      import os
      import json
      from openai import OpenAI
      
      api_key = os.environ.get("OPENAI_API_KEY")
      
      if not api_key:
          print(json.dumps({
              "success": False,
              "error": "OpenAI API key not found in environment"
          }))
          exit(1)
      
      try:
          client = OpenAI(api_key=api_key)
          response = client.chat.completions.create(
              model="gpt-4o",
              messages=[
                  {"role": "system", "content": "You are a helpful assistant."},
                  {"role": "user", "content": "Please respond with a short test message."}
              ],
              max_tokens=50
          )
          
          print(json.dumps({
              "success": True,
              "message": "OpenAI API connection successful",
              "response": response.choices[0].message.content
          }))
      except Exception as e:
          print(json.dumps({
              "success": False,
              "error": str(e)
          }))
    `;
    
    // Save to a temp file
    const tempFilename = `test_openai_${Date.now()}.py`;
    
    // Use the fetch API to ask the server to create and run this file
    const fileCreateResponse = await fetch('/api/echo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create_temp_file',
        filename: tempFilename,
        content: module
      })
    });
    
    // If file creation fails, return error
    if (!fileCreateResponse.ok) {
      throw new Error('Failed to create temporary test file');
    }
    
    // Run the command to execute the Python script
    const executeResponse = await fetch('/api/echo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'execute_python',
        filename: tempFilename
      })
    });
    
    // Parse the response
    const result = await executeResponse.json();
    
    // Clean up the temp file
    await fetch('/api/echo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'delete_temp_file',
        filename: tempFilename
      })
    });
    
    return result;
  } catch (error) {
    console.error("Error testing OpenAI API:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Same process for Anthropic
const testAnthropicApi = async () => {
  try {
    // Create a module to use Anthropic
    const module = `
      import os
      import json
      from anthropic import Anthropic
      
      api_key = os.environ.get("ANTHROPIC_API_KEY")
      
      if not api_key:
          print(json.dumps({
              "success": False,
              "error": "Anthropic API key not found in environment"
          }))
          exit(1)
      
      try:
          client = Anthropic(api_key=api_key)
          response = client.messages.create(
              model="claude-3-7-sonnet-20250219", 
              max_tokens=50,
              messages=[
                  {"role": "user", "content": "Please respond with a short test message."}
              ]
          )
          
          print(json.dumps({
              "success": True,
              "message": "Anthropic API connection successful",
              "response": response.content[0].text
          }))
      except Exception as e:
          print(json.dumps({
              "success": False,
              "error": str(e)
          }))
    `;
    
    // Save to a temp file
    const tempFilename = `test_anthropic_${Date.now()}.py`;
    
    // Use the fetch API to ask the server to create and run this file
    const fileCreateResponse = await fetch('/api/echo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create_temp_file',
        filename: tempFilename,
        content: module
      })
    });
    
    // If file creation fails, return error
    if (!fileCreateResponse.ok) {
      throw new Error('Failed to create temporary test file');
    }
    
    // Run the command to execute the Python script
    const executeResponse = await fetch('/api/echo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'execute_python',
        filename: tempFilename
      })
    });
    
    // Parse the response
    const result = await executeResponse.json();
    
    // Clean up the temp file
    await fetch('/api/echo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'delete_temp_file',
        filename: tempFilename
      })
    });
    
    return result;
  } catch (error) {
    console.error("Error testing Anthropic API:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

export default function DirectLlmTestPage() {
  const [provider, setProvider] = useState("openai");
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
    response?: string;
  } | null>(null);

  const handleTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      let result;
      
      if (provider === "openai") {
        result = await testOpenAiApi();
      } else if (provider === "anthropic") {
        result = await testAnthropicApi();
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
      
      setTestResult(result);
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${provider.toUpperCase()} API`,
          variant: "default",
        });
      }
    } catch (err) {
      console.error("Error testing LLM:", err);
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : "An unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Direct LLM Connectivity Test</h1>
      <div className="text-sm text-gray-500 mb-6">
        This is a direct API test that bypasses the RFP generator script to isolate any connectivity issues.
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Settings</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="provider">AI Provider</Label>
              <Select
                value={provider}
                onValueChange={setProvider}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button type="button" onClick={handleTest} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                `Test ${provider.toUpperCase()} Connectivity`
              )}
            </Button>
          </div>
        </Card>
        
        {testResult?.error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{testResult.error}</AlertDescription>
          </Alert>
        )}
        
        {testResult?.success !== undefined && (
          <Alert variant={testResult.success ? "default" : "destructive"}>
            <div className="flex items-center gap-2">
              {testResult.success ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5" />}
              <AlertTitle>{testResult.success ? "Connection Successful" : "Connection Failed"}</AlertTitle>
            </div>
            <AlertDescription className="mt-2 ml-7">
              {testResult.message || (testResult.success ? `Successfully connected to ${provider.toUpperCase()} API` : `Failed to connect to ${provider.toUpperCase()} API`)}
              {testResult.response && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                  <strong>Response:</strong> {testResult.response}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}