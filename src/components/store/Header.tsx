import { Link, useNavigate } from "@tanstack/react-router";
import {
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  ShoppingCart,
  UserRound,
  Laptop,
  Home,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

const customerNavItems = [
  { label: "All Laptops", to: "/shop" as const, search: {} },
  { label: "Gaming", to: "/shop" as const, search: { category: "Gaming Laptop" } },
  { label: "Coding & Dev", to: "/shop" as const, search: { category: "Coding & Programming" } },
  { label: "Creator & Design", to: "/shop" as const, search: { category: "Creator & Design" } },
  { label: "Business", to: "/shop" as const, search: { category: "Business Laptop" } },
  { label: "Student", to: "/shop" as const, search: { category: "Student Laptop" } },
  { label: "Orders", to: "/orders" as const },
];

export function Header() {
  const { cartCount, compare, setCartOpen, setAiOpen } = useStore();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const displayName =
    profile?.name ||
    (user?.user_metadata ? (user.user_metadata["name"] as string | undefined) : undefined) ||
    (user?.email ? user.email.split("@")[0] : null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      void navigate({ to: "/shop", search: { q: q.trim() } });
    } else {
      void navigate({ to: "/shop" });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      void navigate({ to: "/" });
    } catch {
      toast.error("Failed to sign out");
    }
  };

  // ==========================================
  // 1. ADMIN EXCLUSIVE NAVBAR & HEADER
  // ==========================================
  if (isAdmin) {
    return (
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          {/* Mobile Sheet for Admin */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetTitle className="px-4 pt-4">Admin Navigation</SheetTitle>
              <nav className="flex flex-col gap-2 p-4">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  <Home className="size-4" /> Beranda
                </Link>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setAiOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-secondary hover:bg-muted"
                >
                  <Sparkles className="size-4" /> AI Assistant
                </button>
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <LayoutDashboard className="size-4" /> Dashboard Admin
                </Link>
                <div className="my-2 border-t border-border" />
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    void handleLogout();
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="size-4" /> Logout
                </button>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo with Admin Badge */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl gradient-ai text-secondary-foreground">
                <Laptop className="size-5" />
              </span>
              <span className="text-lg font-bold tracking-tight">
                LaptopAI<span className="text-secondary"> Store</span>
              </span>
            </Link>
            <Badge variant="secondary" className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold">
              <ShieldCheck className="size-3" /> Admin Mode
            </Badge>
          </div>

          {/* Desktop Admin Main 3 Areas */}
          <nav className="hidden md:flex items-center gap-2">
            <Button asChild variant="ghost" className="rounded-xl font-medium">
              <Link to="/">
                <Home className="mr-1.5 size-4" /> Beranda
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => setAiOpen(true)}
              className="rounded-xl font-medium border-secondary/40 text-secondary hover:bg-secondary/10"
            >
              <Sparkles className="mr-1.5 size-4" /> AI Assistant
            </Button>
            <Button asChild variant="default" className="rounded-xl font-medium">
              <Link to="/admin">
                <LayoutDashboard className="mr-1.5 size-4" /> Dashboard Admin
              </Link>
            </Button>
          </nav>

          {/* Right Action: Admin Profile & Logout */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setAiOpen(true)}
              size="sm"
              className="animate-pulse-ring rounded-xl md:hidden"
            >
              <Sparkles className="size-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-xl border border-border">
                  <UserRound className="size-4 text-secondary" />
                  <span className="hidden text-xs font-semibold sm:inline">
                    {displayName || "Admin"}
                  </span>
                  <Badge variant="outline" className="hidden text-[10px] sm:inline-block border-secondary/40 text-secondary">
                    Admin
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none text-foreground">
                      {displayName || "Admin"}
                    </p>
                    <p className="truncate text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
                  <Link to="/" className="flex w-full items-center gap-2">
                    <Home className="size-4" />
                    <span>Beranda</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setAiOpen(true)}
                  className="cursor-pointer gap-2 rounded-lg text-secondary"
                >
                  <Sparkles className="size-4" />
                  <span>AI Assistant</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
                  <Link to="/admin" className="flex w-full items-center gap-2">
                    <LayoutDashboard className="size-4 text-secondary" />
                    <span>Dashboard Admin</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer gap-2 rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    );
  }

  // ==========================================
  // 2. REGULAR USER / GUEST NAVBAR & HEADER
  // ==========================================
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetTitle className="px-4 pt-4">Browse Laptop Collections</SheetTitle>
            <nav className="flex flex-col gap-1 p-4">
              {customerNavItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  search={item.search as never}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl gradient-ai text-secondary-foreground">
            <Laptop className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            LaptopAI<span className="text-secondary"> Store</span>
          </span>
        </Link>

        <form className="relative ml-4 hidden flex-1 md:block" onSubmit={handleSearch}>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ASUS, Lenovo, RTX 4060, MacBook M4, 16GB RAM, Coding..."
            className="rounded-xl bg-surface pl-9"
          />
        </form>

        <div className="ml-auto flex items-center gap-1">
          <Button
            onClick={() => setAiOpen(true)}
            className="hidden animate-pulse-ring rounded-xl sm:inline-flex"
          >
            <Sparkles className="size-4" /> AI Assistant
          </Button>
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link to="/compare">
              <GitCompareArrows className="size-5" />
              {compare.length > 0 && (
                <Badge className="absolute -right-1 -top-1 size-5 justify-center rounded-full p-0 text-[10px]">
                  {compare.length}
                </Badge>
              )}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => {
              if (!user) {
                toast.error("Sign In Required", {
                  description: "Please sign in to access your shopping cart.",
                });
                void navigate({ to: "/login" });
                return;
              }
              setCartOpen(true);
            }}
          >
            <ShoppingCart className="size-5" />
            {cartCount > 0 && (
              <Badge className="absolute -right-1 -top-1 size-5 justify-center rounded-full p-0 text-[10px]">
                {cartCount}
              </Badge>
            )}
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
                  <UserRound className="size-5" />
                  <span className="hidden text-xs font-semibold lg:inline">
                    {displayName || "User"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none text-foreground">
                      {displayName || "User"}
                    </p>
                    <p className="truncate text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
                  <Link to="/orders" className="flex w-full items-center gap-2">
                    <Laptop className="size-4" />
                    <span>My Orders</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer gap-2 rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link to="/login" aria-label="Sign In">
                <UserRound className="size-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <nav className="mx-auto hidden max-w-7xl items-center gap-1 px-4 pb-2 lg:flex">
        {customerNavItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            search={item.search as never}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
