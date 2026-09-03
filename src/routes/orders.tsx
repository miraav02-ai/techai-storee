import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Loader2,
  Lock,
  MapPin,
  Package,
  RotateCw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AdminCustomerGuard } from "@/components/store/AdminCustomerGuard";
import { PaymentQrCard } from "@/components/store/PaymentQrCard";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/catalog";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Laptop Order History & Tracking — LaptopAI Store" },
      {
        name: "description",
        content:
          "Track your laptop orders through Pending, Processing, Shipped, and Completed stages in real time on LaptopAI Store.",
      },
      { property: "og:title", content: "Laptop Order History — LaptopAI Store" },
      { property: "og:description", content: "Track your laptop order status in real time." },
    ],
  }),
  component: Orders,
});

export type DbOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
};

export type DbOrder = {
  id: string;
  user_id: string;
  total_amount: number;
  payment_method: string;
  payment_proof_path: string | null;
  status: string;
  expires_at?: string | null;
  shipping_name: string;
  shipping_email: string;
  shipping_phone: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_province: string;
  shipping_address: string;
  created_at: string;
  updated_at: string;
  order_items: DbOrderItem[];
};

export function getStatusDetails(status: string) {
  switch (status.toLowerCase()) {
    case "confirmed":
      return {
        label: "Confirmed",
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        icon: CheckCircle2,
        step: 2,
      };
    case "payment_review":
      return {
        label: "Payment Review",
        color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        icon: Clock,
        step: 1,
      };
    case "processing":
      return {
        label: "Processing",
        color: "bg-primary/10 text-primary border-primary/20",
        icon: RotateCw,
        step: 3,
      };
    case "shipped":
      return {
        label: "Shipped",
        color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        icon: Truck,
        step: 4,
      };
    case "delivered":
    case "completed":
      return {
        label: "Delivered",
        color: "bg-success/10 text-success border-success/20",
        icon: CheckCircle2,
        step: 5,
      };
    case "expired":
      return {
        label: "Expired",
        color: "bg-destructive/10 text-destructive border-destructive/20",
        icon: XCircle,
        step: -1,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        color: "bg-destructive/10 text-destructive border-destructive/20",
        icon: XCircle,
        step: -1,
      };
    case "pending_payment":
    default:
      return {
        label: "Pending Payment",
        color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        icon: Clock,
        step: 0,
      };
  }
}

function Orders() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<DbOrder | null>(null);

  // Signed URL state for payment proof modal
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching customer orders:", error);
        toast.error("Failed to load orders", { description: error.message });
      } else {
        setOrders((data as DbOrder[]) || []);
      }
    } catch (err: any) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch and Realtime subscription
  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    void fetchOrders();

    const channel = supabase
      .channel(`user-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Realtime order update received:", payload);
          toast.info("Order Status Updated", {
            description: `Order ${((payload.new as any)?.id || "").slice(0, 8)} status is now ${(payload.new as any)?.status}`,
          });
          void fetchOrders();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, fetchOrders]);

  // View Payment Proof handler
  const handleViewProof = async (order: DbOrder) => {
    if (!order.payment_proof_path) {
      toast.info("No Payment Proof", {
        description: "This order does not require payment proof (e.g. COD).",
      });
      return;
    }

    setProofLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(order.payment_proof_path, 3600);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Could not generate secure proof link.");
      }

      setProofModalUrl(data.signedUrl);
    } catch (err: any) {
      toast.error("Error Accessing Proof", { description: err.message });
    } finally {
      setProofLoading(false);
    }
  };

  // Auth Loading State
  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-secondary" />
      </div>
    );
  }

  // Guest Protection
  if (!user) {
    return (
      <AdminCustomerGuard routeName="Riwayat Pesanan (/orders)">
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-secondary/10 text-secondary">
            <Lock className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">Sign In to View Orders</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please sign in to access your laptop purchases and live order tracking.
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

  return (
    <AdminCustomerGuard routeName="Riwayat Pesanan (/orders)">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">My Order History</h1>
            <p className="text-sm text-muted-foreground">
              {orders.length} {orders.length === 1 ? "order" : "orders"} associated with {user.email}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchOrders()}
              className="gap-2 rounded-xl"
            >
              <RotateCw className="size-4" /> Refresh
            </Button>
            <Button asChild variant="default" size="sm" className="rounded-xl">
              <Link to="/shop">Shop Laptops</Link>
            </Button>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="mt-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-secondary" />
            <p className="text-sm">Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-12 surface-card p-12 text-center shadow-md">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-3xl bg-muted text-muted-foreground">
              <ShoppingBag className="size-7" />
            </div>
            <h2 className="text-lg font-semibold">No Orders Found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You haven't placed any laptop orders yet.
            </p>
            <Button asChild className="mt-6 rounded-xl">
              <Link to="/shop">Browse Laptop Catalog</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {orders.map((o) => {
              const statusInfo = getStatusDetails(o.status);
              const StatusIcon = statusInfo.icon;
              const dateStr = new Date(o.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <article
                  key={o.id}
                  className="surface-card overflow-hidden p-6 transition-all hover:border-secondary/40 shadow-sm"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-secondary/10 text-secondary">
                        <Package className="size-5" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs font-bold text-foreground">
                            ID: {o.id.slice(0, 8)}...
                          </p>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="size-3" /> {dateStr}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Payment: <span className="font-semibold text-foreground">{o.payment_method}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`gap-1.5 px-3 py-1 font-semibold ${statusInfo.color}`}>
                        <StatusIcon className="size-3.5" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Tracking Progress Bar */}
                  {statusInfo.step >= 0 && (
                    <div className="my-5">
                      <div className="grid grid-cols-5 gap-2 text-center text-[11px] font-medium">
                        <span className={statusInfo.step >= 0 ? "text-secondary font-bold" : "text-muted-foreground"}>
                          Order Placed
                        </span>
                        <span className={statusInfo.step >= 1 ? "text-secondary font-bold" : "text-muted-foreground"}>
                          Payment Review
                        </span>
                        <span className={statusInfo.step >= 2 ? "text-secondary font-bold" : "text-muted-foreground"}>
                          Confirmed
                        </span>
                        <span className={statusInfo.step >= 3 ? "text-secondary font-bold" : "text-muted-foreground"}>
                          Processing
                        </span>
                        <span className={statusInfo.step >= 4 ? "text-secondary font-bold" : "text-muted-foreground"}>
                          Shipped & Delivered
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-secondary transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(15, (statusInfo.step / 4) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Items Summary */}
                  <div className="my-4 space-y-2">
                    {o.order_items?.map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2 truncate pr-4">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">
                            {it.quantity}x
                          </span>
                          <span className="truncate font-medium text-foreground">{it.product_name}</span>
                        </div>
                        <span className="whitespace-nowrap font-medium text-muted-foreground">
                          {formatIDR(it.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  {/* Footer and Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground">Total Paid / Payable:</span>
                      <p className="text-lg font-bold text-foreground">{formatIDR(o.total_amount)}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {o.payment_proof_path && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={proofLoading}
                          onClick={() => void handleViewProof(o)}
                          className="gap-1.5 rounded-xl text-xs"
                        >
                          <FileCheck2 className="size-3.5 text-secondary" /> View Receipt
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedOrder(o)}
                        className="gap-1.5 rounded-xl text-xs font-semibold"
                      >
                        <Eye className="size-3.5" /> Order Details
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Order Detail Modal */}
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-5 text-secondary" />
                Order Details
              </DialogTitle>
              <DialogDescription className="font-mono text-xs">
                Order ID: {selectedOrder?.id}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-5 pt-2 text-xs sm:text-sm">
                {/* Status and Method */}
                <div className="flex items-center justify-between rounded-xl bg-surface p-4 border border-border">
                  <div>
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={`gap-1 font-semibold ${getStatusDetails(selectedOrder.status).color}`}
                      >
                        {getStatusDetails(selectedOrder.status).label}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Payment Method:</span>
                    <p className="font-semibold text-foreground mt-1">{selectedOrder.payment_method}</p>
                  </div>
                </div>

                {/* Expiring QR Payment Card for pending / review / expired orders */}
                {selectedOrder.payment_method !== "COD" &&
                  ["pending_payment", "payment_review", "expired"].includes(selectedOrder.status.toLowerCase()) && (
                    <div className="pt-1">
                      <PaymentQrCard
                        orderId={selectedOrder.id}
                        amount={selectedOrder.total_amount}
                        expiresAt={
                          selectedOrder.expires_at ||
                          (selectedOrder.created_at
                            ? new Date(new Date(selectedOrder.created_at).getTime() + 5 * 60 * 1000).toISOString()
                            : undefined)
                        }
                        paymentMethod={selectedOrder.payment_method}
                        onExpiresAtChange={(newExp) => {
                          setSelectedOrder((prev) =>
                            prev ? { ...prev, expires_at: newExp, status: "payment_review" } : null,
                          );
                          void fetchOrders();
                        }}
                      />
                    </div>
                  )}

                {/* Shipping Destination */}
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-1.5 text-xs text-foreground">
                    <MapPin className="size-4 text-secondary" /> Shipping Address
                  </h3>
                  <div className="rounded-xl border border-border bg-surface/50 p-3 space-y-1 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{selectedOrder.shipping_name}</p>
                    <p>{selectedOrder.shipping_phone} · {selectedOrder.shipping_email}</p>
                    <p>{selectedOrder.shipping_address}</p>
                    <p>{selectedOrder.shipping_city}, {selectedOrder.shipping_province} {selectedOrder.shipping_postal_code}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-xs text-foreground">Purchased Items ({selectedOrder.order_items?.length})</h3>
                  <div className="rounded-xl border border-border overflow-hidden">
                    {selectedOrder.order_items?.map((it, idx) => (
                      <div
                        key={it.id}
                        className={`flex items-center justify-between p-3 text-xs ${
                          idx !== selectedOrder.order_items.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        <div>
                          <p className="font-medium text-foreground">{it.product_name}</p>
                          <p className="text-muted-foreground text-[11px]">
                            {it.quantity} × {formatIDR(it.unit_price)}
                          </p>
                        </div>
                        <span className="font-semibold text-foreground">{formatIDR(it.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Summary */}
                <div className="flex justify-between items-center border-t border-border pt-3">
                  <span className="font-medium text-muted-foreground">Total Paid:</span>
                  <span className="text-base font-bold text-foreground">
                    {formatIDR(selectedOrder.total_amount)}
                  </span>
                </div>

                {/* Payment Proof Button if available */}
                {selectedOrder.payment_proof_path && (
                  <div className="border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2 rounded-xl text-xs"
                      onClick={() => void handleViewProof(selectedOrder)}
                    >
                      <FileCheck2 className="size-4 text-secondary" /> Open Uploaded Payment Proof
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Proof Lightbox Modal */}
        <Dialog open={!!proofModalUrl} onOpenChange={(open) => !open && setProofModalUrl(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg text-center">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2">
                <FileCheck2 className="size-5 text-secondary" />
                Verified Payment Receipt
              </DialogTitle>
              <DialogDescription>
                Securely retrieved from private Supabase Storage
              </DialogDescription>
            </DialogHeader>

            {proofModalUrl && (
              <div className="mt-2 space-y-4">
                <div className="overflow-hidden rounded-xl border border-border bg-surface p-2 shadow-inner">
                  <img
                    src={proofModalUrl}
                    alt="Payment receipt proof"
                    className="mx-auto max-h-96 rounded-lg object-contain"
                  />
                </div>
                <Button asChild variant="outline" size="sm" className="gap-2 rounded-xl text-xs">
                  <a href={proofModalUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3.5" /> Open Full Image in New Tab
                  </a>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminCustomerGuard>
  );
}
