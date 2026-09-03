import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  Cpu,
  Eye,
  GitCompareArrows,
  HardDrive,
  Laptop,
  Layers,
  Minus,
  Monitor,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProductCard, Rating, StockDot } from "@/components/store/ProductCard";
import { AdminCustomerGuard } from "@/components/store/AdminCustomerGuard";
import { formatIDR } from "@/lib/catalog";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Laptop Detail & Full Specifications — LaptopAI Store" },
      {
        name: "description",
        content:
          "Full laptop specifications, performance benchmarks, screen specs, warranty coverage, and live stock on LaptopAI Store.",
      },
      { property: "og:title", content: "Laptop Detail — LaptopAI Store" },
      {
        property: "og:description",
        content: "Processor, GPU, RAM, screen resolution, battery and warranty breakdown.",
      },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { products, addToCart, toggleCompare, compare, setAiOpen } = useStore();
  const { user } = useAuth();
  const product = products.find((p) => p.id === id);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const navigate = useNavigate();

  if (!product) throw notFound();

  const gallery =
    product.gallery && product.gallery.length > 0
      ? product.gallery
      : [product.image];
  const related = products
    .filter((p) => p.id !== product.id && (p.category === product.category || p.brand === product.brand))
    .slice(0, 4);
  const inCompare = compare.some((p) => p.id === product.id);

  const handleAddToCart = () => {
    if (!user) {
      toast.error("Sign In Required", {
        description: "Please sign in to add laptops to your cart.",
      });
      void navigate({ to: "/login" });
      return;
    }
    addToCart(product, qty);
  };

  const handleBuyNow = () => {
    if (!user) {
      toast.error("Sign In Required", {
        description: "Please sign in to proceed to checkout.",
      });
      void navigate({ to: "/login" });
      return;
    }
    addToCart(product, qty);
    void navigate({ to: "/checkout" });
  };

  const handleCompare = () => {
    if (!user) {
      toast.error("Sign In Required", {
        description: "Please sign in to compare laptops.",
      });
      void navigate({ to: "/login" });
      return;
    }
    toggleCompare(product);
  };

  const handleOpenAi = () => {
    if (!user) {
      toast.error("Sign In Required", {
        description: "Please sign in to ask AI Assistant.",
      });
      void navigate({ to: "/login" });
      return;
    }
    setAiOpen(true);
  };

  return (
    <AdminCustomerGuard routeName={`Detail Produk (${product.name})`}>
      <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>{" "}
        /{" "}
        <Link to="/shop" search={{ category: product.category }} className="hover:text-foreground">
          {product.category}
        </Link>{" "}
        / <span className="text-foreground font-medium">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: Image Gallery */}
        <div className="space-y-3">
          <div className="surface-card overflow-hidden">
            <img
              src={gallery[activeImage] || product.image}
              alt={product.name}
              width={1024}
              height={768}
              className="h-80 w-full object-cover sm:h-[420px]"
            />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {gallery.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`h-20 min-w-[5rem] flex-1 overflow-hidden rounded-xl border-2 transition-all ${
                  activeImage === i ? "border-secondary ring-2 ring-secondary/30" : "border-border"
                }`}
              >
                <img
                  src={g}
                  alt={`${product.name} angle ${i + 1}`}
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <div className="surface-card flex items-center gap-3 p-4">
              <ShieldCheck className="size-5 text-secondary" />
              <div>
                <p className="text-sm font-semibold">Official Warranty</p>
                <p className="text-xs text-muted-foreground">{product.warranty}</p>
              </div>
            </div>
            <div className="surface-card flex items-center gap-3 p-4">
              <Truck className="size-5 text-secondary" />
              <div>
                <p className="text-sm font-semibold">Express Shipping</p>
                <p className="text-xs text-muted-foreground">Free nationwide delivery over Rp5.000.000</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Actions */}
        <div className="space-y-5">
          <div className="flex flex-wrap gap-1.5">
            {product.badges.map((b) => (
              <Badge key={b} variant="secondary">
                {b}
              </Badge>
            ))}
            <Badge variant="outline">{product.specs.usage} Tier</Badge>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {product.brand} · {product.category}
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold leading-tight">{product.name}</h1>
          </div>

          <div className="flex items-center gap-4">
            <Rating value={product.rating} reviews={product.reviews} />
            <StockDot stock={product.stock} />
            <span className="text-xs text-muted-foreground">{product.sold} units sold</span>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>

          {/* Pricing & Cart Action Box */}
          <div className="surface-card gradient-panel space-y-4 p-5">
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-bold text-foreground">{formatIDR(product.price)}</p>
              {product.oldPrice && (
                <p className="text-sm line-through text-muted-foreground">
                  {formatIDR(product.oldPrice)}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-8 text-center font-semibold">{qty}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setQty(Math.min(product.stock || 1, qty + 1))}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <Button
                className="flex-1 rounded-xl"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                <ShoppingCart className="size-4" />
                {product.stock === 0 ? "Out of stock" : "Add to Cart"}
              </Button>

              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={handleBuyNow}
                disabled={product.stock === 0}
              >
                <Zap className="size-4" /> Buy Now
              </Button>

              <Button
                variant={inCompare ? "secondary" : "outline"}
                className="rounded-xl"
                onClick={handleCompare}
              >
                <GitCompareArrows className="size-4" /> Compare
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full rounded-xl bg-surface"
              onClick={handleOpenAi}
            >
              <Sparkles className="size-4 text-secondary" /> AI Ask About This Laptop
            </Button>
          </div>

          {/* Complete Specification Cards */}
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-bold">Laptop Specifications</h2>

            {/* Performance Card */}

            {/* Quick Specs Highlight Matrix */}
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="surface-card p-3 text-center">
                <Cpu className="mx-auto size-4 text-secondary mb-1" />
                <span className="block text-[10px] text-muted-foreground">Processor</span>
                <span className="font-semibold text-xs leading-tight block">{product.specs.processor}</span>
              </div>
              <div className="surface-card p-3 text-center">
                <Layers className="mx-auto size-4 text-secondary mb-1" />
                <span className="block text-[10px] text-muted-foreground">Memory (RAM)</span>
                <span className="font-semibold text-xs leading-tight block">{product.specs.ram}</span>
              </div>
              <div className="surface-card p-3 text-center">
                <HardDrive className="mx-auto size-4 text-secondary mb-1" />
                <span className="block text-[10px] text-muted-foreground">Storage</span>
                <span className="font-semibold text-xs leading-tight block">{product.specs.storage}</span>
              </div>
              <div className="surface-card p-3 text-center">
                <Monitor className="mx-auto size-4 text-secondary mb-1" />
                <span className="block text-[10px] text-muted-foreground">Graphics (GPU)</span>
                <span className="font-semibold text-xs leading-tight block">{product.specs.gpu}</span>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Quantity + Add to Cart / Buy Now */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Quantity:</span>
                <div className="flex items-center rounded-xl border border-border bg-surface">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-l-xl"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-r-xl"
                    onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                    disabled={qty >= product.stock}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {product.stock > 0 ? `${product.stock} units available` : "Out of Stock"}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="flex-1 rounded-xl"
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                >
                  <ShoppingCart className="mr-2 size-4" /> Add to Cart
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="flex-1 rounded-xl"
                  onClick={handleBuyNow}
                  disabled={product.stock <= 0}
                >
                  <Zap className="mr-2 size-4" /> Buy Now
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl"
                  onClick={handleCompare}
                >
                  <GitCompareArrows className="mr-1.5 size-4" />
                  {inCompare ? "Remove from Compare" : "Compare Specs"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl text-secondary border-secondary/30 hover:bg-secondary/10"
                  onClick={handleOpenAi}
                >
                  <Sparkles className="mr-1.5 size-4" /> Ask AI About This
                </Button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface/50 p-3 text-center text-xs">
              <div>
                <ShieldCheck className="mx-auto size-4 text-secondary mb-1" />
                <span className="font-medium text-foreground block">{product.warranty}</span>
                <span className="text-[10px] text-muted-foreground">Official Warranty</span>
              </div>
              <div>
                <Truck className="mx-auto size-4 text-secondary mb-1" />
                <span className="font-medium text-foreground block">Express Delivery</span>
                <span className="text-[10px] text-muted-foreground">Safe Packing</span>
              </div>
              <div>
                <Zap className="mx-auto size-4 text-secondary mb-1" />
                <span className="font-medium text-foreground block">Verified Specs</span>
                <span className="text-[10px] text-muted-foreground">100% Original</span>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Detailed Spec Sheet */}
        <div className="mt-14 space-y-6">
          <h2 className="text-2xl font-bold">Complete Technical Specifications</h2>
          <div className="surface-card divide-y divide-border overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-secondary uppercase tracking-wider">Performance & Processing</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Processor (CPU)</span>
                    <span className="font-medium text-right">{product.specs.processor}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Graphics (GPU)</span>
                    <span className="font-medium text-right">{product.specs.gpu}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Memory (RAM)</span>
                    <span className="font-medium text-right">{product.specs.ram}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Internal Storage</span>
                    <span className="font-medium text-right">{product.specs.storage}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-secondary uppercase tracking-wider">Display & Visuals</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Screen Size</span>
                    <span className="font-medium text-right">{product.specs.screenSize}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Resolution</span>
                    <span className="font-medium text-right">{product.specs.resolution}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Refresh Rate</span>
                    <span className="font-medium text-right">{product.specs.refreshRate}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-secondary uppercase tracking-wider">Design & Battery</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Battery Life</span>
                    <span className="font-medium text-right">{product.specs.battery}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Weight</span>
                    <span className="font-medium text-right">{product.specs.weight}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Operating System</span>
                    <span className="font-medium text-right">{product.specs.operatingSystem}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-secondary uppercase tracking-wider">Warranty & Service</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Warranty Coverage</span>
                    <span className="font-medium text-right">{product.warranty}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Target Usage</span>
                    <span className="font-medium text-right">{product.specs.usage}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Stock Status</span>
                    <span className="font-medium text-right">{product.stock > 0 ? `${product.stock} units in stock` : "Out of stock"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-14">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold">Similar & Related Laptops</h2>
                <p className="text-xs text-muted-foreground">Alternative models in {product.category} from {product.brand}</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/shop" search={{ category: product.category }}>
                  View Collection
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AdminCustomerGuard>
  );
}
