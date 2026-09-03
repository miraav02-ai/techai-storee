import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, ShieldAlert, Sparkles, Home } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";

interface AdminCustomerGuardProps {
  children: ReactNode;
  routeName?: string;
}

/**
 * Route guard that prevents ADMIN from accessing customer-only shopping routes (/shop, /product/*, /cart, /checkout, /orders, /compare)
 */
export function AdminCustomerGuard({ children, routeName = "Area Belanja Customer" }: AdminCustomerGuardProps) {
  const { isAdmin, loading } = useAuth();
  const { setAiOpen } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAdmin) {
      const timer = setTimeout(() => {
        void navigate({ to: "/admin" });
      }, 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return <>{children}</>;
  }

  if (isAdmin) {
    return (
      <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-16">
        <div className="surface-card w-full max-w-md border border-secondary/30 bg-secondary/5 p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-3xl bg-secondary/10 text-secondary">
            <ShieldAlert className="size-7" />
          </div>
          <Badge variant="outline" className="mb-2 border-secondary/40 font-mono text-secondary">
            Admin Mode Active
          </Badge>
          <h1 className="text-2xl font-bold text-foreground">Akses Dibatasi untuk Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Halaman <strong>{routeName}</strong> khusus untuk pengguna (customer). Administrator hanya memiliki akses ke <strong>Beranda</strong>, <strong>AI Assistant</strong>, dan <strong>Dashboard Admin</strong>.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/80">
            Mengalihkan Anda ke Dashboard Admin...
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Button asChild className="rounded-xl">
              <Link to="/admin">
                <LayoutDashboard className="mr-1.5 size-4" /> Dashboard Admin
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/">
                <Home className="mr-1.5 size-4" /> Beranda
              </Link>
            </Button>
            <Button
              variant="secondary"
              className="rounded-xl"
              onClick={() => setAiOpen(true)}
            >
              <Sparkles className="mr-1.5 size-4" /> AI Assistant
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
