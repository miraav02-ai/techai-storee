import { createServerFn } from "@tanstack/react-start";
import type { ServerAgentRequest, ServerAgentResponse, SearchCatalogArgs } from "./types";
import { runGeminiAgent } from "./gemini";
import {
  searchCatalog,
  getProductDetail,
  compareProducts,
  getUserCart,
  addProductToCart,
} from "./tools";
import { resolveContextIntent } from "./context-resolver";
import { formatIDR, type Product, seedProducts } from "../catalog";

/**
 * Deterministic local fallback engine used when Gemini API key is missing or API is unreachable
 */
async function runFallbackAgent(req: ServerAgentRequest): Promise<ServerAgentResponse> {
  const q = req.message.toLowerCase();
  const executedTools: string[] = [];

  const prevRecs = req.context.previousRecommendations || [];

  // Check deterministic context intent
  const resolved = resolveContextIntent(req.message, req.context.activeProductId, prevRecs, req.history);

  // 0. MISSING PRIOR CONTEXT / ORDINAL REFERENCE (Strict Account Isolation Guard)
  if (resolved.type === "missing_reference") {
    return {
      text: "Di percakapan ini belum ada rekomendasi laptop sebelumnya yang dapat dirujuk. Silakan beri tahu kriteria atau kebutuhan laptop yang Anda cari (misalnya: budget, kegunaan untuk coding/gaming/kuliah, atau brand favorit), saya akan carikan rekomendasi terbaik dari 70 laptop terverifikasi.",
      products: [],
      executedTools: [],
      recommendations: [],
      intentType: "none",
      mode: "fallback",
    };
  }

  // 1. AMBIGUOUS REFERENCE (Priority 1: Do not guess when multiple candidates exist without ordinal)
  if (resolved.type === "ambiguous_reference") {
    const list = resolved.candidates
      .map((c, i) => `${i + 1}. **${c.name}** (${formatIDR(c.price)})`)
      .join("\n");
    const fullProducts = resolved.candidates
      .map((item) => getProductDetail({ product_id: item.product_id }))
      .filter((res) => "id" in res) as Product[];

    return {
      text: `Yang kamu maksud laptop nomor berapa, 1, 2, atau 3? Berikut daftar rekomendasi tadi:\n\n${list}\n\nBeri tahu saya nomor laptop yang ingin Anda cek (contoh: *"Laptop nomor 2 cocok buat coding?"*), saya akan analisis spesifikasinya satu per satu.`,
      products: fullProducts,
      executedTools: [],
      recommendations: prevRecs,
      intentType: "ambiguous",
      mode: "fallback",
    };
  }

  // 2. ACTIVE PRODUCT OR SPECIFIC DISPLAYED RECOMMENDATION CONTEXT (Priority 2)
  if (resolved.type === "active_product") {
    executedTools.push(`get_product_detail({ product_id: "${resolved.productId}" })`);
    const detail = getProductDetail({ product_id: resolved.productId });

    if ("id" in detail) {
      const p = detail as Product;
      const isCodingQuery = /code|coding|program|developer|python|react|docker|vs code|skripsi|it\b/.test(q);
      const isGamingQuery = /game|gaming|esport|valorant|genshin|aaa/.test(q);
      const isDesignQuery = /desain|design|editing|video|render|photoshop|premiere|creator/.test(q);
      const isStudentQuery = /kuliah|student|kampus|office|kantor|tugas/.test(q);

      let evaluation = `Laptop **${p.name}** memiliki spesifikasi processor **${p.specs.processor}**, RAM **${p.specs.ram}**, storage **${p.specs.storage}**, dan GPU **${p.specs.gpu}** (${p.specs.screenSize} ${p.specs.resolution}).`;

      const isBatteryQuery = /baterai|batre|battery|daya tahan/.test(q);
      const isWeightQuery = /berat|bobot|weight|ringan/.test(q);
      const isScreenQuery = /layar|screen|display|resolusi|refresh rate|inch/.test(q);
      const isWarrantyQuery = /garansi|warranty/.test(q);

      if (isBatteryQuery) {
        evaluation = `Laptop **${p.name}** dibekali kapasitas baterai **${p.specs.battery}**, yang memberikan daya tahan andal untuk mobilitas dan produktivitas harian.`;
      } else if (isWeightQuery) {
        evaluation = p.specs.weight
          ? `Laptop **${p.name}** memiliki bobot sekitar **${p.specs.weight}**, menjadikannya nyaman dan praktis untuk dibawa bepergian.`
          : `Informasi bobot untuk laptop **${p.name}** belum tercantum di katalog resmi kami.`;
      } else if (isScreenQuery) {
        evaluation = `Laptop **${p.name}** menggunakan layar berukuran **${p.specs.screenSize}** dengan resolusi **${p.specs.resolution}** dan refresh rate **${p.specs.refreshRate}**.`;
      } else if (isWarrantyQuery) {
        evaluation = `Laptop **${p.name}** dilindungi dengan garansi resmi **${p.warranty}**.`;
      } else if (isCodingQuery) {
        evaluation = `Ya, **${p.name}** sangat cocok untuk kebutuhan coding & programming. Laptop ini dibekali processor **${p.specs.processor}**, RAM **${p.specs.ram}**, dan storage cepat **${p.specs.storage}** sehingga sangat mumpuni untuk menjalankan IDE (VS Code), web development, backend/database, compiler, serta multitasking beberapa aplikasi development secara bersamaan.`;
      } else if (isGamingQuery) {
        const hasGpu = /rtx|gtx|radeon 6|radeon 7/i.test(p.specs.gpu);
        if (hasGpu) {
          evaluation = `Ya, **${p.name}** sangat baik untuk kebutuhan gaming berkat kartu grafis **${p.specs.gpu}** dan layar responsif (${p.specs.refreshRate}). Laptop ini siap menjalankan game kompetitif (Valorant, CS2, Dota 2) dengan framerate tinggi maupun game AAA modern.`;
        } else {
          evaluation = `Untuk kebutuhan gaming casual / ringan (Dota 2, Valorant 1080p, CS2 low setting), grafis **${p.specs.gpu}** pada **${p.name}** sudah memadai. Namun jika Anda berniat memainkan game AAA berat secara intensif, disarankan memilih varian dengan dedicated GPU (NVIDIA RTX).`;
        }
      } else if (isDesignQuery) {
        evaluation = `Ya, **${p.name}** memadai untuk kebutuhan desain grafis dan content creation ringan hingga menengah berkat layar **${p.specs.screenSize} ${p.specs.resolution}**, RAM **${p.specs.ram}**, dan processor **${p.specs.processor}**.`;
      } else if (isStudentQuery) {
        evaluation = `Ya, **${p.name}** sangat ideal untuk kebutuhan kuliah dan produktivitas harian dengan bobot ringkas (${p.specs.weight}), baterai ${p.specs.battery}, dan garansi resmi ${p.warranty}.`;
      } else {
        evaluation += `\n\nLaptop ini dirancang optimal untuk kategori **${p.category}** dengan performa andal dan garansi ${p.warranty}.`;
      }

      return {
        text: evaluation,
        products: [p],
        executedTools,
        recommendations: prevRecs,
        intentType: "detail",
        mode: "fallback",
      };
    }
  }

  // 3. ORDINAL ADD TO CART (Priority 3)
  if (resolved.type === "add_to_cart_ordinal") {
    executedTools.push(`add_product_to_cart({ product_id: "${resolved.productId}", quantity: ${resolved.quantity} })`);
    const addRes = await addProductToCart(
      { product_id: resolved.productId, quantity: resolved.quantity },
      req.accessToken,
    );

    if ("success" in addRes && addRes.success && addRes.product) {
      return {
        text: `Berhasil memasukkan **${addRes.product.name}** (${formatIDR(addRes.product.price)}) ke keranjang belanja Anda. Apakah Anda ingin langsung ke halaman checkout atau melihat keranjang?`,
        products: [addRes.product],
        executedTools,
        action: { type: "add_to_cart", product: addRes.product, quantity: resolved.quantity },
        recommendations: prevRecs,
        intentType: "cart",
        mode: "fallback",
      };
    }
  }

  // 4. ORDINAL COMPARE (Priority 3)
  if (resolved.type === "compare_ordinals") {
    executedTools.push(`compare_products({ product_ids: ${JSON.stringify(resolved.productIds)} })`);
    const compRes = compareProducts({ product_ids: resolved.productIds });

    if ("products" in compRes && compRes.products.length >= 2) {
      const p1 = compRes.products[0];
      const p2 = compRes.products[1];
      if (p1 && p2) {
        const text = `Berikut perbandingan spesifikasi antara **${p1.name}** dan **${p2.name}**:\n\n` +
          `- **Harga:** ${formatIDR(p1.price)} vs ${formatIDR(p2.price)}\n` +
          `- **Processor:** ${p1.processor} vs ${p2.processor}\n` +
          `- **RAM:** ${p1.ram} vs ${p2.ram}\n` +
          `- **Storage:** ${p1.storage} vs ${p2.storage}\n` +
          `- **GPU:** ${p1.gpu} vs ${p2.gpu}\n` +
          `- **Layar:** ${p1.screen} vs ${p2.screen}\n` +
          `- **Bobot:** ${p1.weight} vs ${p2.weight}`;

        const fullProducts = resolved.productIds
          .map((id) => getProductDetail({ product_id: id }))
          .filter((res) => "id" in res) as Product[];

        return {
          text,
          products: fullProducts,
          executedTools,
          action: { type: "compare", productIds: resolved.productIds },
          recommendations: prevRecs,
          intentType: "comparison",
          mode: "fallback",
        };
      }
    }
  }

  // 5. PREVIOUS RECOMMENDATION EVALUATION / RANKING ("Dari yang tadi, mana yang paling worth it?", "Dari ketiganya mana yang paling cocok buat coding?")
  if (resolved.type === "evaluate_previous") {
    const fullProducts = resolved.products
      .map((item) => getProductDetail({ product_id: item.product_id }))
      .filter((res) => "id" in res) as Product[];

    if (fullProducts.length > 0) {
      const isCoding = /code|coding|program/.test(q);
      const isGaming = /game|gaming/.test(q);

      // Sort by best fit
      const ranked = [...fullProducts].sort((a, b) => {
        if (isGaming) {
          const aGpu = /rtx/i.test(a.specs.gpu) ? 1 : 0;
          const bGpu = /rtx/i.test(b.specs.gpu) ? 1 : 0;
          if (aGpu !== bGpu) return bGpu - aGpu;
        }
        return b.rating * 100 + b.sold / 100 - (a.rating * 100 + a.sold / 100);
      });
      const topPick = ranked[0];

      if (topPick) {
        const candidateLines = ranked
          .map(
            (p, idx) =>
              `${idx + 1}. **${p.name}** (${formatIDR(p.price)}) — ${p.specs.processor} · ${p.specs.ram} · ${p.specs.gpu}`,
          )
          .join("\n");

        const text = `Dari ${ranked.length} kandidat rekomendasi sebelumnya, berikut perbandingan dan urutan terbaik untuk kebutuhan Anda:\n\n${candidateLines}\n\n🏆 **Rekomendasi Utama:** **${topPick.name}** adalah opsi paling seimbang dan optimal.`;

        return {
          text,
          products: ranked,
          executedTools: [],
          recommendations: prevRecs,
          intentType: "evaluation",
          mode: "fallback",
        };
      }
    }
  }

  // 6. Navigation router (Orders, Cart, Checkout, Shop, Compare, Home, Product Detail)
  // A. Specific Product Detail page navigation (e.g. "buka produk asus-01", "buka halaman lenovo-02", "ke produk apple-01")
  const productNavMatch =
    q.match(/(?:buka|lihat|ke|pergi ke|tampilkan)\s+(?:halaman\s+)?(?:produk|laptop)\s+([a-z0-9_-]+)/i) ||
    q.match(/(?:buka|ke|pergi ke)\s+([a-z0-9_-]+)/i);
  if (productNavMatch && productNavMatch[1]) {
    const rawPid = productNavMatch[1].trim().toLowerCase();
    const foundProd = seedProducts.find((p) => p.id.toLowerCase() === rawPid);
    if (foundProd) {
      executedTools.push(`navigate_to_page({ route: '/product/${foundProd.id}' })`);
      return {
        text: `Mengarahkan Anda ke halaman detail produk **${foundProd.name}** (/product/${foundProd.id})...`,
        products: [foundProd],
        executedTools,
        action: { type: "navigate", route: `/product/${foundProd.id}` },
        recommendations: prevRecs,
        intentType: "followup",
        mode: "fallback",
      };
    }
  }

  // B. Orders navigation (e.g. "arahkan saya ke halaman order", "buka halaman pesanan saya", "lihat pesanan saya", "riwayat pesanan", "buka order")
  const isOrdersNav =
    /(?:halaman\s+)?(?:order|pesanan(?:ku)?|riwayat\s+pesanan|status\s+pesanan|daftar\s+pesanan)|(?:buka|ke|pergi ke|arahkan\s+(?:saya\s+)?ke|lihat)\s+(?:halaman\s+)?(?:order|pesanan|riwayat pesanan)/i.test(
      q,
    );
  if (isOrdersNav) {
    executedTools.push("navigate_to_page({ route: '/orders' })");
    return {
      text: "Mengarahkan Anda ke halaman Riwayat Pesanan (/orders) untuk melihat daftar dan status pesanan Anda.",
      executedTools,
      action: { type: "navigate", route: "/orders" },
      recommendations: prevRecs,
      intentType: "followup",
      mode: "fallback",
    };
  }

  // C. Cart navigation (e.g. "buka cart", "ke cart", "buka keranjang", "ke keranjang", "halaman keranjang", "lihat keranjang")
  const isCartNav =
    /(?:buka|ke|pergi ke|arahkan\s+(?:saya\s+)?ke)\s+(?:halaman\s+)?(?:cart|keranjang)|(?:halaman\s+)(?:cart|keranjang)/i.test(
      q,
    );
  if (isCartNav) {
    executedTools.push("navigate_to_page({ route: '/cart' })");
    return {
      text: "Mengarahkan Anda ke halaman Keranjang Belanja (/cart)...",
      executedTools,
      action: { type: "navigate", route: "/cart" },
      recommendations: prevRecs,
      intentType: "followup",
      mode: "fallback",
    };
  }

  // D. Checkout navigation
  const isCheckout = /checkout|bayar|pesan sekarang|beli sekarang/.test(q);
  if (isCheckout) {
    executedTools.push("navigate_to_page({ route: '/checkout' })");
    return {
      text: "Untuk menyelesaikan pembelian, silakan lanjutkan proses checkout melalui tautan berikut. Mohon periksa alamat pengiriman dan pilih metode pembayaran secara manual.",
      executedTools,
      action: { type: "navigate", route: "/checkout" },
      recommendations: prevRecs,
      intentType: "followup",
      mode: "fallback",
    };
  }

  // E. Shop / Catalog navigation (e.g. "buka katalog", "ke katalog", "buka shop", "ke toko", "lihat semua laptop", "buka halaman toko")
  const isShopNav =
    /(?:buka|ke|pergi ke|arahkan\s+(?:saya\s+)?ke|lihat)\s+(?:halaman\s+)?(?:katalog(?: laptop)?|shop|toko|semua laptop|semua produk)|(?:halaman\s+)(?:katalog|shop|toko)/i.test(
      q,
    );
  if (isShopNav) {
    executedTools.push("navigate_to_page({ route: '/shop' })");
    return {
      text: "Mengarahkan Anda ke halaman Katalog Laptop (/shop) untuk menjelajahi seluruh 70 laptop terverifikasi kami.",
      executedTools,
      action: { type: "navigate", route: "/shop" },
      recommendations: prevRecs,
      intentType: "followup",
      mode: "fallback",
    };
  }

  // F. Compare navigation (e.g. "buka compare", "ke compare", "buka halaman perbandingan", "ke halaman perbandingan", "menu komparasi")
  const isCompareNav =
    /(?:buka|ke|pergi ke|arahkan\s+(?:saya\s+)?ke)\s+(?:halaman\s+)?(?:compare|perbandingan|komparasi)|(?:halaman|menu)\s+(?:compare|perbandingan|komparasi)/i.test(
      q,
    );
  if (isCompareNav) {
    executedTools.push("navigate_to_page({ route: '/compare' })");
    return {
      text: "Mengarahkan Anda ke halaman Komparasi Laptop (/compare)...",
      executedTools,
      action: { type: "navigate", route: "/compare" },
      recommendations: prevRecs,
      intentType: "followup",
      mode: "fallback",
    };
  }

  // G. Home / Beranda navigation (e.g. "buka halaman utama", "ke halaman utama", "buka beranda", "ke beranda", "buka home", "ke home")
  const isHomeNav =
    /(?:buka|ke|pergi ke|arahkan\s+(?:saya\s+)?ke|kembali ke)\s+(?:halaman\s+)?(?:utama|beranda|home|awal)|(?:halaman\s+)(?:utama|beranda|home|awal)/i.test(
      q,
    );
  if (isHomeNav) {
    executedTools.push("navigate_to_page({ route: '/' })");
    return {
      text: "Mengarahkan Anda ke Halaman Utama (Beranda)...",
      executedTools,
      action: { type: "navigate", route: "/" },
      recommendations: prevRecs,
      intentType: "followup",
      mode: "fallback",
    };
  }

  // 7. User cart query
  if (/isi cart|keranjang(?:ku)?|apa isi cart/.test(q)) {
    executedTools.push("get_user_cart()");
    const cartRes = await getUserCart(req.accessToken);
    if ("items" in cartRes) {
      if (cartRes.items.length === 0) {
        return {
          text: "Keranjang belanja Anda saat ini masih kosong. Silakan cari laptop impian Anda di katalog kami!",
          executedTools,
          recommendations: prevRecs,
          intentType: "cart",
          mode: "fallback",
        };
      }
      const itemLines = cartRes.items
        .map((it: any) => `- ${it.quantity}x ${it.name} (${formatIDR(it.subtotal)})`)
        .join("\n");
      return {
        text: `Isi keranjang belanja Anda saat ini (${cartRes.total_items} item, Total: ${formatIDR(cartRes.subtotal || 0)}):\n\n${itemLines}`,
        executedTools,
        recommendations: prevRecs,
        intentType: "cart",
        mode: "fallback",
      };
    }
  }

  // 8. Parameter extraction for search_catalog (Initial search or explicit alternative request)
  let maxPrice: number | undefined;
  const budgetMatch = q.match(
    /(?:rp\s?|budget\s?|dibawah\s?|max\s?)?([\d.,]+)\s?(m|jt|juta|jutaan)?/,
  );
  if (budgetMatch && budgetMatch[1]) {
    const raw = Number(budgetMatch[1].replace(/[.,]/g, ""));
    if (!isNaN(raw) && raw > 0) {
      if (budgetMatch[2] || (raw >= 4 && raw <= 90)) {
        maxPrice = raw * 1_000_000;
      } else if (raw >= 1_000_000) {
        maxPrice = raw;
      }
    }
  }

  let minRam: number | undefined;
  const ramMatch = q.match(/(\d{1,2})\s?gb/);
  if (ramMatch) {
    minRam = Number(ramMatch[1]);
  }

  let brand: string | undefined;
  if (/asus|rog|tuf|zenbook|vivobook/.test(q)) brand = "ASUS";
  else if (/lenovo|thinkpad|legion|ideapad|yoga|loq/.test(q)) brand = "Lenovo";
  else if (/acer|predator|nitro|swift|aspire/.test(q)) brand = "Acer";
  else if (/hp\b|victus|omen|spectre|envy|elitebook/.test(q)) brand = "HP";
  else if (/dell|alienware|xps|latitude|inspiron/.test(q)) brand = "Dell";
  else if (/msi|stealth|katana|cyborg|thin|prestige|modern/.test(q)) brand = "MSI";
  else if (/apple|macbook|mac\b|m2|m3|m4/.test(q)) brand = "Apple";

  let gpu: string | undefined;
  if (/rtx\s?4090/.test(q)) gpu = "RTX 4090";
  else if (/rtx\s?4080/.test(q)) gpu = "RTX 4080";
  else if (/rtx\s?4070/.test(q)) gpu = "RTX 4070";
  else if (/rtx\s?4060/.test(q)) gpu = "RTX 4060";
  else if (/rtx\s?4050/.test(q)) gpu = "RTX 4050";
  else if (/rtx\s?3050/.test(q)) gpu = "RTX 3050";
  else if (/rtx\s?2050/.test(q)) gpu = "RTX 2050";

  let category: string | undefined;
  if (/code|coding|program|developer|python|react/.test(q)) category = "Coding & Programming";
  else if (/game|gaming|esport|valorant/.test(q)) category = "Gaming Laptop";
  else if (/desain|design|grafis|creator|render/.test(q)) category = "Creator & Design";
  else if (/bisnis|business|kantor|office|kerja/.test(q)) category = "Business Laptop";
  else if (/kuliah|student|sekolah|skripsi|tugas|mahasiswa/.test(q)) category = "Student Laptop";

  const searchArgs: SearchCatalogArgs = {
    brand,
    max_price: maxPrice,
    min_ram: minRam,
    gpu,
    category,
  };

  executedTools.push(`search_catalog(${JSON.stringify(searchArgs)})`);
  const products = searchCatalog(searchArgs);

  if (products.length === 0) {
    return {
      text: "Maaf, tidak ada laptop di katalog kami yang memenuhi seluruh kriteria spesifikasi dan budget tersebut secara bersamaan. Sebagai AI shopping agent yang grounded pada 70 laptop terverifikasi, kami sarankan untuk menyesuaikan budget atau kriteria RAM/GPU.",
      executedTools,
      recommendations: prevRecs,
      intentType: "new_search",
      mode: "fallback",
    };
  }

  const newRecs = products.map((p) => ({
    product_id: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
  }));

  const criteriaText = [
    brand && `Brand: ${brand}`,
    category && `Kategori: ${category}`,
    maxPrice && `Budget ≤ ${formatIDR(maxPrice)}`,
    minRam && `RAM ≥ ${minRam}GB`,
    gpu && `GPU: ${gpu}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const prodLines = products
    .map(
      (p, idx) =>
        `${idx + 1}. **${p.name}** (${formatIDR(p.price)})\n   - CPU: ${p.specs.processor} | RAM: ${p.specs.ram} | Storage: ${p.specs.storage} | GPU: ${p.specs.gpu}`,
    )
    .join("\n\n");

  return {
    text: `Berdasarkan analisis katalog 70 laptop terverifikasi ${criteriaText ? `[${criteriaText}]` : ""}, berikut ${products.length} rekomendasi laptop terbaik yang paling sesuai dengan kebutuhan Anda:\n\n${prodLines}\n\nAnda dapat menanyakan kecocokan spesifikasi (contoh: *"Laptop nomor 2 cocok buat coding?"*), membandingkan (*"Bandingkan nomor 1 dan 2"*), atau langsung memasukkan ke keranjang (*"Yang nomor 2 masukin ke cart"*).`,
    products,
    executedTools,
    recommendations: newRecs,
    intentType: "new_search",
    mode: "fallback",
  };
}

/**
 * Server Function entrypoint for AI Chat
 */
export const agentChatFn = createServerFn({ method: "POST" })
  .validator((data: ServerAgentRequest) => data)
  .handler(async ({ data }): Promise<ServerAgentResponse> => {
    const prevRecs = data.context.previousRecommendations || [];
    const resolved = resolveContextIntent(data.message, data.context.activeProductId, prevRecs, data.history);

    // 1. MISSING PRIOR CONTEXT / ORDINAL REFERENCE INTERCEPT (Strict Account Isolation Guard)
    if (resolved.type === "missing_reference") {
      console.log("[AI Agent Server] Missing prior context / ordinal reference detected -> Returning guidance without search_catalog");
      return {
        text: "Di percakapan ini belum ada rekomendasi laptop sebelumnya yang dapat dirujuk. Silakan beri tahu kriteria atau kebutuhan laptop yang Anda cari (misalnya: budget, kegunaan untuk coding/gaming/kuliah, atau brand favorit), saya akan carikan rekomendasi terbaik dari 70 laptop terverifikasi.",
        products: [],
        executedTools: [],
        recommendations: [],
        intentType: "none",
        mode: "fallback",
      };
    }

    // 2. AMBIGUOUS REFERENCE INTERCEPT (Must NEVER guess or call search_catalog)
    if (resolved.type === "ambiguous_reference") {
      console.log("[AI Agent Server] Ambiguous reference detected -> Returning deterministic clarification");
      const list = resolved.candidates
        .map((c, i) => `${i + 1}. **${c.name}** (${formatIDR(c.price)})`)
        .join("\n");
      const fullProducts = resolved.candidates
        .map((item) => getProductDetail({ product_id: item.product_id }))
        .filter((res) => "id" in res) as Product[];

      return {
        text: `Yang kamu maksud laptop nomor berapa, 1, 2, atau 3? Berikut daftar rekomendasi tadi:\n\n${list}\n\nBeri tahu saya nomor laptop yang ingin Anda cek (contoh: *"Laptop nomor 2 cocok buat coding?"*), saya akan analisis spesifikasinya satu per satu.`,
        products: fullProducts,
        executedTools: [],
        recommendations: prevRecs,
        intentType: "ambiguous",
        mode: "fallback",
      };
    }

    // 2. ACTIVE PRODUCT / HISTORICAL REFERENCE INTERCEPT
    if (resolved.type === "active_product") {
      data.context.activeProductId = resolved.productId;
    }

    const geminiKey = process.env["GEMINI_API_KEY"] || "";

    if (geminiKey.trim()) {
      try {
        console.log(`[AI Agent Server] Invoking Gemini Agent for request: "${data.message.slice(0, 50)}..."`);
        const geminiRes = await runGeminiAgent(data, geminiKey.trim());
        return geminiRes;
      } catch (err: any) {
        console.warn("[AI Agent Server] Gemini call failed, falling back to local engine:", err.message);
        return runFallbackAgent(data);
      }
    }

    console.log("[AI Agent Server] No GEMINI_API_KEY found, running in deterministic local fallback mode");
    return runFallbackAgent(data);
  });
