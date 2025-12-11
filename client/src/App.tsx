import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import UploadRequirements from "@/pages/UploadRequirements";
import ViewData from "@/pages/ViewData";
import Analytics from "@/pages/Analytics";
import BindEKG from "@/pages/BindEKG";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

import { useIsMobile } from '@/hooks/use-mobile';

function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* ACCESSIBILITY: Skip to main content link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Only show fixed sidebar on desktop */}
        {!isMobile && <Sidebar />}
        
        {/* ACCESSIBILITY: Main content area with landmark and skip target */}
        <main 
          id="main-content"
          role="main"
          className="flex-1 overflow-auto pb-20 sm:pb-16 md:pb-0 transition-all"
        >
          <div className="px-4 py-4 sm:px-6 md:px-8 lg:px-10 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Improved footer with responsive padding */}
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
        <Route path="/" component={ViewData} />
        <Route path="/upload" component={UploadRequirements} />
        <Route path="/bind-ekg" component={BindEKG} />
        <Route path="/analytics" component={Analytics} />
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