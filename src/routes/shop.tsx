import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, List, Lock, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ProductCard } from "@/components/store/ProductCard";
import { AdminCustomerGuard } from "@/components/store/AdminCustomerGuard";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

type Search = { category?: string | undefined; q?: string | undefined };

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    category: typeof search["category"] === "string" ? (search["category"] as string) : undefined,
    q: typeof search["q"] === "string" ? (search["q"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop All Laptops — LaptopAI Store" },
      {
        name: "description",
        content:
          "Filter 70 verified laptops by brand, processor, RAM, storage, GPU, screen size, refresh rate, operating system, and live stock.",
      },
      { property: "og:title", content: "Shop LaptopAI Catalog" },
      {
        property: "og:description",
        content: "Spec-level filtering across ASUS, Lenovo, Acer, HP, Dell, MSI, and Apple laptops.",
      },
    ],
  }),
  component: Shop,
});

const PROCESSOR_FILTERS = ["Intel Core Ultra", "Intel Core i7/i9", "Intel Core i5/i3", "AMD Ryzen 7/9", "AMD Ryzen 5/3", "Apple M4/M3/M2", "Snapdragon"];
const RAM_FILTERS = ["8GB", "12GB", "16GB", "24GB", "32GB", "48GB", "64GB"];
const STORAGE_FILTERS = ["256GB", "512GB", "1TB", "2TB"];
const GPU_FILTERS = ["RTX 4090/4080", "RTX 4070", "RTX 4060", "RTX 4050", "RTX 3050/2050", "Intel Arc", "AMD Radeon", "Apple GPU"];
const REFRESH_RATE_FILTERS = ["60Hz", "90Hz", "120Hz", "144Hz", "165Hz", "240Hz"];
const OS_FILTERS = ["Windows 11 Home", "Windows 11 Pro", "macOS Sequoia"];

function normalizeCategory(cat?: string): string | undefined {
  if (!cat || !cat.trim()) return undefined;
  const lower = cat.toLowerCase().trim();
  if (lower === "all" || lower === "all laptops" || lower === "semua" || lower === "semua laptop") {
    return undefined;
  }
  if (lower.includes("gaming") || lower.includes("game")) {
    return "Gaming Laptop";
  }
  if (
    lower.includes("coding") ||
    lower.includes("program") ||
    lower.includes("dev") ||
    lower.includes("software")
  ) {
    return "Coding & Programming";
  }
  if (
    lower.includes("creator") ||
    lower.includes("kreator") ||
    lower.includes("design") ||
    lower.includes("desain") ||
    lower.includes("edit")
  ) {
    return "Creator & Design";
  }
  if (
    lower.includes("business") ||
    lower.includes("bisnis") ||
    lower.includes("office") ||
    lower.includes("kantor")
  ) {
    return "Business Laptop";
  }
  if (
    lower.includes("student") ||
    lower.includes("pelajar") ||
    lower.includes("kuliah") ||
    lower.includes("sekolah") ||
    lower.includes("education")
  ) {
    return "Student Laptop";
  }
  return cat;
}

function Shop() {
  const { category: rawCategory, q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { products, brands, categories } = useStore();
  const { user } = useAuth();

  // Directly derive activeCategory synchronously from URL search params
  const activeCategory = useMemo(() => normalizeCategory(rawCategory), [rawCategory]);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("relevance");
  const [maxPrice, setMaxPrice] = useState(65000000);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedProcessors, setSelectedProcessors] = useState<string[]>([]);
  const [selectedRam, setSelectedRam] = useState<string[]>([]);
  const [selectedStorage, setSelectedStorage] = useState<string[]>([]);
  const [selectedGpu, setSelectedGpu] = useState<string[]>([]);
  const [selectedRefresh, setSelectedRefresh] = useState<string[]>([]);
  const [selectedOs, setSelectedOs] = useState<string[]>([]);
  const [minRating, setMinRating] = useState("0");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleCategoryToggle = (catName: string) => {
    const isCurrent = activeCategory === catName || normalizeCategory(catName) === activeCategory;
    const next = isCurrent ? undefined : catName;
    void navigate({
      search: (prev) => ({
        ...prev,
        category: next,
      }),
    });
  };

  const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>, value: string) =>
    set((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const results = useMemo(() => {
    let list = products.filter((p) => p.active);

    if (activeCategory) {
      list = list.filter((p) => {
        return (
          p.category === activeCategory ||
          normalizeCategory(p.category) === activeCategory ||
          (activeCategory === "Gaming Laptop" &&
            (p.category.toLowerCase().includes("gaming") || p.specs?.usage === "Gaming")) ||
          (activeCategory === "Coding & Programming" &&
            (p.category.toLowerCase().includes("coding") || p.specs?.usage === "Coding")) ||
          (activeCategory === "Creator & Design" &&
            (p.category.toLowerCase().includes("creator") || p.specs?.usage === "Creator")) ||
          (activeCategory === "Business Laptop" &&
            (p.category.toLowerCase().includes("business") || p.specs?.usage === "Business")) ||
          (activeCategory === "Student Laptop" &&
            (p.category.toLowerCase().includes("student") || p.specs?.usage === "Student"))
        );
      });
    }

    if (q) {
      const needle = q.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.brand.toLowerCase().includes(needle) ||
          p.category.toLowerCase().includes(needle) ||
          p.specs.processor.toLowerCase().includes(needle) ||
          p.specs.gpu.toLowerCase().includes(needle) ||
          p.specs.ram.toLowerCase().includes(needle) ||
          p.specs.usage.toLowerCase().includes(needle) ||
          p.description.toLowerCase().includes(needle),
      );
    }

    list = list.filter((p) => p.price <= maxPrice);

    if (selectedBrands.length) {
      list = list.filter((p) =>
        selectedBrands.some((b) => p.brand.toLowerCase() === b.toLowerCase()),
      );
    }

    if (selectedProcessors.length) {
      list = list.filter((p) =>
        selectedProcessors.some((proc) => {
          const procLower = proc.toLowerCase().trim();
          const pCpu = p.specs.processor.toLowerCase();
          if (procLower.includes("ultra")) return pCpu.includes("ultra");
          if (procLower.includes("i7/i9") || procLower.includes("i7") || procLower.includes("i9")) {
            return pCpu.includes("i7") || pCpu.includes("i9");
          }
          if (procLower.includes("i5/i3") || procLower.includes("i5") || procLower.includes("i3")) {
            return (
              pCpu.includes("i5") ||
              pCpu.includes("i3") ||
              pCpu.includes("n100") ||
              pCpu.includes("n305") ||
              pCpu.includes("n4120") ||
              pCpu.includes("1115g4")
            );
          }
          if (procLower.includes("ryzen 7/9") || procLower.includes("ryzen 7") || procLower.includes("ryzen 9")) {
            return pCpu.includes("ryzen 7") || pCpu.includes("ryzen 9") || pCpu.includes("ryzen ai 9");
          }
          if (procLower.includes("ryzen 5/3") || procLower.includes("ryzen 5") || procLower.includes("ryzen 3")) {
            return pCpu.includes("ryzen 5") || pCpu.includes("ryzen 3") || pCpu.includes("athlon");
          }
          if (procLower.includes("apple") || procLower.includes("m4") || procLower.includes("m3") || procLower.includes("m2")) {
            return pCpu.includes("apple") || pCpu.includes("m2") || pCpu.includes("m3") || pCpu.includes("m4");
          }
          if (procLower.includes("snapdragon")) return pCpu.includes("snapdragon");
          return pCpu.includes(procLower);
        }),
      );
    }

    if (selectedRam.length) {
      list = list.filter((p) =>
        selectedRam.some((r) => {
          const rLower = r.toLowerCase().trim();
          const pRam = p.specs.ram.toLowerCase();
          const rNum = parseInt(rLower, 10);
          const pNum = parseInt(pRam, 10);
          if (!isNaN(rNum) && !isNaN(pNum)) {
            if (rNum === pNum) return true;
            if (rNum === 16 && pNum === 18) return true;
            if (rNum === 32 && pNum === 36) return true;
          }
          return pRam.includes(rLower);
        }),
      );
    }

    if (selectedStorage.length) {
      list = list.filter((p) =>
        selectedStorage.some((s) => {
          const sLower = s.toLowerCase().trim();
          const pStorage = p.specs.storage.toLowerCase();
          return pStorage.includes(sLower);
        }),
      );
    }

    if (selectedGpu.length) {
      list = list.filter((p) =>
        selectedGpu.some((g) => {
          const gLower = g.toLowerCase().trim();
          const pGpu = p.specs.gpu.toLowerCase();
          if (gLower.includes("4090/4080") || gLower.includes("4090") || gLower.includes("4080")) {
            return pGpu.includes("4090") || pGpu.includes("4080");
          }
          if (gLower.includes("4070")) return pGpu.includes("4070");
          if (gLower.includes("4060")) return pGpu.includes("4060");
          if (gLower.includes("4050")) return pGpu.includes("4050");
          if (gLower.includes("3050/2050") || gLower.includes("3050") || gLower.includes("2050")) {
            return pGpu.includes("3050") || pGpu.includes("2050");
          }
          if (gLower.includes("arc")) return pGpu.includes("arc");
          if (gLower.includes("radeon")) return pGpu.includes("radeon");
          if (gLower.includes("apple")) return pGpu.includes("apple");
          return pGpu.includes(gLower);
        }),
      );
    }

    if (selectedRefresh.length) {
      list = list.filter((p) =>
        selectedRefresh.some((r) => p.specs.refreshRate.toLowerCase().includes(r.toLowerCase().trim())),
      );
    }

    if (selectedOs.length) {
      list = list.filter((p) =>
        selectedOs.some((os) => {
          const osLower = os.toLowerCase().trim();
          const pOs = p.specs.operatingSystem.toLowerCase();
          if (osLower.includes("pro")) return pOs.includes("pro");
          if (osLower.includes("home")) return pOs.includes("home");
          if (osLower.includes("macos") || osLower.includes("sequoia") || osLower.includes("mac")) {
            return pOs.includes("macos") || pOs.includes("mac");
          }
          return pOs.includes(osLower);
        }),
      );
    }

    if (minRating !== "0") {
      list = list.filter((p) => p.rating >= Number(minRating));
    }

    if (inStockOnly) {
      list = list.filter((p) => p.stock > 0);
    }

    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => a.price - b.price);
      case "price-desc":
        return [...list].sort((a, b) => b.price - a.price);
      case "rating":
        return [...list].sort((a, b) => b.rating - a.rating);
      case "newest":
        return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      case "performance":
        // Rank by price/highest spec tier
        return [...list].sort((a, b) => b.price - a.price);
      default:
        return [...list].sort((a, b) => b.sold - a.sold);
    }
  }, [
    products,
    activeCategory,
    q,
    maxPrice,
    selectedBrands,
    selectedProcessors,
    selectedRam,
    selectedStorage,
    selectedGpu,
    selectedRefresh,
    selectedOs,
    minRating,
    inStockOnly,
    sort,
  ]);

  const resetAll = () => {
    setMaxPrice(65000000);
    setSelectedBrands([]);
    setSelectedProcessors([]);
    setSelectedRam([]);
    setSelectedStorage([]);
    setSelectedGpu([]);
    setSelectedRefresh([]);
    setSelectedOs([]);
    setMinRating("0");
    setInStockOnly(false);
    void navigate({
      search: {},
    });
  };

  const filterPanel = !user ? (
    <div className="space-y-4 px-2 py-8 text-center">
      <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-secondary/10 text-secondary">
        <Lock className="size-6" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">Filters are Locked</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Sign in to unlock spec-level filters (Processor, GPU, RAM, Storage, Budget, Brand, & OS).
        </p>
      </div>
      <Button asChild className="w-full rounded-xl py-4 text-xs font-semibold shadow-md">
        <Link to="/login">Sign In to Use Filters</Link>
      </Button>
    </div>
  ) : (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Laptop Filters</h2>
        <Button variant="ghost" size="sm" onClick={resetAll} className="h-8 text-xs">
          <X className="size-3.5" /> Reset
        </Button>
      </div>

      {/* Categories / Collections */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Collection</Label>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCategoryToggle(c.name)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                activeCategory === c.name || normalizeCategory(c.name) === activeCategory
                  ? "border-secondary bg-secondary text-secondary-foreground font-medium"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Max Price Slider */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Max Budget</Label>
          <span className="text-xs font-bold text-foreground">{formatIDR(maxPrice)}</span>
        </div>
        <Slider
          value={[maxPrice]}
          min={5000000}
          max={65000000}
          step={1000000}
          onValueChange={(v) => setMaxPrice(v[0] ?? 65000000)}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Rp5.000.000</span>
          <span>Rp65.000.000</span>
        </div>
      </div>

      <Separator />

      {/* Brands */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Brands (7)</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {brands.map((b) => (
            <div key={b.id} className="flex items-center gap-2 text-xs">
              <Checkbox
                id={`brand-${b.id}`}
                checked={selectedBrands.includes(b.name)}
                onCheckedChange={() => toggle(setSelectedBrands, b.name)}
              />
              <label
                htmlFor={`brand-${b.id}`}
                className="cursor-pointer select-none"
              >
                {b.name}{" "}
                <span className="text-[10px] text-muted-foreground">
                  ({products.filter((p) => p.brand.toLowerCase() === b.name.toLowerCase()).length})
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Processors */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Processor Architecture</Label>
        <div className="flex flex-wrap gap-1.5">
          {PROCESSOR_FILTERS.map((p) => (
            <SpecChip
              key={p}
              label={p}
              active={selectedProcessors.includes(p)}
              onClick={() => toggle(setSelectedProcessors, p)}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* RAM */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Memory (RAM)</Label>
        <div className="flex flex-wrap gap-1.5">
          {RAM_FILTERS.map((r) => (
            <SpecChip
              key={r}
              label={r}
              active={selectedRam.includes(r)}
              onClick={() => toggle(setSelectedRam, r)}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* GPU */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Graphics / GPU</Label>
        <div className="flex flex-wrap gap-1.5">
          {GPU_FILTERS.map((g) => (
            <SpecChip
              key={g}
              label={g}
              active={selectedGpu.includes(g)}
              onClick={() => toggle(setSelectedGpu, g)}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Storage */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">SSD Storage</Label>
        <div className="flex flex-wrap gap-1.5">
          {STORAGE_FILTERS.map((s) => (
            <SpecChip
              key={s}
              label={s}
              active={selectedStorage.includes(s)}
              onClick={() => toggle(setSelectedStorage, s)}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Refresh Rate */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Display Refresh Rate</Label>
        <div className="flex flex-wrap gap-1.5">
          {REFRESH_RATE_FILTERS.map((rf) => (
            <SpecChip
              key={rf}
              label={rf}
              active={selectedRefresh.includes(rf)}
              onClick={() => toggle(setSelectedRefresh, rf)}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Operating System */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Operating System</Label>
        <div className="flex flex-wrap gap-1.5">
          {OS_FILTERS.map((os) => (
            <SpecChip
              key={os}
              label={os}
              active={selectedOs.includes(os)}
              onClick={() => toggle(setSelectedOs, os)}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Rating */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Minimum Rating</Label>
        <Select value={minRating} onValueChange={setMinRating}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any rating</SelectItem>
            <SelectItem value="4.4">4.4 & above</SelectItem>
            <SelectItem value="4.7">4.7 & above</SelectItem>
            <SelectItem value="4.9">4.9 & above (Flagship)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Label htmlFor="stock" className="text-xs font-medium cursor-pointer">
          In Stock Only
        </Label>
        <Switch id="stock" checked={inStockOnly} onCheckedChange={setInStockOnly} />
      </div>
    </div>
  );

  return (
    <AdminCustomerGuard routeName="Katalog Toko (/shop)">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="surface-card sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto p-5">
              {filterPanel}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {/* Header toolbar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Laptop Catalog</h1>
                <p className="text-sm text-muted-foreground">
                  Showing {results.length} of {products.length} models
                  {activeCategory ? ` in ${activeCategory}` : ""}
                  {q ? ` matching "${q}"` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl lg:hidden"
                  onClick={() => setFiltersOpen((o) => !o)}
                >
                  <SlidersHorizontal className="mr-1.5 size-4" /> Filters
                </Button>

                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="w-[180px] rounded-xl bg-surface">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Top Rated</SelectItem>
                    <SelectItem value="popular">Best Selling</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden rounded-xl border border-border bg-surface p-0.5 sm:flex">
                  <Button
                    variant={view === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="size-8"
                    onClick={() => setView("grid")}
                  >
                    <LayoutGrid className="size-4" />
                  </Button>
                  <Button
                    variant={view === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="size-8"
                    onClick={() => setView("list")}
                  >
                    <List className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            {filtersOpen && (
              <div className="surface-card mb-5 max-h-[80vh] overflow-y-auto p-5 lg:hidden">
                {filterPanel}
              </div>
            )}

            {results.length === 0 ? (
              <div className="surface-card p-12 text-center">
                <p className="text-base font-semibold">No laptops match your criteria</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try widening your price budget, selecting more brands, or resetting filters.
                </p>
                <Button className="mt-4 rounded-xl" onClick={resetAll}>
                  Reset All Filters
                </Button>
              </div>
            ) : (
              <div
                className={
                  view === "grid"
                    ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                    : "flex flex-col gap-4"
                }
              >
                {results.map((p) => (
                  <ProductCard key={p.id} product={p} view={view} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminCustomerGuard>
  );
}

function SpecChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Badge
      onClick={onClick}
      variant={active ? "default" : "outline"}
      className="cursor-pointer select-none text-[11px]"
    >
      {label}
    </Badge>
  );
}
