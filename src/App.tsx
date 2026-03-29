import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AuthPage from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import LandingPage from "@/pages/LandingPage";
import AppLayout from "@/components/AppLayout";
import DashboardOverview from "@/pages/DashboardOverview";
import Simulator from "@/pages/Simulator";
import AIInsights from "@/pages/AIInsights";
import Compare from "@/pages/Compare";
import Reports from "@/pages/Reports";
import CropEncyclopedia from "@/pages/CropEncyclopedia";
import ActiveFarm from "@/pages/ActiveFarm";
import PlantHealth from "@/pages/PlantHealth";
import BusinessPlanner from "@/pages/BusinessPlanner";
import MLAnalytics from "@/pages/MLAnalytics";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <div className="font-display text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<LandingPage />} />
    <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />

    {/* Protected routes */}
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<DashboardOverview />} />
      <Route path="/simulator" element={<Simulator />} />
      <Route path="/my-farm" element={<ActiveFarm />} />
      <Route path="/crops" element={<CropEncyclopedia />} />
      <Route path="/ai-insights" element={<AIInsights />} />
      <Route path="/plant-health" element={<PlantHealth />} />
      <Route path="/business-planner" element={<BusinessPlanner />} />
      <Route path="/ml-analytics" element={<MLAnalytics />} />
      <Route path="/compare" element={<Compare />} />
      <Route path="/reports" element={<Reports />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
