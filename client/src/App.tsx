import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import UploadRequirements from "@/pages/UploadRequirements";
import ViewData from "@/pages/ViewData";
import GenerateResponse from "@/pages/GenerateResponse";
import GeneratedResponses from "@/pages/GeneratedResponses";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-slate-50">
          {children}
        </main>
      </div>
      <Footer />
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
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
