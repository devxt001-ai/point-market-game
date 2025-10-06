import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, Home, ArrowRight } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-40 -right-10 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-muted/30" />
      </div>
      <div className="container mx-auto px-6 py-16 flex items-center justify-center">
        <Card className="w-full max-w-2xl bg-card/80 backdrop-blur border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Compass className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-3xl">Page Not Found</CardTitle>
            <CardDescription>We couldn’t find the page "{location.pathname}".</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">Try returning home or exploring markets.</p>
            <div className="flex gap-3 justify-center">
              <Button asChild variant="trading" className="gap-2">
                <Link to="/">
                  <Home className="h-4 w-4" /> Home
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/markets" className="flex items-center gap-2">
                  Explore Markets <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
