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
import DashboardWallet from "./pages/DashboardWallet";
import DashboardTutorial from "./pages/DashboardTutorial";
import DashboardProfile from "./pages/DashboardProfile";
import DashboardSettings from "./pages/DashboardSettings";
import AdminPanel from "./pages/AdminPanel";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from './pages/admin/AdminUsers';
import AdminContent from './pages/admin/AdminContent';
import AdminDeposits from './pages/admin/AdminDeposits';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminManagement from './pages/admin/AdminManagement';
import AdminSettings from './pages/admin/AdminSettings';
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLayout } from "./components/AdminLayout";

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
          <Route path="/dashboard/wallet" element={<ProtectedRoute><DashboardWallet /></ProtectedRoute>} />
          <Route path="/dashboard/tutorial" element={<ProtectedRoute><DashboardTutorial /></ProtectedRoute>} />
          <Route path="/dashboard/profile" element={<ProtectedRoute><DashboardProfile /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardSettings /></ProtectedRoute>} />
          
          {/* Legacy admin panel */}
          <Route path="/admin-panel" element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
          
          {/* New admin routes with sidebar */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout><AdminOverview /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/deposits" element={<ProtectedRoute adminOnly><AdminLayout><AdminDeposits /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/withdrawals" element={<ProtectedRoute adminOnly><AdminLayout><AdminWithdrawals /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminLayout><AdminUsers /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/content" element={<ProtectedRoute adminOnly><AdminLayout><AdminContent /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/management" element={<ProtectedRoute adminOnly><AdminLayout><AdminManagement /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
