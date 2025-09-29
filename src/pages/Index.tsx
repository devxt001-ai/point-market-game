import { useAuth } from "@/hooks/useAuth";
import TradingDashboard from "@/components/TradingDashboard";
import AuthPage from "@/components/AuthPage";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <TradingDashboard />;
};

export default Index;
