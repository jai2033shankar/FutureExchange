import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import Trading from "@/pages/Trading";
import CarbonCredits from "@/pages/CarbonCredits";
import Portfolio from "@/pages/Portfolio";
import Compliance from "@/pages/Compliance";
import AdminDashboard from "@/pages/AdminDashboard";
import Predictions from "@/pages/Predictions";
import KYCPage from "@/pages/KYCPage";
import CarbonCalculator from "@/pages/CarbonCalculator";
import BlockchainExplorer from "@/pages/BlockchainExplorer";
import DAOGovernance from "@/pages/DAOGovernance";
import SmartContracts from "@/pages/SmartContracts";
import IoTWarehouse from "@/pages/IoTWarehouse";
import SettingsPage from "@/pages/SettingsPage";
import EmailInbox from "@/pages/EmailInbox";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#060B12' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm tracking-wider uppercase">Loading E4N</span>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#060B12' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm tracking-wider uppercase">Initializing</span>
        </div>
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/trading" element={<ProtectedRoute><Layout><Trading /></Layout></ProtectedRoute>} />
      <Route path="/carbon-credits" element={<ProtectedRoute><Layout><CarbonCredits /></Layout></ProtectedRoute>} />
      <Route path="/portfolio" element={<ProtectedRoute><Layout><Portfolio /></Layout></ProtectedRoute>} />
      <Route path="/compliance" element={<ProtectedRoute><Layout><Compliance /></Layout></ProtectedRoute>} />
      <Route path="/predictions" element={<ProtectedRoute><Layout><Predictions /></Layout></ProtectedRoute>} />
      <Route path="/kyc" element={<ProtectedRoute><Layout><KYCPage /></Layout></ProtectedRoute>} />
      <Route path="/carbon-calculator" element={<ProtectedRoute><Layout><CarbonCalculator /></Layout></ProtectedRoute>} />
      <Route path="/blockchain" element={<ProtectedRoute><Layout><BlockchainExplorer /></Layout></ProtectedRoute>} />
      <Route path="/governance" element={<ProtectedRoute><Layout><DAOGovernance /></Layout></ProtectedRoute>} />
      <Route path="/smart-contracts" element={<ProtectedRoute><Layout><SmartContracts /></Layout></ProtectedRoute>} />
      <Route path="/warehouses" element={<ProtectedRoute><Layout><IoTWarehouse /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
      <Route path="/emails" element={<ProtectedRoute><Layout><EmailInbox /></Layout></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute roles={["regulator"]}><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" theme="dark" richColors />
      </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}

export default App;
