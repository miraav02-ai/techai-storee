import type {
  ServerAgentRequest,
  ServerAgentResponse,
  AgentAction,
  PreviousRecommendation,
  RecommendationIntent,
} from "./types";
import {
  searchCatalog,
  getProductDetail,
  compareProducts,
  checkProductStock,
  getUserCart,
  addProductToCart,
  navigateToPage,
} from "./tools";
import type { Product } from "../catalog";

const GEMINI_FUNCTION_DECLARATIONS = [
  {
    name: "search_catalog",
    description:
      "Mencari dan mem-filter katalog 70 laptop resmi TechAI Store berdasarkan kriteria budget, brand, RAM minimum, GPU, kategori, atau kata kunci. HANYA dipanggil jika user secara eksplisit meminta rekomendasi laptop baru atau meminta alternatif dari produk saat ini.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "Kata kunci pencarian bebas (misal: 'OLED', 'Ryzen 7', 'tipis', 'layar 14 inch').",
        },
        brand: {
          type: "STRING",
          description: "Nama brand: 'ASUS', 'Lenovo', 'Acer', 'HP', 'Dell', 'MSI', 'Apple'.",
        },
        max_price: {
          type: "NUMBER",
          description: "Batas budget / harga maksimum dalam Rupiah (misal: 15000000 untuk 15 juta).",
        },
        min_ram: {
          type: "NUMBER",
          description: "Kapasitas RAM minimum dalam GB (misal: 8, 16, 24, 32).",
        },
        gpu: {
          type: "STRING",
          description: "Nama atau seri GPU yang dicari (misal: 'RTX 4060', 'RTX 3050', 'Iris Xe').",
        },
        category: {
          type: "STRING",
          description: "Kategori laptop: 'Gaming Laptop', 'Coding & Programming', 'Creator & Design', 'Business Laptop', 'Student Laptop'.",
        },
      },
    },
  },
  {
    name: "get_product_detail",
    description:
      "Mengambil rincian spesifikasi hardware lengkap, deskripsi, garansi resmi, dan stok untuk satu laptop tertentu berdasarkan product_id.",
    parameters: {
      type: "OBJECT",
      properties: {
        product_id: {
          type: "STRING",
          description: "ID laptop di katalog (contoh: 'asus-01', 'lenovo-05', 'apple-02', 'msi-01').",
        },
      },
      required: ["product_id"],
    },
  },
  {
    name: "compare_products",
    description:
      "Membandingkan spesifikasi hardware, layar, baterai, berat, dan harga dari 2 hingga 3 laptop secara berdampingan.",
    parameters: {
      type: "OBJECT",
      properties: {
        product_ids: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Daftar 2 atau 3 ID produk yang ingin dibandingkan.",
        },
      },
      required: ["product_ids"],
    },
  },
  {
    name: "check_product_stock",
    description: "Memeriksa ketersediaan stok fisik untuk laptop tertentu di database toko.",
    parameters: {
      type: "OBJECT",
      properties: {
        product_id: {
          type: "STRING",
          description: "ID laptop yang ingin diperiksa stoknya.",
        },
      },
      required: ["product_id"],
    },
  },
  {
    name: "get_user_cart",
    description:
      "Mengambil daftar produk dan subtotal yang saat ini ada di keranjang belanja pengguna yang sedang login.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "add_product_to_cart",
    description:
      "Memasukkan laptop ke keranjang belanja pengguna di database. HANYA dipanggil jika user secara eksplisit meminta menambahkan barang ke keranjang.",
    parameters: {
      type: "OBJECT",
      properties: {
        product_id: {
          type: "STRING",
          description: "ID laptop yang akan dimasukkan ke keranjang.",
        },
        quantity: {
          type: "NUMBER",
          description: "Jumlah unit yang dibeli (default 1).",
        },
      },
      required: ["product_id"],
    },
  },
  {
    name: "navigate_to_page",
    description:
      "Mengarahkan tampilan pengguna ke halaman tertentu di website (misal: '/checkout', '/cart', '/shop', '/orders', '/compare', '/product/[id]').",
    parameters: {
      type: "OBJECT",
      properties: {
        route: {
          type: "STRING",
          description: "Rute halaman target di website toko (misal: '/checkout', '/cart', '/product/asus-01').",
        },
      },
      required: ["route"],
    },
  },
];

function buildSystemInstruction(req: ServerAgentRequest): string {
  const userGreeting = req.context.user
    ? `User saat ini: ${req.context.user.name} (Role: ${req.context.user.role || "customer"}).`
    : `User saat ini: Guest / Belum login.`;

  const prevRecs = req.context.previousRecommendations || [];
  const previousRecsText =
    prevRecs.length > 0
      ? `DAFTAR REKOMENDASI AKTIF DARI TURN SEBELUMNYA:
${prevRecs.map((p, idx) => `${idx + 1}. [Product ID: "${p.product_id}"] ${p.name} - ${p.brand} (Rp${p.price.toLocaleString("id-ID")})`).join("\n")}

ATURAN REFERENSI & ORDINAL (MUTLAK):
- 'nomor 1' / 'yang pertama' / 'laptop pertama' = Product ID '${prevRecs[0]?.product_id}' (${prevRecs[0]?.name})
- 'nomor 2' / 'yang kedua' / 'laptop kedua' = Product ID '${prevRecs[1]?.product_id}' (${prevRecs[1]?.name})
${prevRecs[2] ? `- 'nomor 3' / 'yang ketiga' / 'laptop ketiga' = Product ID '${prevRecs[2]?.product_id}' (${prevRecs[2]?.name})` : ""}
${prevRecs[3] ? `- 'nomor 4' / 'yang keempat' / 'laptop keempat' = Product ID '${prevRecs[3]?.product_id}' (${prevRecs[3]?.name})` : ""}

ATURAN EVALUASI & AMBIGUOUS REFERENCE (SANGAT PENTING):
1. JANGAN PERNAH MENEBAK: Jika ada ${prevRecs.length} laptop rekomendasi dan user bertanya ambigu "Laptop ini cocok buat coding?" tanpa menyebut nomor dan tidak sedang membuka halaman detail produk:
   Tanyakan dengan ramah: "Yang kamu maksud laptop nomor berapa, 1, 2, atau 3? Saya bisa cek spesifikasinya satu per satu." JANGAN panggil search_catalog dan JANGAN memilih salah satu produk secara sepihak.
2. JIKA USER MENYEBUT NOMOR: "Laptop nomor 2 cocok buat coding?" -> Panggil get_product_detail({ product_id: "${prevRecs[1]?.product_id}" }) dan evaluasi spesifikasinya.
3. JIKA USER MEMINTA EVALUASI KETIGANYA: "Dari ketiganya mana yang paling cocok buat coding?", "Dari yang tadi mana yang paling worth it?" -> Evaluasi dan ranking SELURUH ${prevRecs.length} laptop dari DAFTAR REKOMENDASI AKTIF di atas tanpa memanggil search_catalog baru.
4. JIKA USER MEMINTA ALTERNATIF: "Kalau selain ketiganya ada laptop lain?" -> BOLEH memanggil search_catalog karena user meminta alternatif baru.
5. TOPIC SWITCHING & CONTEXT BOUNDARY: DAFTAR REKOMENDASI AKTIF di atas hanya berlaku untuk kebutuhan/topik pencarian saat ini. Jika pengguna beralih topik atau meminta kategori/kebutuhan laptop baru (contoh: "Sekarang carikan laptop gaming budget 20 juta", "Kalau untuk gaming yang bagus apa?"), panggil search_catalog untuk mencari laptop baru sesuai kebutuhan topik baru tersebut, JANGAN memaksakan rekomendasi topik lama. Jika user secara eksplisit merujuk ke produk topik sebelumnya ("laptop nomor 2 yang tadi dari rekomendasi coding"), gunakan data dari riwayat percakapan untuk menjawab produk tersebut secara grounded tanpa menebak.`
      : `DAFTAR REKOMENDASI AKTIF: TIDAK ADA (0 rekomendasi aktif).
ATURAN SESI TANPA REKOMENDASI (ACCOUNT ISOLATION):
- Jika pengguna menanyakan nomor ordinal (contoh: "Laptop nomor 2 tadi bagaimana?", "Yang pertama tadi speknya apa?") atau merujuk "laptop tadi" / "produk tadi", TETAPI tidak ada rekomendasi aktif, pengguna tidak di halaman produk, dan tidak ada riwayat: JANGAN memanggil search_catalog dan JANGAN mengarang rekomendasi laptop baru. Jelaskan dengan ramah bahwa di percakapan ini belum ada rekomendasi laptop sebelumnya dan tanyakan kebutuhan/budget yang dicari.`;

  const pageContext = req.context.activeProductId
    ? `KONTEKS PRODUK AKTIF / TARGET YANG SEDANG DITANYAKAN:
User sedang menanyakan laptop [Product ID: "${req.context.activeProductId}"].
ATURAN PRODUK AKTIF (MUTLAK):
- Panggil get_product_detail({ product_id: "${req.context.activeProductId}" }) untuk mengambil data spesifikasi resmi produk tersebut dan jelaskan kepada user.
- JANGAN memanggil search_catalog dan JANGAN merekomendasikan produk lain kecuali user secara eksplisit meminta alternatif baru ("ada alternatif lain?", "selain ini", "carikan laptop lain").`
    : req.context.currentRoute
      ? `User sedang berada di halaman: '${req.context.currentRoute}'.`
      : "";

  return `Anda adalah AI Shopping Agent resmi untuk TechAI Store, toko online spesialis 70 laptop terverifikasi.

PRIORITAS UTAMA - INTENT PESAN TERBARU (LATEST USER MESSAGE):
Pesan terbaru pengguna selalu memiliki prioritas tertinggi untuk menentukan intent:
1. JIKA PESAN TERBARU ADALAH PERINTAH NAVIGASI / MEMBUKA HALAMAN (Contoh: "Arahkan saya ke halaman order", "Buka halaman pesanan saya", "Buka cart", "Pergi ke keranjang", "Buka katalog", "Buka halaman compare", "Pergi ke halaman utama", "Buka produk asus-01"):
   - Anda WAJIB memanggil tool navigate_to_page dengan rute target yang sesuai:
     * Order / Pesanan / Riwayat Pesanan: navigate_to_page({ route: "/orders" })
     * Cart / Keranjang Belanja: navigate_to_page({ route: "/cart" })
     * Checkout / Bayar / Pesan Sekarang: navigate_to_page({ route: "/checkout" })
     * Shop / Katalog / Toko / Semua Laptop: navigate_to_page({ route: "/shop" })
     * Compare / Perbandingan / Komparasi: navigate_to_page({ route: "/compare" })
     * Home / Beranda / Halaman Utama: navigate_to_page({ route: "/" })
     * Detail Produk Tertentu: navigate_to_page({ route: "/product/[product_id]" })
   - JANGAN memanggil search_catalog dan JANGAN memberikan rekomendasi laptop baru jika user meminta navigasi.
2. JIKA PESAN TERBARU ADALAH PENCARIAN / TOPIK BARU (Contoh: "Carikan 3 laptop terbaik untuk coding dengan budget maksimal 15 juta", "cari laptop gaming", "rekomendasikan laptop kuliah", "sekarang carikan laptop untuk desain"):
   - Anda WAJIB memanggil tool search_catalog dengan kriteria pencarian baru dari pesan terbaru tersebut.
   - JANGAN PERNAH mengevaluasi, membandingkan, atau merujuk ke produk rekomendasi lama saat user meminta pencarian baru.
   - Hasil baru dari search_catalog adalah satu-satunya produk yang Anda rekomendasikan kepada user.
3. JIKA PESAN TERBARU ADALAH FOLLOW-UP TOPIK AKTIF (Contoh: "Laptop nomor 2 bagaimana?", "Berapa baterainya?", "Bandingkan nomor 1 dan 2"):
   - Gunakan DAFTAR REKOMENDASI AKTIF untuk menjawab spesifik produk tersebut.
4. JIKA PESAN TERBARU MERUJUK EKSPLISIT TOPIK LAMA (Contoh: "Laptop nomor 2 dari rekomendasi coding yang tadi bagaimana?"):
   - Ambil data produk topik lama tersebut dari riwayat percakapan tanpa memanggil search_catalog baru.

TUGAS ANDA:
1. Menjadi asisten dan konsultan belanja laptop yang ramah, objektif, cerdas, dan responsif dalam Bahasa Indonesia.
2. Membantu mencari, membandingkan, memeriksa stok, mengevaluasi spesifikasi laptop, dan memasukkan produk ke keranjang belanja pengguna.
3. Selalu menggunakan Tools yang tersedia untuk mengambil data produk, harga, stok, spesifikasi, dan navigasi halaman.

ATURAN GROUNDING & KEAMANAN (MUTLAK):
- Dataset katalog toko berisi tepat 70 model laptop resmi (ASUS, Lenovo, Acer, HP, Dell, MSI, Apple).
- JANGAN PERNAH mengarang nama laptop, harga, RAM, GPU, storage, bobot, baterai, layar, garansi, atau spesifikasi fiktif. Seluruh data wajib diperoleh dari pemanggilan tool.
- Jika pengguna meminta informasi spesifikasi yang tidak ada di data katalog setelah pemanggilan tool, katakan dengan jujur bahwa informasi tersebut belum tercantum di katalog resmi kami, JANGAN menebak.
- Jika pengguna meminta laptop dengan kriteria yang tidak ada di katalog setelah search_catalog, jelaskan dengan jujur bahwa laptop dengan kriteria tersebut belum tersedia di katalog kami dan berikan saran alternatif terbaik yang mendekati.
- search_catalog HANYA boleh dipanggil untuk pencarian laptop baru, saat user beralih topik/kebutuhan (topic switch), atau saat user meminta alternatif ("ada alternatif lain?", "selain laptop ini").
- Navigasi & Checkout: Jika pengguna meminta menuju halaman tertentu atau menyelesaikan pesanan, panggil tool navigate_to_page dengan route yang tepat (/orders, /cart, /checkout, /shop, /compare, /, /product/[id]). JANGAN PERNAH melakukan pembayaran otomatis.
- Cart: Jika pengguna meminta "masukkan ke keranjang" atau "beli yang nomor 2", panggil tool add_product_to_cart dengan product_id yang sesuai.

KONTEKS SESI AKTIF:
${userGreeting}
${pageContext}
${previousRecsText}
Total item di keranjang belanja user saat ini: ${req.context.cartCount ?? 0} item.`;
}

export async function runGeminiAgent(
  req: ServerAgentRequest,
  apiKey: string,
): Promise<ServerAgentResponse> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const executedTools: string[] = [];
  const recommendedProducts: Product[] = [];
  let finalAction: AgentAction = { type: "none" };
  let hasNewSearch = false;
  let newSearchRecommendations: PreviousRecommendation[] = [];

  // Convert history into Gemini contents format
  const contents: any[] = [];

  for (const h of req.history) {
    if (h.role === "user") {
      contents.push({
        role: "user",
        parts: [{ text: h.text }],
      });
    } else if (h.role === "assistant") {
      contents.push({
        role: "model",
        parts: [{ text: h.text }],
      });
    }
  }

  // Append current user message
  contents.push({
    role: "user",
    parts: [{ text: req.message }],
  });

  const systemInstruction = {
    parts: [{ text: buildSystemInstruction(req) }],
  };

  const tools = [
    {
      functionDeclarations: GEMINI_FUNCTION_DECLARATIONS,
    },
  ];

  let loopCount = 0;
  const maxLoops = 5;

  while (loopCount < maxLoops) {
    loopCount++;

    const payload = {
      contents,
      systemInstruction,
      tools,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Gemini API error (status ${res.status}):`, errText);
      throw new Error(`Gemini API HTTP Error ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as any;
    const candidate = data?.candidates?.[0];
    if (!candidate || !candidate.content) {
      throw new Error("No response candidates from Gemini API");
    }

    const modelParts = candidate.content.parts || [];
    contents.push(candidate.content);

    // Check for function calls
    const functionCalls = modelParts.filter((p: any) => p.functionCall);

    if (functionCalls.length === 0) {
      // Model responded with final text
      const textParts = modelParts
        .filter((p: any) => p.text)
        .map((p: any) => p.text)
        .join("\n");

      const activeRecommendations = hasNewSearch
        ? newSearchRecommendations
        : req.context.previousRecommendations && req.context.previousRecommendations.length > 0
          ? req.context.previousRecommendations
          : undefined;

      const intentType: RecommendationIntent = hasNewSearch ? "new_search" : "followup";

      return {
        text: textParts || "Ada yang bisa saya bantu terkait laptop di TechAI Store?",
        products: recommendedProducts.length > 0 ? recommendedProducts : undefined,
        executedTools,
        action: finalAction,
        recommendations: activeRecommendations,
        intentType,
        mode: "gemini",
      };
    }

    // Execute each function call
    const functionResponses: any[] = [];

    for (const part of functionCalls) {
      const fc = part.functionCall;
      const fnName = fc.name;
      const fnArgs = fc.args || {};

      executedTools.push(`${fnName}(${JSON.stringify(fnArgs)})`);
      console.log(`[AI Agent Tool Call] ${fnName}:`, fnArgs);

      let resultData: any;

      try {
        switch (fnName) {
          case "search_catalog": {
            const prods = searchCatalog(fnArgs);
            if (prods.length > 0) {
              hasNewSearch = true;
              newSearchRecommendations = prods.map((p) => ({
                product_id: p.id,
                name: p.name,
                brand: p.brand,
                price: p.price,
              }));
            }
            resultData = {
              count: prods.length,
              results: prods.map((p) => ({
                id: p.id,
                name: p.name,
                brand: p.brand,
                category: p.category,
                price: p.price,
                rating: p.rating,
                stock: p.stock,
                processor: p.specs.processor,
                ram: p.specs.ram,
                storage: p.specs.storage,
                gpu: p.specs.gpu,
                screen_size: p.specs.screenSize,
                resolution: p.specs.resolution,
                refresh_rate: p.specs.refreshRate,
                battery: p.specs.battery,
                weight: p.specs.weight,
                warranty: p.warranty,
                usage: p.specs.usage,
              })),
            };
            for (const p of prods) {
              if (!recommendedProducts.some((item) => item.id === p.id)) {
                recommendedProducts.push(p);
              }
            }
            break;
          }

          case "get_product_detail": {
            const detail = getProductDetail(fnArgs);
            resultData = detail;
            if ("id" in detail) {
              if (!recommendedProducts.some((item) => item.id === detail.id)) {
                recommendedProducts.push(detail as Product);
              }
            }
            break;
          }

          case "compare_products": {
            const comp = compareProducts(fnArgs);
            resultData = comp;
            if ("products" in comp) {
              finalAction = {
                type: "compare",
                productIds: (fnArgs.product_ids || []).slice(0, 3),
              };
            }
            break;
          }

          case "check_product_stock": {
            const stockRes = checkProductStock(fnArgs);
            resultData = stockRes;
            break;
          }

          case "get_user_cart": {
            const cartRes = await getUserCart(req.accessToken);
            resultData = cartRes;
            break;
          }

          case "add_product_to_cart": {
            const addRes = await addProductToCart(fnArgs, req.accessToken);
            resultData = addRes;
            if ("success" in addRes && addRes.success && addRes.product) {
              finalAction = {
                type: "add_to_cart",
                product: addRes.product,
                quantity: addRes.quantity || 1,
              };
              if (!recommendedProducts.some((item) => item.id === addRes.product?.id)) {
                recommendedProducts.push(addRes.product);
              }
            }
            break;
          }

          case "navigate_to_page": {
            const navRes = navigateToPage(fnArgs);
            resultData = navRes;
            if ("success" in navRes && navRes.success) {
              finalAction = {
                type: "navigate",
                route: navRes.route,
              };
            }
            break;
          }

          default:
            resultData = { error: `Tool '${fnName}' tidak dikenali.` };
        }
      } catch (err: any) {
        console.error(`Error executing tool ${fnName}:`, err);
        resultData = { error: err.message || "Gagal mengeksekusi tool" };
      }

      functionResponses.push({
        functionResponse: {
          name: fnName,
          response: {
            output: resultData,
          },
        },
      });
    }

    // Append function responses back to contents
    contents.push({
      role: "user",
      parts: functionResponses,
    });
  }

  const activeRecommendations = hasNewSearch
    ? newSearchRecommendations
    : req.context.previousRecommendations && req.context.previousRecommendations.length > 0
      ? req.context.previousRecommendations
      : undefined;

  const intentType: RecommendationIntent = hasNewSearch ? "new_search" : "followup";

  return {
    text: "Selesai memproses permintaan Anda.",
    products: recommendedProducts.length > 0 ? recommendedProducts : undefined,
    executedTools,
    action: finalAction,
    recommendations: activeRecommendations,
    intentType,
    mode: "gemini",
  };
}
