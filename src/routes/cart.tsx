import { createFileRoute, Link } from "@tanstack/react-router";
import { Laptop, Lock, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AdminCustomerGuard } from "@/components/store/AdminCustomerGuard";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Shopping Cart — LaptopAI Store" },
      {
        name: "description",
        content:
          "Review your LaptopAI Store cart, adjust quantities, apply LAPTOPAI10 discount code, and proceed to secure checkout.",
      },
      { property: "og:title", content: "Your Cart — LaptopAI Store" },
      { property: "og:description", content: "Review and checkout your selected laptops." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { user } = useAuth();
  const { cart, setQty, removeFromCart, cartSubtotal, discount, discountCode, applyDiscount } = useStore();
  const [code, setCode] = useState("");
  const shipping = cartSubtotal > 5000000 || cartSubtotal === 0 ? 0 : 45000;

  if (!user) {
    return (
      <AdminCustomerGuard routeName="Keranjang Belanja (/cart)">
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-secondary/10 text-secondary">
            <Lock className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">Sign In to View Your Cart</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Shopping cart is saved per user account. Please sign in to view and manage your selected laptops.
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

  if (cart.length === 0) {
    return (
      <AdminCustomerGuard routeName="Keranjang Belanja (/cart)">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <Laptop className="mx-auto size-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Your Laptop Cart is Empty</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Explore our catalog of 70 laptops or ask the AI Advisor for personalized recommendations.
          </p>
          <Button asChild className="mt-5 rounded-xl">
            <Link to="/shop">Browse Laptop Catalog</Link>
          </Button>
        </div>
      </AdminCustomerGuard>
    );
  }

  return (
    <AdminCustomerGuard routeName="Keranjang Belanja (/cart)">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Laptop Shopping Cart</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.product.id} className="surface-card flex flex-col gap-4 p-4 sm:flex-row">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="h-28 w-full rounded-xl object-cover sm:w-36"
                />
                <div className="flex-1 space-y-2">
                  <Link
                    to="/product/$id"
                    params={{ id: item.product.id }}
                    className="font-semibold hover:text-secondary"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {item.product.brand} · {item.product.specs.processor} · {item.product.specs.ram} · {item.product.specs.gpu}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl border border-border p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setQty(item.product.id, item.qty - 1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-7 text-center text-sm font-semibold">{item.qty}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setQty(item.product.id, item.qty + 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <p className="font-bold">{formatIDR(item.product.price * item.qty)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="size-4 text-destructive" /> Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="surface-card h-fit space-y-4 p-5">
            <h2 className="font-semibold">Order Summary</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Promo Code (LAPTOPAI10)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button variant="secondary" onClick={() => applyDiscount(code)}>
                Apply
              </Button>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatIDR(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Express Delivery</span>
                <span className="font-semibold text-success">
                  {shipping === 0 ? "Free Nationwide" : formatIDR(shipping)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount ({discountCode || "LAPTOPAI10"})</span>
                  <span className="font-semibold text-success">-{formatIDR(discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total Amount</span>
                <span className="font-bold">{formatIDR(cartSubtotal + shipping - discount)}</span>
              </div>
            </div>
            <Button asChild className="w-full rounded-xl">
              <Link to="/checkout">Proceed to Checkout</Link>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link to="/shop">Continue Shopping</Link>
            </Button>
          </aside>
        </div>
      </div>
    </AdminCustomerGuard>
  );
}
