import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Boxes,
  DollarSign,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  ImagePlus,
  Laptop,
  Loader2,
  Lock,
  MapPin,
  Package,
  Pencil,
  Plus,
  RotateCw,
  ShieldAlert,
  ShoppingBag,
  TriangleAlert,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  formatIDR,
  orderStatuses,
  type Brand,
  type Category,
  type OrderStatus,
  type Product,
} from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { DbOrder } from "./orders";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Laptop Management Dashboard — LaptopAI Store" },
      {
        name: "description",
        content:
          "Manage LaptopAI Store inventory, 70-laptop specifications, brand collections, and customer orders.",
      },
      { property: "og:title", content: "Laptop Management Dashboard — LaptopAI Store" },
      {
        property: "og:description",
        content: "Laptop CRUD, stock alerts, collection taxonomy, and fulfillment controls.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

export const dbOrderStatuses = [
  "pending_payment",
  "payment_review",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "expired",
];

export function dbStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "payment_review":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "processing":
      return "bg-primary/10 text-primary border-primary/20";
    case "shipped":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "delivered":
    case "completed":
      return "bg-success/10 text-success border-success/20";
    case "expired":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "cancelled":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "pending_payment":
    default:
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  }
}

function statusClass(status: OrderStatus) {
  switch (status) {
    case "Completed":
      return "bg-success text-success-foreground";
    case "Cancelled":
      return "bg-destructive text-destructive-foreground";
    case "Shipped":
      return "bg-secondary text-secondary-foreground";
    case "Processing":
      return "bg-primary text-primary-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

const emptyProduct = (): Product => ({
  id: "lap-" + Math.floor(Math.random() * 100000),
  name: "",
  brand: "ASUS",
  category: "Coding & Programming",
  price: 15000000,
  rating: 4.8,
  reviews: 0,
  stock: 10,
  badges: ["New Release"],
  image: "/images/laptop.jpg",
  warranty: "2 years official warranty",
  description: "",
  specs: {
    processor: "Intel Core Ultra 7 155H",
    ram: "16GB LPDDR5X",
    storage: "512GB NVMe SSD",
    gpu: "Intel Arc Graphics",
    screenSize: '14.0"',
    resolution: "2.8K (2880 x 1800)",
    refreshRate: "120Hz",
    operatingSystem: "Windows 11 Home",
    battery: "70Wh — up to 12 hours",
    weight: "1.35 kg",
    warranty: "2 years official warranty",
    usage: "Coding",
    screen: '14.0" 2.8K OLED 120Hz',
  },
  sold: 0,
  active: true,
  createdAt: new Date().toISOString().slice(0, 10),
});

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const {
    products,
    categories,
    brands,
    orders,
    saveProduct,
    deleteProduct,
    saveCategory,
    deleteCategory,
    saveBrand,
    deleteBrand,
    updateOrderStatus,
  } = useStore();

  const [draft, setDraft] = useState<Product | null>(null);
  const [catDraft, setCatDraft] = useState<Category | null>(null);
  const [brandDraft, setBrandDraft] = useState<Brand | null>(null);

  // Supabase live orders state
  const [dbOrders, setDbOrders] = useState<DbOrder[]>([]);
  const [dbOrdersLoading, setDbOrdersLoading] = useState<boolean>(true);
  const [selectedOrder, setSelectedOrder] = useState<DbOrder | null>(null);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState<boolean>(false);

  // Fetch all orders from Supabase for Admin
  const fetchDbOrders = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders for admin:", error);
      } else {
        setDbOrders((data as DbOrder[]) || []);
      }
    } catch (err) {
      console.error("Admin orders query error:", err);
    } finally {
      setDbOrdersLoading(false);
    }
  }, [isAdmin]);

  // Realtime subscription for Admin
  useEffect(() => {
    if (!isAdmin) return;

    void fetchDbOrders();

    const channel = supabase
      .channel("admin-orders-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("Admin received realtime order update:", payload);
          toast.info("Order Event Received", {
            description: `Order ${((payload.new as any)?.id || "").slice(0, 8)} status is ${(payload.new as any)?.status}`,
          });
          void fetchDbOrders();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, fetchDbOrders]);

  // Update order status in Supabase
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) {
        toast.error("Failed to update status", { description: error.message });
      } else {
        toast.success("Order Status Updated", {
          description: `Order ${orderId.slice(0, 8)} is now ${newStatus}`,
        });
        setDbOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
        );
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err: any) {
      toast.error("Error updating status", { description: err.message });
    }
  };

  // View Payment Proof handler for Admin
  const handleAdminViewProof = async (order: DbOrder) => {
    if (!order.payment_proof_path) {
      toast.info("No Proof Uploaded", {
        description: "This order does not have payment proof attached (e.g. COD).",
      });
      return;
    }

    setProofLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(order.payment_proof_path, 3600);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Failed to generate secure signed link.");
      }

      setProofModalUrl(data.signedUrl);
    } catch (err: any) {
      toast.error("Error Accessing Proof", { description: err.message });
    } finally {
      setProofLoading(false);
    }
  };

  const stats = useMemo(() => {
    const activeDbOrders = dbOrders.length > 0 ? dbOrders : [];
    const revenue = activeDbOrders.length > 0
      ? activeDbOrders
          .filter((o) => o.status !== "cancelled")
          .reduce((s, o) => s + Number(o.total_amount || 0), 0)
      : orders
          .filter((o) => o.status !== "Cancelled")
          .reduce((s, o) => s + o.total, 0);

    const ordersCount = activeDbOrders.length > 0 ? activeDbOrders.length : orders.length;
    const customersCount = activeDbOrders.length > 0
      ? new Set(activeDbOrders.map((o) => o.shipping_email)).size
      : new Set(orders.map((o) => o.email)).size;

    return {
      revenue,
      orders: ordersCount,
      products: products.length,
      customers: customersCount,
    };
  }, [dbOrders, orders, products]);

  const lowStock = products.filter((p) => p.stock <= 5).sort((a, b) => a.stock - b.stock);
  const bestSellers = [...products].sort((a, b) => b.sold - a.sold).slice(0, 6);

  // 1. Loading state
  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-secondary" />
          <p className="text-sm font-medium text-muted-foreground">
            Verifying administrator authorization...
          </p>
        </div>
      </div>
    );
  }

  // 2. Guest protection (Not logged in)
  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-16">
        <div className="surface-card w-full max-w-md p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-3xl bg-secondary/10 text-secondary">
            <Lock className="size-7" />
          </div>
          <h1 className="text-2xl font-bold">Admin Sign In Required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The Admin Management Dashboard is restricted. Please sign in with an authorized Administrator account to continue.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild className="rounded-xl">
              <Link to="/login">Sign In as Admin</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/shop">Back to Store</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Customer protection (Logged in, but not Admin)
  if (!isAdmin) {
    return (
      <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-16">
        <div className="surface-card w-full max-w-md border border-destructive/30 bg-destructive/5 p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-3xl bg-destructive/10 text-destructive">
            <ShieldAlert className="size-7" />
          </div>
          <Badge variant="outline" className="mb-2 border-destructive/40 text-destructive font-mono">
            403 Access Denied
          </Badge>
          <h1 className="text-2xl font-bold text-destructive">Access Restricted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account ({user.email}) does not have administrator privileges to view or manage the LaptopAI store dashboard.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild className="rounded-xl">
              <Link to="/shop">Return to Laptop Catalog</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Laptop className="size-6 text-secondary" /> LaptopAI Store Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Inventory control, 70-laptop catalog specifications, and order fulfillment center
          </p>
        </div>
        <Badge variant="secondary">Signed in as Laptop Admin</Badge>
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview & Analytics</TabsTrigger>
          <TabsTrigger value="products">Laptop Catalog ({products.length})</TabsTrigger>
          <TabsTrigger value="taxonomy">Collections & Brands</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total revenue"
              value={formatIDR(stats.revenue)}
              icon={<DollarSign className="size-5" />}
            />
            <StatCard
              label="Completed Orders"
              value={String(stats.orders)}
              icon={<ShoppingBag className="size-5" />}
            />
            <StatCard
              label="Active Laptop Models"
              value={String(stats.products)}
              icon={<Boxes className="size-5" />}
            />
            <StatCard
              label="Unique Buyers"
              value={String(stats.customers)}
              icon={<Users className="size-5" />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface-card p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <TriangleAlert className="size-4 text-warning" /> Low Stock Alerts (Laptops Only)
              </h2>
              <div className="mt-3 space-y-2">
                {lowStock.length === 0 && (
                  <p className="text-sm text-muted-foreground">All laptops are well stocked.</p>
                )}
                {lowStock.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.brand} · {p.specs.processor} · {p.specs.gpu}
                      </span>
                    </div>
                    <Badge className={p.stock === 0 ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}>
                      {p.stock === 0 ? "Out of Stock" : `Only ${p.stock} left`}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-card p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Package className="size-4 text-secondary" /> Top Selling Laptops
              </h2>
              <div className="mt-3 space-y-2">
                {bestSellers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.brand} · {formatIDR(p.price)}</span>
                    </div>
                    <span className="whitespace-nowrap text-xs font-bold text-foreground">
                      {p.sold} units sold
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </TabsContent>

        {/* Laptops CRUD */}
        <TabsContent value="products">
          <div className="surface-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Laptop Database ({products.length} Models)</h2>
                <p className="text-xs text-muted-foreground">Manage all specifications, pricing, stock, and availability</p>
              </div>
              <Button className="rounded-xl" onClick={() => setDraft(emptyProduct())}>
                <Plus className="size-4 mr-1" /> Add New Laptop
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Laptop Model</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Specs (CPU · GPU · RAM · SSD)</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-[240px]">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.brand}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px]">{p.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                        <span className="block truncate">{p.specs.processor} · {p.specs.gpu}</span>
                        <span className="block text-[11px]">{p.specs.ram} · {p.specs.storage} · {p.specs.screenSize}</span>
                      </TableCell>
                      <TableCell className="font-semibold text-xs whitespace-nowrap">{formatIDR(p.price)}</TableCell>
                      <TableCell>
                        <Badge variant={p.stock <= 5 ? "destructive" : "secondary"}>
                          {p.stock}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.active ? "default" : "outline"}>
                          {p.active ? "Active" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => setDraft(p)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Collections & Brands */}
        <TabsContent value="taxonomy" className="grid gap-4 lg:grid-cols-2">
          <section className="surface-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Laptop Collections ({categories.length})</h2>
                <p className="text-xs text-muted-foreground">Use-case focused storefront categories</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setCatDraft({
                    id: "c" + Math.floor(Math.random() * 10000),
                    name: "",
                    slug: "",
                    icon: "Laptop",
                    count: 0,
                  })
                }
              >
                <Plus className="size-4" /> Add
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collection Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Models Count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{c.slug}</TableCell>
                    <TableCell className="font-bold">{products.filter((p) => p.category === c.name).length}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setCatDraft(c)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteCategory(c.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section className="surface-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Laptop Brands ({brands.length})</h2>
                <p className="text-xs text-muted-foreground">7 global computer manufacturers</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setBrandDraft({
                    id: "b" + Math.floor(Math.random() * 10000),
                    name: "",
                    country: "",
                    products: 0,
                  })
                }
              >
                <Plus className="size-4" /> Add
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{b.country}</TableCell>
                    <TableCell className="font-bold">{products.filter((p) => p.brand === b.name).length}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setBrandDraft(b)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteBrand(b.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders">
          <div className="surface-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Order Fulfillment & Tracking ({dbOrders.length})</h2>
                <p className="text-xs text-muted-foreground">
                  Live orders synced with Supabase Realtime
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchDbOrders()}
                className="gap-2 rounded-xl text-xs"
              >
                <RotateCw className="size-3.5" /> Refresh Orders
              </Button>
            </div>

            {dbOrdersLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="size-6 animate-spin text-secondary" />
                <p className="text-xs">Loading store orders...</p>
              </div>
            ) : dbOrders.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Package className="mx-auto size-10 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-medium">No Customer Orders Yet</p>
                <p className="text-xs">New orders placed by customers will appear here in real time.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Purchased Items</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total (IDR)</TableHead>
                      <TableHead>Payment & Proof</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-40">Update Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dbOrders.map((o) => {
                      const dateStr = new Date(o.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs font-semibold">
                            {o.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <span className="block font-medium text-xs">{o.shipping_name}</span>
                            <span className="text-[11px] text-muted-foreground">{o.shipping_email}</span>
                          </TableCell>
                          <TableCell className="max-w-[200px] text-xs">
                            {o.order_items?.map((it) => (
                              <div key={it.id} className="truncate text-muted-foreground text-[11px]">
                                {it.quantity}x {it.product_name}
                              </div>
                            ))}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{dateStr}</TableCell>
                          <TableCell className="font-semibold text-xs whitespace-nowrap">
                            {formatIDR(o.total_amount)}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium block">{o.payment_method}</span>
                            {o.payment_proof_path ? (
                              <button
                                type="button"
                                onClick={() => void handleAdminViewProof(o)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary hover:underline mt-0.5"
                              >
                                <FileCheck2 className="size-3" /> View Proof
                              </button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">No file (COD)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${dbStatusBadge(o.status)}`}>
                              {o.status.replace(/_/g, " ").toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={o.status}
                              onValueChange={(v) => void handleUpdateStatus(o.id, v)}
                            >
                              <SelectTrigger className="h-8 text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {dbOrderStatuses.map((s) => (
                                  <SelectItem key={s} value={s} className="text-xs">
                                    {s.replace(/_/g, " ").toUpperCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedOrder(o)}
                              className="gap-1 rounded-lg text-xs"
                            >
                              <Eye className="size-3.5" /> Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Laptop CRUD Modal with 17 fields */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{draft?.name ? `Edit Laptop: ${draft.name}` : "Add New Laptop to Database"}</DialogTitle>
            <DialogDescription>
              Complete all hardware, display, and warranty specifications for this laptop model.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Model Name</Label>
                <Input
                  value={draft.name}
                  placeholder="e.g. ASUS ROG Zephyrus G16 (2026)"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Select value={draft.brand} onValueChange={(v) => setDraft({ ...draft, brand: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Target Collection</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) => setDraft({ ...draft, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Price (IDR)</Label>
                <Input
                  type="number"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Stock Availability</Label>
                <Input
                  type="number"
                  value={draft.stock}
                  onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Processor (CPU)</Label>
                <Input
                  value={draft.specs.processor ?? ""}
                  placeholder="e.g. Intel Core Ultra 9 185H / Ryzen 7 8845HS"
                  onChange={(e) =>
                    setDraft({ ...draft, specs: { ...draft.specs, processor: e.target.value } })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Graphics (GPU)</Label>
                <Input
                  value={draft.specs.gpu ?? ""}
                  placeholder="e.g. NVIDIA GeForce RTX 4080 12GB"
                  onChange={(e) =>
                    setDraft({ ...draft, specs: { ...draft.specs, gpu: e.target.value } })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Memory (RAM)</Label>
                <Input
                  value={draft.specs.ram ?? ""}
                  placeholder="e.g. 32GB LPDDR5X"
                  onChange={(e) =>
                    setDraft({ ...draft, specs: { ...draft.specs, ram: e.target.value } })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>SSD Storage</Label>
                <Input
                  value={draft.specs.storage ?? ""}
                  placeholder="e.g. 1TB NVMe PCIe 4.0 SSD"
                  onChange={(e) =>
                    setDraft({ ...draft, specs: { ...draft.specs, storage: e.target.value } })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Screen Size</Label>
                <Input
                  value={draft.specs.screenSize ?? ""}
                  placeholder='e.g. 16.0"'
                  onChange={(e) =>
                    setDraft({ ...draft, specs: { ...draft.specs, screenSize: e.target.value } })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Screen Resolution</Label>
                <Input
                  value={draft.specs.resolution ?? ""}
                  placeholder="e.g. 2.5K (2560 x 1600)"
                  onChange={(e) =>
                    setDraft({ ...draft, specs: { ...draft.specs, resolution: e.target.value } })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Refresh Rate</Label>
                <Input
                  value={draft.specs.refreshRate ?? ""}
                  placeholder="e.g. 240Hz / 120Hz"
                  onChange={(e) =>
                    setDraft({ ...draft, specs: { ...draft.specs, refreshRate: e.target.value } })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Battery Capacity</Label>
                <Input
                  value={draft.specs.battery ?? ""}
                  placeholder="e.g. 90Wh — up to 8 hours"
                  onChange={(e) =>
                    setDraft({ ...draft, specs: { ...draft.specs, battery: e.target.value } })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Weight</Label>
                <Input
                  value={draft.specs.weight ?? ""}
                  placeholder="e.g. 1.85 kg"
                  onChange={(e) =>
                    setDraft({ ...draft, specs: { ...draft.specs, weight: e.target.value } })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Operating System</Label>
                <Input
                  value={draft.specs.operatingSystem ?? ""}
                  placeholder="e.g. Windows 11 Home / macOS Sequoia"
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      specs: { ...draft.specs, operatingSystem: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Warranty Coverage</Label>
                <Input
                  value={draft.warranty}
                  placeholder="e.g. 2 years official ASUS warranty"
                  onChange={(e) => setDraft({ ...draft, warranty: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={draft.description}
                  rows={3}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Product Image</Label>
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-surface p-4">
                  <ImagePlus className="size-5 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">
                    Placeholder image path: <span className="font-mono">{draft.image}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface p-3 sm:col-span-2">
                <Label htmlFor="active">Visible in Storefront Catalog</Label>
                <Switch
                  id="active"
                  checked={draft.active}
                  onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (draft) saveProduct(draft);
                setDraft(null);
              }}
            >
              Save Laptop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collection modal */}
      <Dialog open={!!catDraft} onOpenChange={(o) => !o && setCatDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laptop Collection</DialogTitle>
            <DialogDescription>Collections drive storefront filter tabs.</DialogDescription>
          </DialogHeader>
          {catDraft && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Collection Name</Label>
                <Input
                  value={catDraft.name}
                  onChange={(e) =>
                    setCatDraft({
                      ...catDraft,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  value={catDraft.slug}
                  onChange={(e) => setCatDraft({ ...catDraft, slug: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDraft(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (catDraft) saveCategory(catDraft);
                setCatDraft(null);
              }}
            >
              Save Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brand modal */}
      <Dialog open={!!brandDraft} onOpenChange={(o) => !o && setBrandDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laptop Brand</DialogTitle>
            <DialogDescription>Brands appear in catalog filter checkboxes.</DialogDescription>
          </DialogHeader>
          {brandDraft && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Brand Name</Label>
                <Input
                  value={brandDraft.name}
                  onChange={(e) => setBrandDraft({ ...brandDraft, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Country of Origin</Label>
                <Input
                  value={brandDraft.country}
                  onChange={(e) => setBrandDraft({ ...brandDraft, country: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandDraft(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (brandDraft) saveBrand(brandDraft);
                setBrandDraft(null);
              }}
            >
              Save Brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-secondary" />
              Order Details Management
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Order ID: {selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-5 pt-2 text-xs sm:text-sm">
              {/* Top Summary Card */}
              <div className="grid gap-3 sm:grid-cols-2 rounded-xl bg-surface p-4 border border-border">
                <div>
                  <span className="text-xs text-muted-foreground">Current Status:</span>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs font-semibold ${dbStatusBadge(selectedOrder.status)}`}>
                      {selectedOrder.status.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Payment Method:</span>
                  <p className="font-semibold text-foreground mt-1">{selectedOrder.payment_method}</p>
                </div>
              </div>

              {/* Status Update Control */}
              <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 space-y-2">
                <Label className="font-semibold text-xs">Update Order Fulfillment Status:</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(v) => void handleUpdateStatus(selectedOrder.id, v)}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dbOrderStatuses.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {s.replace(/_/g, " ").toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Customer & Shipping Details */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-1.5 text-xs text-foreground">
                  <MapPin className="size-4 text-secondary" /> Customer & Shipping Destination
                </h3>
                <div className="rounded-xl border border-border bg-surface/50 p-3.5 space-y-1 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground text-sm">{selectedOrder.shipping_name}</p>
                  <p>Email: <span className="text-foreground">{selectedOrder.shipping_email}</span></p>
                  <p>Phone: <span className="text-foreground">{selectedOrder.shipping_phone}</span></p>
                  <p>Address: <span className="text-foreground">{selectedOrder.shipping_address}</span></p>
                  <p>Location: <span className="text-foreground">{selectedOrder.shipping_city}, {selectedOrder.shipping_province} {selectedOrder.shipping_postal_code}</span></p>
                </div>
              </div>

              {/* Purchased Items Table */}
              <div className="space-y-2">
                <h3 className="font-semibold text-xs text-foreground">
                  Purchased Items ({selectedOrder.order_items?.length})
                </h3>
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

              {/* Payment Proof Button */}
              {selectedOrder.payment_proof_path ? (
                <div className="border-t border-border pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 rounded-xl text-xs"
                    disabled={proofLoading}
                    onClick={() => void handleAdminViewProof(selectedOrder)}
                  >
                    <FileCheck2 className="size-4 text-secondary" /> Inspect Customer Payment Proof
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                  No payment proof uploaded (COD or automated).
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Payment Proof Lightbox Modal */}
      <Dialog open={!!proofModalUrl} onOpenChange={(o) => !o && setProofModalUrl(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <FileCheck2 className="size-5 text-secondary" />
              Customer Payment Proof
            </DialogTitle>
            <DialogDescription>
              Private Supabase Storage Object Inspection
            </DialogDescription>
          </DialogHeader>

          {proofModalUrl && (
            <div className="mt-2 space-y-4">
              <div className="overflow-hidden rounded-xl border border-border bg-surface p-2 shadow-inner">
                <img
                  src={proofModalUrl}
                  alt="Customer payment proof"
                  className="mx-auto max-h-96 rounded-lg object-contain"
                />
              </div>
              <Button asChild variant="outline" size="sm" className="gap-2 rounded-xl text-xs">
                <a href={proofModalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" /> Open Full-Size Image
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="surface-card gradient-panel p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}
