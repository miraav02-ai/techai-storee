import { seedProducts, type Product } from "../catalog";
import { createClient } from "@supabase/supabase-js";
import type {
  SearchCatalogArgs,
  GetProductDetailArgs,
  CompareProductsArgs,
  CheckProductStockArgs,
  AddToCartArgs,
  NavigateToPageArgs,
} from "./types";

const SUPABASE_URL = "https://ijkocresoyohoyesueyw.supabase.co";
const SUPABASE_KEY = "sb_publishable_CJKqnkcOSf1R_4P163mNIA_uObU_55P";

/**
 * Creates an authenticated Supabase client using the user's access token
 */
export function getAuthSupabaseClient(accessToken?: string) {
  if (!accessToken) {
    return createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

/**
 * 1. search_catalog: Filter and search across 70 verified laptops (returns top 3 recommendations)
 */
export function searchCatalog(args: SearchCatalogArgs): Product[] {
  let pool = seedProducts.filter((p) => p.active);

  // Brand filter
  if (args.brand && args.brand.trim()) {
    const b = args.brand.trim().toLowerCase();
    pool = pool.filter((p) => p.brand.toLowerCase() === b);
  }

  // Category / Purpose filter
  if (args.category && args.category.trim()) {
    const c = args.category.trim().toLowerCase();
    pool = pool.filter(
      (p) =>
        p.category.toLowerCase().includes(c) ||
        p.specs.usage.toLowerCase().includes(c.slice(0, 4)),
    );
  }

  // Max price filter
  if (args.max_price && args.max_price > 0) {
    pool = pool.filter((p) => p.price <= args.max_price!);
  }

  // Min RAM filter
  if (args.min_ram && args.min_ram > 0) {
    pool = pool.filter((p) => {
      const ramVal = Number(p.specs.ram.match(/(\d{1,3})/)?.[1] ?? 0);
      return ramVal >= args.min_ram!;
    });
  }

  // GPU filter
  if (args.gpu && args.gpu.trim()) {
    const g = args.gpu.trim().toLowerCase();
    pool = pool.filter((p) =>
      p.specs.gpu.toLowerCase().includes(g),
    );
  }

  // Keyword query search (cleaned from stop words and numeric budget/ram words)
  if (args.query && args.query.trim()) {
    const stopWords = new Set([
      "laptop", "untuk", "yang", "dan", "dengan", "budget", "harga", "dibawah", "di",
      "bawah", "max", "maksimal", "min", "minimal", "juta", "jt", "ram", "gb", "rp",
      "mau", "cari", "carikan", "butuh", "rekomendasi", "rekomendasikan", "paling",
      "bagus", "terbaik", "cocok", "buat", "bisa", "tolong", "halo", "ada", "coding",
      "gaming", "desain", "kuliah", "kantor", "bisnis", "programming", "student"
    ]);

    const words = args.query
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ""))
      .filter((w) => w.length > 2 && !stopWords.has(w) && isNaN(Number(w)));

    if (words.length > 0) {
      pool = pool.filter((p) =>
        words.some(
          (w) =>
            p.name.toLowerCase().includes(w) ||
            p.brand.toLowerCase().includes(w) ||
            p.specs.processor.toLowerCase().includes(w) ||
            p.specs.gpu.toLowerCase().includes(w) ||
            p.specs.ram.toLowerCase().includes(w) ||
            p.description.toLowerCase().includes(w),
        ),
      );
    }
  }

  // Ranking: If max_price is provided, rank by best value / rating + popularity within budget
  const ranked = [...pool].sort((a, b) => {
    return b.rating * 100 + b.sold / 100 - (a.rating * 100 + a.sold / 100);
  });

  return ranked.slice(0, 3);
}

/**
 * 2. get_product_detail: Retrieve comprehensive specs of a specific product ID
 */
export function getProductDetail(args: GetProductDetailArgs): Product | { error: string } {
  if (!args.product_id) {
    return { error: "Product ID is required." };
  }
  const product = seedProducts.find(
    (p) => p.id.toLowerCase() === args.product_id.toLowerCase(),
  );
  if (!product) {
    return { error: `Laptop dengan ID '${args.product_id}' tidak ditemukan di katalog resmi 70 laptop.` };
  }
  return product;
}

/**
 * 3. compare_products: Side-by-side comparison of 2-3 products
 */
export function compareProducts(args: CompareProductsArgs) {
  if (!args.product_ids || !Array.isArray(args.product_ids) || args.product_ids.length === 0) {
    return { error: "Harap berikan setidaknya 2 product_id untuk dibandingkan." };
  }

  const foundProducts = args.product_ids
    .slice(0, 3)
    .map((id) => seedProducts.find((p) => p.id.toLowerCase() === id.toLowerCase()))
    .filter(Boolean) as Product[];

  if (foundProducts.length < 2) {
    return { error: "Minimal 2 produk valid yang ada di katalog diperlukan untuk perbandingan." };
  }

  return {
    products: foundProducts.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      rating: p.rating,
      stock: p.stock,
      processor: p.specs.processor,
      ram: p.specs.ram,
      storage: p.specs.storage,
      gpu: p.specs.gpu,
      screen: p.specs.screenSize + " " + p.specs.resolution + " (" + p.specs.refreshRate + ")",
      battery: p.specs.battery,
      weight: p.specs.weight,
      warranty: p.warranty,
    })),
  };
}

/**
 * 4. check_product_stock: Check stock level for a product
 */
export function checkProductStock(args: CheckProductStockArgs) {
  if (!args.product_id) {
    return { error: "Product ID is required." };
  }
  const product = seedProducts.find(
    (p) => p.id.toLowerCase() === args.product_id.toLowerCase(),
  );
  if (!product) {
    return { error: `Laptop dengan ID '${args.product_id}' tidak ditemukan.` };
  }
  return {
    product_id: product.id,
    product_name: product.name,
    in_stock: product.stock > 0,
    stock: product.stock,
    price: product.price,
  };
}

/**
 * 5. get_user_cart: Get current user's cart from Supabase using authenticated session
 */
export async function getUserCart(accessToken?: string) {
  if (!accessToken) {
    return { error: "User belum login. Harap login terlebih dahulu untuk mengakses keranjang." };
  }

  const supabase = getAuthSupabaseClient(accessToken);
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return { error: "Sesi login tidak valid atau telah kedaluwarsa." };
  }

  const userId = userData.user.id;
  const { data: cartItems, error: cartErr } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId);

  if (cartErr) {
    return { error: `Gagal mengambil keranjang: ${cartErr.message}` };
  }

  // Join with catalog products
  const populatedItems = (cartItems || [])
    .map((item) => {
      const p = seedProducts.find((prod) => prod.id === item.product_id);
      if (!p) return null;
      return {
        id: item.id,
        product_id: p.id,
        name: p.name,
        brand: p.brand,
        price: p.price,
        quantity: item.quantity,
        subtotal: p.price * item.quantity,
      };
    })
    .filter(Boolean);

  const totalItems = populatedItems.reduce((acc, it) => acc + (it?.quantity || 0), 0);
  const subtotal = populatedItems.reduce((acc, it) => acc + (it?.subtotal || 0), 0);

  return {
    items: populatedItems,
    total_items: totalItems,
    subtotal,
  };
}

/**
 * 6. add_product_to_cart: Add product to user's cart in Supabase
 */
export async function addProductToCart(args: AddToCartArgs, accessToken?: string) {
  if (!accessToken) {
    return { error: "User belum login. Harap login terlebih dahulu untuk menambahkan barang ke keranjang." };
  }

  if (!args.product_id) {
    return { error: "Product ID diperlukan untuk menambahkan ke keranjang." };
  }

  const product = seedProducts.find(
    (p) => p.id.toLowerCase() === args.product_id.toLowerCase(),
  );

  if (!product) {
    return { error: `Laptop dengan ID '${args.product_id}' tidak ditemukan di katalog resmi 70 laptop.` };
  }

  if (product.stock <= 0) {
    return { error: `Maaf, stok laptop '${product.name}' saat ini sedang habis.` };
  }

  const qty = Math.max(1, args.quantity || 1);

  const supabase = getAuthSupabaseClient(accessToken);
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return { error: "Sesi login tidak valid. Silakan login kembali." };
  }

  const userId = userData.user.id;

  // Check if item already exists in cart
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("product_id", product.id)
    .maybeSingle();

  if (existing) {
    const newQty = existing.quantity + qty;
    const { error: updateErr } = await supabase
      .from("cart_items")
      .update({ quantity: newQty })
      .eq("id", existing.id);

    if (updateErr) {
      return { error: `Gagal memperbarui kuantitas: ${updateErr.message}` };
    }
  } else {
    const { error: insertErr } = await supabase.from("cart_items").insert({
      user_id: userId,
      product_id: product.id,
      quantity: qty,
    });

    if (insertErr) {
      return { error: `Gagal menambahkan ke keranjang: ${insertErr.message}` };
    }
  }

  return {
    success: true,
    message: `${qty}x ${product.name} berhasil ditambahkan ke keranjang belanja Anda.`,
    product,
    quantity: qty,
  };
}

/**
 * 7. navigate_to_page: Validate and return safe allowed frontend route
 */
export function navigateToPage(args: NavigateToPageArgs) {
  if (!args.route) {
    return { error: "Route diperlukan untuk navigasi." };
  }

  const allowedRoutes = ["/shop", "/cart", "/checkout", "/orders", "/compare", "/"];
  const cleanRoute = args.route.trim();

  // Allow static routes or /product/[id]
  const isProductRoute = /^\/product\/[a-zA-Z0-9_-]+$/.test(cleanRoute);
  const isAllowedStatic = allowedRoutes.includes(cleanRoute);

  if (isAllowedStatic || isProductRoute) {
    return {
      success: true,
      route: cleanRoute,
      message: `Mengarahkan Anda ke halaman ${cleanRoute}...`,
    };
  }

  return {
    error: `Rute navigasi '${cleanRoute}' tidak diizinkan. Hanya rute internal toko yang diperbolehkan.`,
  };
}
