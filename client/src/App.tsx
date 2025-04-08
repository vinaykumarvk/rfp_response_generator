import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import RfpDetails from "@/pages/RfpDetails";
import TemplateSelection from "@/pages/TemplateSelection";
import GenerateResponse from "@/pages/GenerateResponse";
import PreviewExport from "@/pages/PreviewExport";

function Router() {
  return (
    <Switch>
      <Route path="/" component={RfpDetails} />
      <Route path="/template-selection" component={TemplateSelection} />
      <Route path="/generate-response" component={GenerateResponse} />
      <Route path="/preview-export" component={PreviewExport} />
      <Route component={NotFound} />
    </Switch>
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
