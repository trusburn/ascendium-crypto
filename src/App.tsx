import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Testimonials from "./pages/Testimonials";
import CryptoNews from "./pages/CryptoNews";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DashboardTransactions from "./pages/DashboardTransactions";
import DashboardDeposit from "./pages/DashboardDeposit";
import DashboardWithdrawal from "./pages/DashboardWithdrawal";
import DashboardSignals from "./pages/DashboardSignals";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/crypto-news" element={<CryptoNews />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/transactions" element={<ProtectedRoute><DashboardTransactions /></ProtectedRoute>} />
          <Route path="/dashboard/deposit" element={<ProtectedRoute><DashboardDeposit /></ProtectedRoute>} />
          <Route path="/dashboard/withdrawal" element={<ProtectedRoute><DashboardWithdrawal /></ProtectedRoute>} />
          <Route path="/dashboard/signals" element={<ProtectedRoute><DashboardSignals /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
