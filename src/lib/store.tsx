import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import {
  seedOrders,
  seedProducts,
  type Order,
  type OrderStatus,
  type Product,
  type Brand,
  type Category,
  brands as seedBrands,
  categories as seedCategories,
} from "./catalog";

export type CartItem = { product: Product; qty: number };

type StoreValue = {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  orders: Order[];
  cart: CartItem[];
  compare: Product[];
  cartOpen: boolean;
  aiOpen: boolean;
  setCartOpen: (v: boolean) => void;
  setAiOpen: (v: boolean) => void;
  addToCart: (product: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  toggleCompare: (product: Product) => void;
  clearCompare: () => void;
  cartCount: number;
  cartSubtotal: number;
  discount: number;
  discountCode: string;
  applyDiscount: (code: string) => void;
  placeOrder: (customer: string, email: string, payment: string) => string;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  saveProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  saveCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  saveBrand: (b: Brand) => void;
  deleteBrand: (id: string) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [categories, setCategories] = useState<Category[]>(seedCategories);
  const [brands, setBrands] = useState<Brand[]>(seedBrands);
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [compare, setCompare] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState("");

  // Load user-specific cart from Supabase
  const loadCartFromSupabase = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select("product_id, quantity")
        .eq("user_id", userId);

      if (error) {
        console.error("Error loading cart items from Supabase:", error);
        return;
      }

      if (data) {
        const loaded: CartItem[] = [];
        for (const row of data) {
          const product = seedProducts.find((p) => p.id === row.product_id);
          if (product && row.quantity > 0) {
            loaded.push({
              product,
              qty: Math.min(row.quantity, product.stock || row.quantity),
            });
          } else if (!product) {
            console.warn(`Unmatched product_id "${row.product_id}" in cart_items.`);
          }
        }
        setCart(loaded);
      }
    } catch (err) {
      console.error("Failed to load user cart:", err);
    }
  }, []);

  // When user session changes (Login / Logout / Switch account)
  useEffect(() => {
    if (!user) {
      // Guest or logged out: immediately clear in-memory cart
      setCart([]);
    } else {
      // Active user: clear first, then fetch isolated cart
      setCart([]);
      void loadCartFromSupabase(user.id);
    }
  }, [user?.id, loadCartFromSupabase]);

  const addToCart = useCallback(
    (product: Product, qty = 1) => {
      if (!user) {
        toast.error("Sign In Required", {
          description: "Please sign in to add laptops to your cart.",
        });
        return;
      }

      if (product.stock <= 0) {
        toast.error("Out of stock", { description: `${product.name} is currently unavailable.` });
        return;
      }

      let nextQty = qty;
      setCart((prev) => {
        const found = prev.find((i) => i.product.id === product.id);
        if (found) {
          nextQty = Math.min(found.qty + qty, product.stock);
          return prev.map((i) =>
            i.product.id === product.id
              ? { ...i, qty: nextQty }
              : i,
          );
        }
        nextQty = Math.min(qty, product.stock);
        return [...prev, { product, qty: nextQty }];
      });
      toast.success("Added to cart", { description: product.name });

      // Persist to Supabase
      supabase
        .from("cart_items")
        .upsert(
          {
            user_id: user.id,
            product_id: product.id,
            quantity: nextQty,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,product_id" },
        )
        .then(({ error }) => {
          if (error) {
            console.error("Failed to persist cart item:", error);
            void loadCartFromSupabase(user.id);
          }
        });
    },
    [user, loadCartFromSupabase],
  );

  const setQty = useCallback(
    (id: string, qty: number) => {
      if (!user) return;
      const targetProduct = seedProducts.find((p) => p.id === id);
      const stockLimit = targetProduct?.stock ?? 999;
      const validQty = Math.max(0, Math.min(qty, stockLimit));

      if (validQty <= 0) {
        setCart((prev) => prev.filter((i) => i.product.id !== id));
        supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", id)
          .then(({ error }) => {
            if (error) console.error("Error deleting cart item:", error);
          });
      } else {
        setCart((prev) =>
          prev.map((i) => (i.product.id === id ? { ...i, qty: validQty } : i)),
        );
        supabase
          .from("cart_items")
          .update({ quantity: validQty, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("product_id", id)
          .then(({ error }) => {
            if (error) console.error("Error updating cart quantity:", error);
          });
      }
    },
    [user],
  );

  const removeFromCart = useCallback(
    (id: string) => {
      if (!user) return;
      setCart((prev) => prev.filter((i) => i.product.id !== id));
      toast("Item removed from cart");
      supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", id)
        .then(({ error }) => {
          if (error) console.error("Error removing cart item:", error);
        });
    },
    [user],
  );

  const clearCart = useCallback(() => {
    if (!user) return;
    setCart([]);
    supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
      .then(({ error }) => {
        if (error) console.error("Error clearing cart:", error);
      });
  }, [user]);

  const toggleCompare = useCallback((product: Product) => {
    setCompare((prev) => {
      if (prev.some((p) => p.id === product.id)) {
        toast("Removed from comparison", { description: product.name });
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= 3) {
        toast.error("Comparison Limit Reached", {
          description: "You can compare up to 3 products at a time.",
        });
        return prev;
      }
      toast.success("Added to comparison", { description: product.name });
      return [...prev, product];
    });
  }, []);

  const clearCompare = useCallback(() => setCompare([]), []);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.qty * i.product.price, 0);
  const isDiscountValid = (code: string) =>
    ["LAPTOPAI10", "TECHAI10"].includes(code.toUpperCase().trim());
  const discount = isDiscountValid(discountCode) ? Math.round(cartSubtotal * 0.1) : 0;

  const applyDiscount = useCallback((code: string) => {
    const clean = code.toUpperCase().trim();
    if (["LAPTOPAI10", "TECHAI10"].includes(clean)) {
      setDiscountCode(clean);
      toast.success("Discount applied", { description: "10% off with LAPTOPAI10" });
    } else {
      setDiscountCode("");
      toast.error("Invalid discount code", { description: "Try LAPTOPAI10" });
    }
  }, []);

  const placeOrder = useCallback(
    (customer: string, email: string, payment: string) => {
      const id = "LAP-" + Math.floor(10250 + Math.random() * 700);
      const total = cartSubtotal - discount;
      const order: Order = {
        id,
        customer: customer || "Guest Customer",
        email: email || (user?.email ?? "guest@laptopai.store"),
        date: new Date().toISOString().slice(0, 10),
        total,
        status: "Pending",
        payment,
        items: cart.map((i) => ({ name: i.product.name, qty: i.qty, price: i.product.price })),
      };
      setOrders((prev) => [order, ...prev]);
      setCart([]);
      setDiscountCode("");
      toast.success("Order Placed", { description: `${id} · ${payment}` });

      if (user) {
        supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id)
          .then(({ error }) => {
            if (error) console.error("Error clearing cart items after order:", error);
          });
      }

      return id;
    },
    [cart, cartSubtotal, discount, user],
  );

  const updateOrderStatus = useCallback((id: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success("Order updated", { description: `${id} → ${status}` });
  }, []);

  const saveProduct = useCallback((product: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) return prev.map((p) => (p.id === product.id ? product : p));
      return [product, ...prev];
    });
    toast.success("Product saved", { description: product.name });
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast("Product deleted");
  }, []);

  const saveCategory = useCallback((c: Category) => {
    setCategories((prev) =>
      prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c],
    );
    toast.success("Category saved", { description: c.name });
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast("Category deleted");
  }, []);

  const saveBrand = useCallback((b: Brand) => {
    setBrands((prev) =>
      prev.some((x) => x.id === b.id) ? prev.map((x) => (x.id === b.id ? b : x)) : [...prev, b],
    );
    toast.success("Brand saved", { description: b.name });
  }, []);

  const deleteBrand = useCallback((id: string) => {
    setBrands((prev) => prev.filter((b) => b.id !== id));
    toast("Brand deleted");
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      products,
      categories,
      brands,
      orders,
      cart,
      compare,
      cartOpen,
      aiOpen,
      setCartOpen,
      setAiOpen,
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
      toggleCompare,
      clearCompare,
      cartCount,
      cartSubtotal,
      discount,
      discountCode,
      applyDiscount,
      placeOrder,
      updateOrderStatus,
      saveProduct,
      deleteProduct,
      saveCategory,
      deleteCategory,
      saveBrand,
      deleteBrand,
    }),
    [
      products,
      categories,
      brands,
      orders,
      cart,
      compare,
      cartOpen,
      aiOpen,
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
      toggleCompare,
      clearCompare,
      cartCount,
      cartSubtotal,
      discount,
      discountCode,
      applyDiscount,
      placeOrder,
      updateOrderStatus,
      saveProduct,
      deleteProduct,
      saveCategory,
      deleteCategory,
      saveBrand,
      deleteBrand,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
