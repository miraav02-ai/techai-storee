import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  Code,
  Gamepad2,
  GraduationCap,
  Laptop,
  Palette,
  Sparkles,
  ShieldCheck,
  Truck,
  Zap,
  LayoutDashboard,
  Boxes,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/store/ProductCard";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LaptopAI Store — Intelligent Laptop Shopping Experience powered by AI" },
      {
        name: "description",
        content:
          "Intelligent Laptop Shopping Experience powered by AI. Browse 70 curated laptops across ASUS, Lenovo, Acer, HP, Dell, MSI, and Apple with our Agentic AI laptop advisor.",
      },
      { property: "og:title", content: "LaptopAI Store — Intelligent Laptop Shopping Experience powered by AI" },
      {
        property: "og:description",
        content: "Discover your ideal laptop for gaming, coding, creative work, business, or university with AI assistance.",
      },
    ],
  }),
  component: Home,
});

const collectionIcons: Record<string, typeof Laptop> = {
  Gamepad2,
  Code,
  Palette,
  Briefcase,
  GraduationCap,
  Laptop,
};

function Home() {
  const { products, categories, setAiOpen } = useStore();
  const { isAdmin, user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const topSelling = [...products].sort((a, b) => b.sold - a.sold).slice(0, 4);
  const latest = [...products]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  // ==========================================
  // 1. ADMIN EXCLUSIVE HOMEPAGE
  // ==========================================
  if (isAdmin) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 space-y-12">
        {/* Admin Welcome Hero */}
        <section className="gradient-hero rounded-3xl p-8 sm:p-12 border border-border">
          <div className="max-w-3xl space-y-6">
            <Badge className="rounded-full bg-secondary/15 text-secondary border border-secondary/30">
              <ShieldCheck className="mr-1.5 size-4" /> Mode Administrator Aktif
            </Badge>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Pusat Kontrol & Asisten AI TechAI Store
            </h1>
            <p className="text-base text-foreground/80 leading-relaxed">
              Selamat datang, <strong>{user?.email}</strong>. Sebagai Administrator, Anda memiliki akses penuh ke Dashboard Manajemen dan True AI Shopping Agent untuk mengelola inventaris dan memantau pesanan customer secara real-time.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button asChild size="lg" className="rounded-xl shadow-lg">
                <Link to="/admin">
                  <LayoutDashboard className="mr-2 size-5" /> Masuk ke Dashboard Admin
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl border-secondary/40 text-secondary hover:bg-secondary/10"
                onClick={() => setAiOpen(true)}
              >
                <Sparkles className="mr-2 size-5" /> Buka AI Assistant
              </Button>
            </div>
          </div>
        </section>

        {/* 3 Authorized Areas Card Overview */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">3 Area Utama Administrator</h2>
            <p className="text-sm text-muted-foreground">
              Akses cepat ke navigasi resmi yang diizinkan untuk akun Administrator
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Area 1: Beranda */}
            <div className="surface-card p-6 rounded-2xl border border-border space-y-4">
              <div className="grid size-12 place-items-center rounded-xl bg-secondary/10 text-secondary">
                <Laptop className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">1. Beranda</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Pusat ikhtisar sistem dan navigasi utama kontrol admin.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full rounded-xl">
                <Link to="/">Tetap di Beranda</Link>
              </Button>
            </div>

            {/* Area 2: AI Assistant */}
            <div className="surface-card p-6 rounded-2xl border border-secondary/30 bg-secondary/5 space-y-4">
              <div className="grid size-12 place-items-center rounded-xl gradient-ai text-secondary-foreground">
                <Sparkles className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">2. AI Assistant</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  True AI Shopping Agent dengan 7 tool calling, grounding 70 laptop, dan memory resolusi kontekstual.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full rounded-xl"
                onClick={() => setAiOpen(true)}
              >
                <Sparkles className="mr-1.5 size-4" /> Buka AI Assistant
              </Button>
            </div>

            {/* Area 3: Dashboard Admin */}
            <div className="surface-card p-6 rounded-2xl border border-border space-y-4">
              <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                <LayoutDashboard className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">3. Dashboard Admin</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Manajemen katalog 70 laptop, realtime status pesanan customer, dan verifikasi bukti pembayaran.
                </p>
              </div>
              <Button asChild className="w-full rounded-xl">
                <Link to="/admin">
                  <LayoutDashboard className="mr-1.5 size-4" /> Buka Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================
  // 2. REGULAR USER / GUEST HOMEPAGE
  // ==========================================
  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <Badge className="rounded-full bg-card text-card-foreground">
              <Sparkles className="mr-1 size-3.5 text-secondary" /> Agentic AI Laptop Shopping Assistant
            </Badge>
            <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl">
              Intelligent Laptop Shopping Experience powered by AI.
            </h1>
            <p className="max-w-lg text-base text-foreground/80">
              LaptopAI Store brings 70 high-performance laptops from ASUS, Lenovo, Acer, HP, Dell, MSI, and Apple together with an intelligent consultant that reasons over your budget, specs, and workflow.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="rounded-xl">
                <Link to="/shop">
                  Browse 70 Laptops <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl bg-card"
                onClick={() => setAiOpen(true)}
              >
                <Sparkles className="size-4" /> Ask AI Consultant
              </Button>
            </div>
            <div className="flex flex-wrap gap-5 pt-2 text-xs font-medium text-foreground/75">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-secondary" /> 100% Official Brand Warranty
              </span>
              <span className="flex items-center gap-1.5">
                <Truck className="size-4 text-secondary" /> Free Express Delivery
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="size-4 text-secondary" /> QRIS · Transfer · COD
              </span>
            </div>
          </div>

          {/* AI prompt card */}
          <div className="surface-card ai-glow space-y-4 p-6">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl gradient-ai text-secondary-foreground">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="font-semibold">AI Laptop Matchmaker</p>
                <p className="text-xs text-muted-foreground">Grounded in 70 verified laptops & live stock</p>
              </div>
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setAiOpen(true);
              }}
            >
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Contoh: 'Laptop coding RAM 16GB budget 10 juta'..."
                className="h-12 rounded-xl bg-surface"
              />
              <Button type="submit" className="h-11 w-full rounded-xl">
                <Sparkles className="size-4" /> Find Matching Laptops with AI
              </Button>
            </form>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Coding RAM 16GB budget 10 jt",
                "Gaming RTX budget 15 juta",
                "Desain grafis RTX 4060",
                "Laptop kuliah under 8 juta",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setAiOpen(true)}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Featured Laptop Collections</h2>
            <p className="text-sm text-muted-foreground">Tailored for your specific use cases and daily workflows</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/shop">
              View all 70 laptops <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((c) => {
            const Icon = collectionIcons[c.icon] ?? Laptop;
            const count = products.filter((p) => p.category === c.name).length;
            return (
              <button
                key={c.id}
                onClick={() => navigate({ to: "/shop", search: { category: c.name } })}
                className="surface-card hover-lift flex flex-col gap-3 p-5 text-left transition-all"
              >
                <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="size-6" />
                </span>
                <div>
                  <span className="block font-semibold text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{count} models available</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Top selling */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Top Selling Laptops</h2>
            <p className="text-sm text-muted-foreground">Most popular verified choices by our users this month</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/shop">
              View all <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topSelling.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Promo banners */}
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 lg:grid-cols-3">
        <div className="gradient-panel surface-card space-y-2 p-6 lg:col-span-2">
          <Badge variant="secondary">Promo Code: LAPTOPAI10</Badge>
          <h3 className="text-xl font-bold">10% Off Your First AI-Assisted Laptop Order</h3>
          <p className="text-sm text-muted-foreground">
            Apply discount code <span className="font-mono font-semibold text-foreground">LAPTOPAI10</span> during checkout. Valid for all 70 laptop models including ASUS, Lenovo, Apple, and Dell.
          </p>
          <Button asChild variant="secondary" className="rounded-xl">
            <Link to="/shop">Shop Laptops with Promo</Link>
          </Button>
        </div>
        <div className="gradient-ai surface-card space-y-2 p-6 text-secondary-foreground">
          <Badge className="bg-card text-card-foreground">Need Consultation?</Badge>
          <h3 className="text-xl font-bold">Ask Our AI Consultant</h3>
          <p className="text-sm opacity-90">
            Tell the AI your budget and target software (VS Code, Blender, Premiere, Cyberpunk) for tailored advice.
          </p>
          <Button variant="outline" className="rounded-xl bg-card" onClick={() => setAiOpen(true)}>
            Chat with AI
          </Button>
        </div>
      </section>

      {/* Latest arrivals */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div>
          <h2 className="text-2xl font-bold">Latest Laptop Arrivals</h2>
          <p className="text-sm text-muted-foreground">Fresh 2026 releases with next-gen Intel Core Ultra, AMD Ryzen 8000 & Apple M4</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {latest.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
