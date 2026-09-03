import { Link, useNavigate } from "@tanstack/react-router";
import { GitCompareArrows, ShoppingCart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIDR, type Product } from "@/lib/catalog";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function StockDot({ stock }: { stock: number }) {
  const label = stock === 0 ? "Out of stock" : stock <= 5 ? `Only ${stock} left` : "In stock";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          "size-2 rounded-full",
          stock === 0 ? "bg-destructive" : stock <= 5 ? "bg-warning" : "bg-success",
        )}
      />
      {label}
    </span>
  );
}

export function Rating({ value, reviews }: { value: number; reviews?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="size-3.5 fill-secondary text-secondary" />
      <span className="font-semibold text-foreground">{value.toFixed(1)}</span>
      {reviews !== undefined && <span>({reviews})</span>}
    </span>
  );
}

export function ProductCard({ product, view = "grid" }: { product: Product; view?: "grid" | "list" }) {
  const { addToCart, toggleCompare, compare } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const inCompare = compare.some((p) => p.id === product.id);
  const specLine = [
    product.specs.processor,
    product.specs.ram,
    product.specs.storage,
    product.specs.gpu,
  ]
    .filter(Boolean)
    .join(" · ");

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

  const handleAddToCart = () => {
    if (!user) {
      toast.error("Sign In Required", {
        description: "Please sign in to add items to your cart.",
      });
      void navigate({ to: "/login" });
      return;
    }
    addToCart(product);
  };

  if (view === "list") {
    return (
      <article className="surface-card hover-lift flex flex-col gap-4 p-4 sm:flex-row">
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className="w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-52"
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            width={1024}
            height={768}
            className="h-40 w-full object-cover sm:h-full"
          />
        </Link>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {product.badges.map((b) => (
              <Badge key={b} variant="secondary">
                {b}
              </Badge>
            ))}
          </div>
          <Link to="/product/$id" params={{ id: product.id }}>
            <h3 className="text-lg font-semibold text-foreground hover:text-secondary">
              {product.name}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground">{specLine || product.description}</p>
          <div className="flex items-center gap-4">
            <Rating value={product.rating} reviews={product.reviews} />
            <StockDot stock={product.stock} />
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xl font-bold text-foreground">{formatIDR(product.price)}</p>
            <div className="flex gap-2">
              <Button
                variant={inCompare ? "default" : "outline"}
                size="sm"
                onClick={handleCompare}
              >
                <GitCompareArrows className="size-4" /> Compare
              </Button>
              <Button size="sm" onClick={handleAddToCart} disabled={product.stock === 0}>
                <ShoppingCart className="size-4" /> Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="surface-card hover-lift group flex flex-col overflow-hidden">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block overflow-hidden bg-muted"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={1024}
          height={768}
          className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.badges.slice(0, 2).map((b) => (
            <Badge key={b}>{b}</Badge>
          ))}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {product.brand} · {product.category}
        </p>
        <Link to="/product/$id" params={{ id: product.id }}>
          <h3 className="line-clamp-2 font-semibold leading-snug text-foreground hover:text-secondary">
            {product.name}
          </h3>
        </Link>
        {specLine && <p className="line-clamp-2 text-xs text-muted-foreground">{specLine}</p>}
        <div className="flex items-center justify-between">
          <Rating value={product.rating} reviews={product.reviews} />
          <StockDot stock={product.stock} />
        </div>
        <div className="mt-auto space-y-3 pt-2">
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold text-foreground">{formatIDR(product.price)}</p>
            {product.oldPrice && (
              <p className="text-xs line-through text-muted-foreground">
                {formatIDR(product.oldPrice)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={inCompare ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={handleCompare}
            >
              <GitCompareArrows className="size-4" />
              Compare
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              <ShoppingCart className="size-4" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
