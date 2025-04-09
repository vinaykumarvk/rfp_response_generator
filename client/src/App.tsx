import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import UploadRequirements from "@/pages/UploadRequirements";
import ViewData from "@/pages/ViewData";
import GenerateResponse from "@/pages/GenerateResponse";
import GeneratedResponses from "@/pages/GeneratedResponses";
import LlmTestPage from "@/pages/LlmTestPage";
import DirectLlmTestPage from "@/pages/DirectLlmTestPage";
import SimpleApiTest from "@/pages/SimpleApiTest";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

import { useIsMobile } from '@/hooks/use-mobile';

function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Only show sidebar on desktop */}
        {!isMobile && <Sidebar />}
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 pb-16 md:pb-0">
          <div className="px-4 py-4 sm:px-6 md:px-8">
            {children}
          </div>
        </main>
      </div>
      <Footer />
      
      {/* On mobile, Sidebar component will render a floating menu button */}
      {isMobile && <Sidebar />}
    </div>
  );
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={UploadRequirements} />
        <Route path="/view-data" component={ViewData} />
        <Route path="/generate-response" component={GenerateResponse} />
        <Route path="/generated-responses" component={GeneratedResponses} />
        <Route path="/llm-test" component={LlmTestPage} />
        <Route path="/direct-llm-test" component={DirectLlmTestPage} />
        <Route path="/simple-api-test" component={SimpleApiTest} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;