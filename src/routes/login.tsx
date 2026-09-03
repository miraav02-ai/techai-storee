import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Lock, Mail, ArrowRight, Loader2, Laptop, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — LaptopAI Store" },
      {
        name: "description",
        content:
          "Sign in to your LaptopAI Store account to access your orders, saved laptops, and AI recommendations.",
      },
      { property: "og:title", content: "Sign In — LaptopAI Store" },
      {
        property: "og:description",
        content: "Sign in to your LaptopAI Store account.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect home
  useEffect(() => {
    if (!authLoading && user) {
      void navigate({ to: "/" });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await signIn(email.trim(), password);
      if (authError) {
        let displayError = authError.message;
        if (authError.message.toLowerCase().includes("email not confirmed")) {
          displayError =
            "Email not confirmed yet. Please confirm your email in Supabase or contact administrator.";
        } else if (authError.message.toLowerCase().includes("invalid login credentials")) {
          displayError =
            "Invalid email or password. Please check your credentials and try again.";
        }
        setError(displayError);
        toast.error("Sign In Failed", { description: displayError });
      } else if (data?.user) {
        toast.success("Welcome back!", {
          description: `Signed in as ${data.user.email}`,
        });
        void navigate({ to: "/shop" });
      }
    } catch (err: any) {
      let msg = err?.message || "An unexpected error occurred during sign in.";
      if (msg.toLowerCase().includes("failed to fetch")) {
        msg =
          "Unable to connect to Supabase authentication service. Please check your internet connection or verify Supabase project status.";
      }
      setError(msg);
      toast.error("Sign In Error", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12">
      <div className="surface-card w-full max-w-md p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl gradient-ai text-secondary-foreground shadow-lg">
            <Laptop className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access your LaptopAI Store account
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-sm font-medium">
              Email address
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-xl pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-sm font-medium">
                Password
              </Label>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl pl-9"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-5 text-sm font-semibold shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Signing In...
              </>
            ) : (
              <>
                Sign In <ArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          Don't have an account yet?{" "}
          <Link
            to="/register"
            className="font-semibold text-secondary transition-colors hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
