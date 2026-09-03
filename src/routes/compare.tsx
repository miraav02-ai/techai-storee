import { createFileRoute, Link } from "@tanstack/react-router";
import { GitCompareArrows, Lock, ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rating, StockDot } from "@/components/store/ProductCard";
import { AdminCustomerGuard } from "@/components/store/AdminCustomerGuard";
import { formatIDR, type Product } from "@/lib/catalog";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Side-by-Side Laptop Comparison — LaptopAI Store" },
      {
        name: "description",
        content:
          "Compare up to three laptops side by side across Processor, GPU, RAM, Storage, Screen, Battery, Weight, and Price with highlighted differences.",
      },
      { property: "og:title", content: "Compare Laptops — LaptopAI Store" },
      {
        property: "og:description",
        content: "Detailed side-by-side spec matrix for up to three laptops.",
      },
    ],
  }),
  component: Compare,
});

const rows: { key: string; label: string; get: (p: Product) => string }[] = [
  { key: "price", label: "Price", get: (p) => formatIDR(p.price) },
  { key: "brand", label: "Brand", get: (p) => p.brand },
  { key: "category", label: "Target Collection", get: (p) => p.category },
  { key: "processor", label: "Processor (CPU)", get: (p) => p.specs.processor },
  { key: "gpu", label: "Graphics (GPU)", get: (p) => p.specs.gpu },
  { key: "ram", label: "Memory (RAM)", get: (p) => p.specs.ram },
  { key: "storage", label: "SSD Storage", get: (p) => p.specs.storage },
  { key: "screen", label: "Display Size & Res", get: (p) => `${p.specs.screenSize} — ${p.specs.resolution}` },
  { key: "refreshRate", label: "Refresh Rate", get: (p) => p.specs.refreshRate },
  { key: "battery", label: "Battery Life", get: (p) => p.specs.battery },
  { key: "weight", label: "Laptop Weight", get: (p) => p.specs.weight ?? "Standard" },
  { key: "os", label: "Operating System", get: (p) => p.specs.operatingSystem },
  { key: "warranty", label: "Warranty Coverage", get: (p) => p.warranty },
  { key: "rating", label: "User Rating", get: (p) => `${p.rating.toFixed(1)} / 5.0 (${p.reviews} reviews)` },
  { key: "stock", label: "Live Inventory", get: (p) => (p.stock > 0 ? `${p.stock} units available` : "Out of stock") },
];

function Compare() {
  const { compare, toggleCompare, clearCompare, addToCart } = useStore();
  const { user } = useAuth();

  if (!user) {
    return (
      <AdminCustomerGuard routeName="Komparasi Laptop (/compare)">
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-secondary/10 text-secondary">
            <Lock className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">Sign In to Compare Laptops</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Laptop comparison matrix is available for registered users. Please sign in to compare up to 3 laptops side-by-side.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild className="rounded-xl">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/shop">Browse Laptops</Link>
            </Button>
          </div>
        </div>
      </AdminCustomerGuard>
    );
  }

  if (compare.length === 0) {
    return (
      <AdminCustomerGuard routeName="Komparasi Laptop (/compare)">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <GitCompareArrows className="mx-auto size-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">No Laptops Selected for Comparison</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select up to 3 laptops from the catalog or AI Assistant to view a detailed side-by-side spec matrix.
          </p>
          <Button asChild className="mt-5 rounded-xl">
            <Link to="/shop">Browse Laptop Catalog</Link>
          </Button>
        </div>
      </AdminCustomerGuard>
    );
  }

  return (
    <AdminCustomerGuard routeName="Komparasi Laptop (/compare)">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Laptop Comparison Matrix</h1>
            <p className="text-sm text-muted-foreground">
              {compare.length} of 3 comparison slots used · Differing specifications are highlighted with background tint
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={clearCompare} className="rounded-xl">
            <Trash2 className="size-4 mr-1 text-destructive" /> Clear All
          </Button>
        </div>

        <div className="surface-card overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-48 p-4 text-left text-xs uppercase font-semibold text-muted-foreground">
                  Specification
                </th>
                {compare.map((p) => (
                  <th key={p.id} className="p-4 text-left align-top">
                    <Link to="/product/$id" params={{ id: p.id }} className="block group">
                      <img
                        src={p.image}
                        alt={p.name}
                        loading="lazy"
                        width={1024}
                        height={768}
                        className="mb-2.5 h-28 w-full rounded-lg object-cover group-hover:opacity-90"
                      />
                      <p className="font-semibold text-foreground group-hover:text-secondary line-clamp-2">
                        {p.name}
                      </p>
                    </Link>
                    <div className="mt-1.5 flex items-center gap-3">
                      <Rating value={p.rating} />
                      <StockDot stock={p.stock} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => addToCart(p)}
                        disabled={p.stock === 0}
                      >
                        <ShoppingCart className="size-3.5 mr-1" /> Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => toggleCompare(p)}
                      >
                        Remove
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const values = compare.map(row.get);
                const differs = new Set(values).size > 1 && compare.length > 1;
                return (
                  <tr key={row.key} className="border-b border-border last:border-0">
                    <td className="p-4 text-muted-foreground font-medium text-xs">
                      <span className="flex items-center gap-2">
                        {row.label}
                        {differs && (
                          <Badge variant="outline" className="text-[9px] bg-secondary/10 border-secondary/30 text-secondary">
                            differs
                          </Badge>
                        )}
                      </span>
                    </td>
                    {values.map((v, i) => (
                      <td
                        key={i}
                        className={`p-4 font-medium text-xs sm:text-sm ${
                          differs ? "bg-muted/70 text-foreground font-semibold" : "text-foreground/90"
                        }`}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminCustomerGuard>
  );
}
