import { Link } from "@tanstack/react-router";
import { Laptop, Lock, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export function CartDrawer() {
  const { user } = useAuth();
  const {
    cart,
    cartOpen,
    setCartOpen,
    setQty,
    removeFromCart,
    cartSubtotal,
    discount,
    discountCode,
    applyDiscount,
  } = useStore();
  const [code, setCode] = useState("");

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your Laptop Cart</SheetTitle>
          <SheetDescription>
            {!user
              ? "Sign in to access your saved cart."
              : cart.length === 0
                ? "No laptops added yet."
                : `${cart.length} laptop model(s)`}
          </SheetDescription>
        </SheetHeader>

        {!user ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-3xl bg-secondary/10 text-secondary shadow-inner">
              <Lock className="size-7" />
            </div>
            <h3 className="text-lg font-bold">Sign In to View Your Cart</h3>
            <p className="mt-2 max-w-xs text-xs text-muted-foreground">
              Your shopping cart is securely saved per user account. Sign in to view, save, and checkout.
            </p>
            <div className="mt-6 flex w-full flex-col gap-2.5">
              <Button
                asChild
                className="w-full rounded-xl py-4 text-xs font-semibold shadow-md"
                onClick={() => setCartOpen(false)}
              >
                <Link to="/login">Sign In to Your Account</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full rounded-xl text-xs"
                onClick={() => setCartOpen(false)}
              >
                <Link to="/register">Create a Free Account</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
              {cart.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <Laptop className="size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Your cart is waiting for a new laptop.</p>
                  <Button asChild variant="secondary" onClick={() => setCartOpen(false)}>
                    <Link to="/shop">Browse Laptop Catalog</Link>
                  </Button>
                </div>
              )}
          {cart.map((item) => (
            <div key={item.product.id} className="surface-card flex gap-3 p-3">
              <img
                src={item.product.image}
                alt={item.product.name}
                loading="lazy"
                width={1024}
                height={768}
                className="size-16 rounded-lg object-cover"
              />
              <div className="flex-1 space-y-1.5 min-w-0">
                <p className="line-clamp-2 text-sm font-semibold">{item.product.name}</p>
                <p className="text-xs text-muted-foreground truncate">{item.product.specs.processor} · {item.product.specs.ram}</p>
                <p className="text-sm font-bold text-foreground">{formatIDR(item.product.price * item.qty)}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => setQty(item.product.id, item.qty - 1)}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => setQty(item.product.id, item.qty + 1)}
                  >
                    <Plus className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-7"
                    onClick={() => removeFromCart(item.product.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

            {cart.length > 0 && (
              <div className="space-y-3 border-t border-border p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Promo code (LAPTOPAI10)"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <Button variant="secondary" onClick={() => applyDiscount(code)}>
                    Apply
                  </Button>
                </div>
                <Separator />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{formatIDR(cartSubtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount ({discountCode || "LAPTOPAI10"})</span>
                      <span className="font-semibold text-success">-{formatIDR(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold">{formatIDR(cartSubtotal - discount)}</span>
                  </div>
                </div>
                <Button asChild className="w-full" onClick={() => setCartOpen(false)}>
                  <Link to="/checkout">Proceed to Checkout</Link>
                </Button>
                <Button asChild variant="outline" className="w-full" onClick={() => setCartOpen(false)}>
                  <Link to="/cart">View Full Cart</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
