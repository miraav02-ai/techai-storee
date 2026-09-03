import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Image as ImageIcon,
  Loader2,
  Lock,
  QrCode,
  UploadCloud,
  X,
} from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AdminCustomerGuard } from "@/components/store/AdminCustomerGuard";
import { PaymentQrCard } from "@/components/store/PaymentQrCard";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { generateUUID } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Secure Checkout — LaptopAI Store" },
      {
        name: "description",
        content:
          "Complete your laptop order with QRIS, bank transfer, or cash on delivery on LaptopAI Store.",
      },
      { property: "og:title", content: "Checkout — LaptopAI Store" },
      { property: "og:description", content: "QRIS, bank transfer and COD payment options for your laptop purchase." },
    ],
  }),
  component: Checkout,
});

const payments = [
  { id: "QRIS", label: "QRIS", desc: "Scan and pay instantly", icon: QrCode },
  { id: "Bank Transfer", label: "Bank Transfer", desc: "BCA · Mandiri · BNI", icon: CreditCard },
  { id: "COD", label: "Cash on Delivery", desc: "Pay when it arrives", icon: Banknote },
];

function Checkout() {
  const { cart, cartSubtotal, discount, clearCart } = useStore();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [payment, setPayment] = useState("QRIS");
  const [name, setName] = useState(
    profile?.name || (user?.user_metadata ? (user.user_metadata["name"] as string) : ""),
  );
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Jakarta");
  const [zip, setZip] = useState("12190");
  const [province, setProvince] = useState("DKI Jakarta");
  const [address, setAddress] = useState("");

  // Payment proof file state
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const shipping = cartSubtotal > 5000000 || cartSubtotal === 0 ? 0 : 45000;
  const total = Math.max(0, cartSubtotal + shipping - discount);

  // File selection handler
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Allowed types check
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setUploadError("Invalid file format. Please upload JPG, PNG, or WebP image.");
      toast.error("Invalid File Type", {
        description: "Only JPG, PNG, and WebP images are supported.",
      });
      return;
    }

    // Size limit check (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit. Please upload a smaller image.");
      toast.error("File Too Large", {
        description: "Payment proof must be under 5MB.",
      });
      return;
    }

    setProofFile(file);
    const objectUrl = URL.createObjectURL(file);
    setProofPreview(objectUrl);
  };

  const removeProofFile = () => {
    setProofFile(null);
    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
      setProofPreview(null);
    }
    setUploadError(null);
  };

  // Place Order Submit Handler
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Sign In Required", {
        description: "Please sign in to place your order.",
      });
      void navigate({ to: "/login" });
      return;
    }

    if (cart.length === 0) {
      toast.error("Cart is Empty", {
        description: "Please add laptops to your cart before checking out.",
      });
      return;
    }

    // Validate Payment Proof for QRIS / Bank Transfer
    if ((payment === "QRIS" || payment === "Bank Transfer") && !proofFile) {
      setUploadError("Payment proof is mandatory for " + payment + ". Please upload your payment receipt.");
      toast.error("Payment Proof Required", {
        description: `Please upload your payment receipt for ${payment}.`,
      });
      return;
    }

    setSubmitting(true);
    setUploadError(null);

    try {
      console.log("[FORENSIC DEBUG] Place Order triggered");
      console.log("[FORENSIC DEBUG] typeof crypto:", typeof crypto);
      console.log("[FORENSIC DEBUG] typeof crypto?.randomUUID:", typeof (typeof crypto !== "undefined" ? crypto?.randomUUID : undefined));
      const orderId = generateUUID();
      console.log("[FORENSIC DEBUG] generateUUID() result:", orderId);
      console.log("[FORENSIC DEBUG] Location: src/routes/checkout.tsx::handlePlaceOrder calling src/lib/utils.ts::generateUUID");
      let paymentProofPath: string | null = null;

      // 1. Upload Payment Proof if provided
      if (proofFile) {
        const fileExt = proofFile.name.split(".").pop()?.toLowerCase() || "png";
        const sanitizedExt = ["jpeg", "png", "webp", "jpg"].includes(fileExt) ? fileExt : "png";
        const filePath = `${user.id}/${orderId}/payment-proof.${sanitizedExt}`;

        const { error: storageError } = await supabase.storage
          .from("payment-proofs")
          .upload(filePath, proofFile, {
            contentType: proofFile.type || "image/png",
            upsert: true,
          });

        if (storageError) {
          throw new Error(`Failed to upload payment proof: ${storageError.message}`);
        }

        paymentProofPath = filePath;
      }

      // 2. Insert Order record to public.orders
      const initialStatus = payment === "COD" ? "confirmed" : "payment_review";
      const { error: orderError } = await supabase.from("orders").insert({
        id: orderId,
        user_id: user.id,
        total_amount: total,
        payment_method: payment,
        payment_proof_path: paymentProofPath,
        status: initialStatus,
        shipping_name: name.trim() || "Customer",
        shipping_email: email.trim() || user.email || "customer@techai.store",
        shipping_phone: phone.trim() || "+628123456789",
        shipping_city: city.trim() || "Jakarta",
        shipping_postal_code: zip.trim() || "12190",
        shipping_province: province.trim() || "DKI Jakarta",
        shipping_address: address.trim() || "Default Address",
      });

      if (orderError) {
        throw new Error(`Failed to create order record: ${orderError.message}`);
      }

      // 3. Insert Order Items snapshots to public.order_items
      const orderItemsPayload = cart.map((item) => ({
        order_id: orderId,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.qty,
        unit_price: item.product.price,
        subtotal: item.product.price * item.qty,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);

      if (itemsError) {
        throw new Error(`Failed to save purchased items: ${itemsError.message}`);
      }

      // 4. Clear Cart on success
      clearCart();
      setPlacedOrderId(orderId);

      toast.success("Order Placed Successfully!", {
        description: `Order ID: ${orderId.slice(0, 8)} · ${payment}`,
      });
    } catch (err: any) {
      console.error("Order creation error:", err);
      const msg = err?.message || "An unexpected error occurred during checkout.";
      toast.error("Checkout Failed", { description: msg });
      setUploadError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Guest Protection
  if (!user) {
    return (
      <AdminCustomerGuard routeName="Checkout Pembayaran (/checkout)">
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-secondary/10 text-secondary">
            <Lock className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">Sign In to Complete Checkout</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Orders are securely associated with your account. Please sign in to finalize your purchase.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild className="rounded-xl">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/shop">Browse Catalog</Link>
            </Button>
          </div>
        </div>
      </AdminCustomerGuard>
    );
  }

  // Order Confirmed State
  if (placedOrderId) {
    return (
      <AdminCustomerGuard routeName="Checkout Pembayaran (/checkout)">
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-success/10 text-success shadow-inner">
            <CheckCircle2 className="size-10" />
          </div>
          <h1 className="text-2xl font-bold">Order Confirmed!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thank you for your purchase. Your order has been placed into our system.
          </p>
          <div className="my-4 rounded-xl border border-border bg-surface p-4 text-sm">
            Order ID: <span className="font-semibold text-foreground">{placedOrderId}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Payment Method: <span className="font-semibold text-foreground">{payment}</span> · Status:{" "}
            <span className="font-semibold text-secondary">
              {payment === "COD" ? "Confirmed (Cash on Delivery)" : "Payment Verification"}
            </span>
          </p>

          {payment !== "COD" && (
            <div className="my-6 text-left">
              <PaymentQrCard orderId={placedOrderId} amount={total} paymentMethod={payment} />
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-xl">
              <Link to="/orders">View My Orders</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/shop">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </AdminCustomerGuard>
    );
  }

  // Empty Cart State
  if (cart.length === 0) {
    return (
      <AdminCustomerGuard routeName="Checkout Pembayaran (/checkout)">
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Your Cart is Empty</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please add laptops to your cart first before checking out.</p>
          <Button asChild className="mt-5 rounded-xl">
            <Link to="/shop">Browse Laptop Catalog</Link>
          </Button>
        </div>
      </AdminCustomerGuard>
    );
  }

  return (
    <AdminCustomerGuard routeName="Checkout Pembayaran (/checkout)">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Secure Checkout</h1>
        <form className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]" onSubmit={handlePlaceOrder}>
          <div className="space-y-6">
            {/* Shipping Address */}
            <section className="surface-card space-y-4 p-5">
              <h2 className="font-semibold text-base">1. Shipping Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    required
                    placeholder="+62 812-3456-7890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    required
                    placeholder="e.g. Jakarta Selatan"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zip">Postal Code</Label>
                  <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Full Delivery Address *</Label>
                  <Textarea
                    id="address"
                    required
                    placeholder="Street name, house number, RT/RW, subdistrict..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="surface-card space-y-4 p-5">
              <h2 className="font-semibold text-base">2. Payment Method</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {payments.map((p) => {
                  const Icon = p.icon;
                  const selected = payment === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPayment(p.id)}
                      className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                        selected
                          ? "border-secondary bg-secondary/10 shadow-sm"
                          : "border-border hover:bg-surface/50"
                      }`}
                    >
                      <Icon className={`size-5 ${selected ? "text-secondary" : "text-muted-foreground"}`} />
                      <span className="mt-2 font-semibold text-sm">{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Payment Details + Proof Upload for QRIS / Bank Transfer */}
              {payment === "QRIS" && (
                <div className="space-y-4">
                  <PaymentQrCard amount={total} paymentMethod="QRIS" />

                  {/* Upload Payment Proof Component */}
                  <div className="rounded-2xl border border-border bg-surface p-5 space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="qris-proof" className="text-sm font-semibold flex items-center gap-1.5">
                        <UploadCloud className="size-4 text-secondary" /> Upload Bukti Pembayaran QRIS *
                      </Label>
                      <span className="text-[11px] text-muted-foreground">JPG, PNG, WEBP (Max 5MB)</span>
                    </div>

                    {!proofPreview ? (
                      <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:bg-surface-elevated/50 transition-colors">
                        <input
                          id="qris-proof"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <label htmlFor="qris-proof" className="cursor-pointer flex flex-col items-center gap-2">
                          <div className="grid size-10 place-items-center rounded-xl bg-secondary/10 text-secondary">
                            <ImageIcon className="size-5" />
                          </div>
                          <span className="text-sm font-medium text-foreground">Klik untuk upload struk / screenshot QRIS</span>
                          <span className="text-xs text-muted-foreground">Pastikan nominal Rp{formatIDR(total)} terlihat jelas</span>
                        </label>
                      </div>
                    ) : (
                      <div className="relative rounded-2xl border border-secondary/40 bg-surface-elevated p-3 flex items-center gap-3">
                        <img src={proofPreview} alt="Bukti Transfer" className="size-16 rounded-xl object-cover border border-border" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate text-foreground">{proofFile?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{proofFile ? (proofFile.size / 1024).toFixed(0) + " KB" : ""}</p>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                            <CheckCircle2 className="size-3" /> File siap diupload
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                          onClick={removeProofFile}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {payment === "Bank Transfer" && (
                <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Transfer to our official corporate account within 24 hours:
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between rounded-xl bg-card p-3 border border-border">
                      <span className="font-semibold">BCA Virtual Account</span>
                      <span className="font-mono font-bold text-secondary">8801 2345 6789 0000</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card p-3 border border-border">
                      <span className="font-semibold">Mandiri Bill Payment</span>
                      <span className="font-mono font-bold text-secondary">7001 2345 6789</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card p-3 border border-border">
                      <span className="font-semibold">Account Holder</span>
                      <span className="font-medium">PT LaptopAI Indonesia</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Upload Payment Proof Component */}
                  <div className="text-left space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="bank-proof" className="text-sm font-semibold flex items-center gap-1.5">
                        <UploadCloud className="size-4 text-secondary" /> Upload Bukti Transfer Bank *
                      </Label>
                      <span className="text-[11px] text-muted-foreground">JPG, PNG, WEBP (Max 5MB)</span>
                    </div>

                    {!proofPreview ? (
                      <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:bg-surface-elevated/50 transition-colors">
                        <input
                          id="bank-proof"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <label htmlFor="bank-proof" className="cursor-pointer flex flex-col items-center gap-2">
                          <div className="grid size-10 place-items-center rounded-xl bg-secondary/10 text-secondary">
                            <ImageIcon className="size-5" />
                          </div>
                          <span className="text-sm font-medium text-foreground">Klik untuk upload bukti transfer bank</span>
                          <span className="text-xs text-muted-foreground">Foto struk ATM atau screenshot m-Banking</span>
                        </label>
                      </div>
                    ) : (
                      <div className="relative rounded-2xl border border-secondary/40 bg-surface-elevated p-3 flex items-center gap-3">
                        <img src={proofPreview} alt="Bukti Transfer" className="size-16 rounded-xl object-cover border border-border" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate text-foreground">{proofFile?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{proofFile ? (proofFile.size / 1024).toFixed(0) + " KB" : ""}</p>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                            <CheckCircle2 className="size-3" /> File siap diupload
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                          onClick={removeProofFile}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {payment === "COD" && (
                <div className="rounded-2xl border border-border bg-surface p-4 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Cash on Delivery Policy</p>
                  <p>
                    Please prepare exact cash of <strong>{formatIDR(total)}</strong> upon courier arrival.
                    Available for Jabodetabek, Bandung, and Surabaya areas.
                  </p>
                </div>
              )}

              {uploadError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </section>
          </div>

          {/* Order Summary Sidebar */}
          <aside className="surface-card h-fit space-y-4 p-5">
            <h2 className="font-semibold text-base">Order Review</h2>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="size-12 rounded-lg object-cover border border-border"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{item.product.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.qty} × {formatIDR(item.product.price)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold">{formatIDR(item.product.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatIDR(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-semibold text-success">
                  {shipping === 0 ? "Free Nationwide" : formatIDR(shipping)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-semibold text-success">-{formatIDR(discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total Amount</span>
                <span className="font-bold text-foreground">{formatIDR(total)}</span>
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full rounded-xl py-5 text-sm font-semibold">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Processing Order...
                </>
              ) : (
                `Place Order · ${formatIDR(total)}`
              )}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              🔒 Payments and proof files are securely verified with Supabase Storage.
            </p>
          </aside>
        </form>
      </div>
    </AdminCustomerGuard>
  );
}
