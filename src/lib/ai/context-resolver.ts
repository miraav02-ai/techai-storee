import { seedProducts, type Product } from "../catalog";
import type { PreviousRecommendation } from "./types";

export type ResolvedIntent =
  | { type: "active_product"; productId: string }
  | { type: "ambiguous_reference"; candidates: PreviousRecommendation[] }
  | { type: "missing_reference"; reason: string }
  | { type: "compare_ordinals"; productIds: string[] }
  | { type: "add_to_cart_ordinal"; productId: string; quantity: number }
  | { type: "evaluate_previous"; products: PreviousRecommendation[] }
  | { type: "none" };

export type ResolverHistoryItem = {
  role: "user" | "assistant";
  text: string;
  products?: any[] | undefined;
};

export type RecommendationEvent = {
  turnIndex: number;
  userPrompt: string;
  topicKeywords: string[];
  products: string[]; // product IDs
};

/**
 * Reconstructs past recommendation events from conversation history
 */
export function extractRecommendationEvents(history: ResolverHistoryItem[]): RecommendationEvent[] {
  const events: RecommendationEvent[] = [];

  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    if (msg && msg.role === "assistant" && msg.products && msg.products.length > 0) {
      const userPrompt = history[i - 1]?.text || "";
      const lowerPrompt = userPrompt.toLowerCase();
      const lowerResp = (msg.text || "").toLowerCase();

      const keywords: string[] = [];
      if (/game|gaming|esport|rtx|rog|tuf|loq|nitro|victus/.test(lowerPrompt) || /gaming/.test(lowerResp)) keywords.push("gaming");
      if (/code|coding|program|developer|python|react|vs code/.test(lowerPrompt) || /coding|programming/.test(lowerResp)) keywords.push("coding");
      if (/desain|design|creator|editing|render|photoshop|premiere/.test(lowerPrompt) || /creator|design/.test(lowerResp)) keywords.push("creator");
      if (/kuliah|mahasiswa|student|sekolah|kampus|tugas/.test(lowerPrompt) || /student|kuliah/.test(lowerResp)) keywords.push("student");
      if (/kantor|bisnis|office|kerja|business/.test(lowerPrompt) || /business|bisnis/.test(lowerResp)) keywords.push("business");
      if (/apple|macbook|mac\b|m2|m3|m4/.test(lowerPrompt) || /apple|macbook/.test(lowerResp)) keywords.push("apple");
      if (/asus/.test(lowerPrompt) || /asus/.test(lowerResp)) keywords.push("asus");
      if (/lenovo/.test(lowerPrompt) || /lenovo/.test(lowerResp)) keywords.push("lenovo");
      if (/acer/.test(lowerPrompt) || /acer/.test(lowerResp)) keywords.push("acer");
      if (/hp\b/.test(lowerPrompt) || /hp\b/.test(lowerResp)) keywords.push("hp");
      if (/dell/.test(lowerPrompt) || /dell/.test(lowerResp)) keywords.push("dell");
      if (/msi/.test(lowerPrompt) || /msi/.test(lowerResp)) keywords.push("msi");

      const productIds = msg.products.map((p: any) =>
        typeof p === "string" ? p : p.id || p.product_id
      ).filter(Boolean);

      events.push({
        turnIndex: i,
        userPrompt,
        topicKeywords: keywords,
        products: productIds,
      });
    }
  }

  return events;
}

/**
 * Deterministic application-level context, topic boundary, and ordinal resolver
 */
export function resolveContextIntent(
  message: string,
  activeProductId?: string,
  previousRecommendations: PreviousRecommendation[] = [],
  history: ResolverHistoryItem[] = [],
): ResolvedIntent {
  const q = message.toLowerCase().trim();

  // -------------------------------------------------------------------------
  // 1. REFINED ORDINAL PATTERNS (Distinguish Ordinal from Count/Quantity)
  // e.g. "nomor 3", "ke-3", "ketiga", "yang ketiga", "laptop ke 3" are ordinals.
  // "3 laptop", "3 buah laptop", "3 rekomendasi" are counts/quantities in search requests!
  // -------------------------------------------------------------------------
  const hasOrdinal1 = /(?:nomor|no\.?|laptop|opsi|pilihan|ke-?)\s*1\b|\b(?:ke-1|ke-satu|pertama|yang ke 1|yang ke satu|yang pertama|laptop ke 1|laptop pertama)\b/i.test(q);
  const hasOrdinal2 = /(?:nomor|no\.?|laptop|opsi|pilihan|ke-?)\s*2\b|\b(?:ke-2|ke-dua|kedua|yang ke 2|yang ke dua|yang kedua|laptop ke 2|laptop kedua)\b/i.test(q);
  const hasOrdinal3 = /(?:nomor|no\.?|laptop|opsi|pilihan|ke-?)\s*3\b|\b(?:ke-3|ke-tiga|ketiga|yang ke 3|yang ke tiga|yang ketiga|laptop ke 3|laptop ketiga)\b/i.test(q);
  const hasOrdinal4 = /(?:nomor|no\.?|laptop|opsi|pilihan|ke-?)\s*4\b|\b(?:ke-4|ke-empat|keempat|yang ke 4|yang ke empat|yang keempat|laptop ke 4|laptop keempat)\b/i.test(q);
  const hasAnyOrdinal = hasOrdinal1 || hasOrdinal2 || hasOrdinal3 || hasOrdinal4;

  const hasPriorTextRef = /(?:laptop|produk|opsi|rekomendasi|yang)\s+(?:tadi|sebelumnya|awal)/i.test(q);

  // Explicit Historical Reference (Must explicitly contain past markers e.g. "dari rekomendasi ... tadi")
  const isExplicitHistoricalRef =
    /(?:dari|pada)\s+(?:rekomendasi|sesi|pilihan|topik|opsi)\s+[a-z0-9\s-]+\s+(?:yang\s+)?(?:tadi|sebelumnya|awal)/i.test(q) ||
    /(?:rekomendasi|laptop|pilihan|opsi)\s+[a-z0-9\s-]+\s+(?:yang\s+)?(?:tadi|sebelumnya|awal)/i.test(q) ||
    /(?:yang|laptop)\s+(?:pertama|kedua|ketiga|ke-\d+|nomor\s*\d)\s+(?:dari\s+)?(?:rekomendasi\s+)?[a-z0-9\s-]+\s+(?:yang\s+)?(?:tadi|sebelumnya|awal)/i.test(q) ||
    /(?:yang|laptop)\s+kamu\s+rekomendasi(?:kan)?\s+(?:untuk|buat)\s+[a-z0-9\s-]+\s+(?:yang\s+)?(?:tadi|sebelumnya|awal)/i.test(q) ||
    /(?:yang|laptop)\s+(?:di\s+)?awal\s+tadi/i.test(q);

  // Alternative request ("alternatif lain", "selain laptop ini")
  const isAlternativeRequest =
    /alternatif|selain (?:ini|laptop ini|produk ini|yang ini|ketiganya|rekomendasi tadi|3 laptop tadi)|ganti|yang lain|laptop lain|opsi lain|pilihan lain|rekomendasi lain|rekomendasikan yang lain|cari yang lain|ada yang lebih murah|kalau (?:kurang cocok|bukan ini|gak cocok|tidak cocok)/i.test(
      q,
    );

  // -------------------------------------------------------------------------
  // PRIORITY 1: EXPLICIT NEW SEARCH / TOPIC SWITCH
  // Must take highest precedence over old previousRecommendations or stale active products
  // -------------------------------------------------------------------------
  const isExplicitNewSearch =
    /(?:^|\b)(?:cari(?:kan)?|mencari|butuh|rekomendasi(?:kan)?|mau (?:cari|beli)|pengen (?:cari|beli)|tolong (?:cari|carikan|rekomendasi)|ada(?:kah)? rekomendasi|ada(?:kah)? laptop)\b/i.test(q) ||
    /(?:^|\b)(?:sekarang|coba|tolong)?\s*(?:aku\s+)?(?:mau\s+)?(?:cari(?:kan)?|butuh|rekomendasikan)\s+(?:laptop|opsi|rekomendasi)/i.test(q) ||
    /(?:^|\b)(?:kalau|gimana kalau)\s+(?:untuk|buat)\s+(?:kebutuhan\s+)?(?:gaming|coding|desain|design|kuliah|kantor|bisnis|programming|creator|student|mahasiswa)/i.test(q) ||
    /(?:^|\b)(?:ganti|pindah)\s+(?:topik|kebutuhan|pencarian|kategori|ke)/i.test(q) ||
    /(?:^|\b)laptop\s+(?:untuk|buat)?\s*(?:gaming|coding|desain|design|kuliah|kantor|bisnis|mahasiswa|sekolah|kantoran)\s+(?:budget|harga|dibawah|maksimal|maks|max|under)/i.test(q) ||
    /(?:^|\b)(?:budget|dana|harga)\s*(?:maksimal|maks|max|dibawah|under|kurang dari|\<=?)\s*\d+/i.test(q);

  if ((isExplicitNewSearch || isAlternativeRequest) && !isExplicitHistoricalRef) {
    // If it's a new search, do NOT resolve to stale active products or old candidate ordinals!
    return { type: "none" };
  }

  // -------------------------------------------------------------------------
  // PRIORITY 2: EXPLICIT HISTORICAL REFERENCE (Must have explicit historical keywords)
  // Higher priority than current active context when past topic is explicitly requested!
  // -------------------------------------------------------------------------
  if (isExplicitHistoricalRef && hasAnyOrdinal) {
    if (history.length > 0) {
      let targetOrdinal = 0;
      if (hasOrdinal2) targetOrdinal = 1;
      else if (hasOrdinal3) targetOrdinal = 2;
      else if (hasOrdinal4) targetOrdinal = 3;

      let catKeyword = "";
      if (/game|gaming|esport/.test(q)) catKeyword = "gaming";
      else if (/code|coding|program|developer|python/.test(q)) catKeyword = "coding";
      else if (/desain|design|creator|editing|render/.test(q)) catKeyword = "creator";
      else if (/kuliah|mahasiswa|student|sekolah/.test(q)) catKeyword = "student";
      else if (/kantor|bisnis|office|kerja|business/.test(q)) catKeyword = "business";
      else if (/apple|macbook|mac\b/.test(q)) catKeyword = "apple";
      else if (/asus/.test(q)) catKeyword = "asus";
      else if (/lenovo/.test(q)) catKeyword = "lenovo";
      else if (/acer/.test(q)) catKeyword = "acer";
      else if (/hp\b/.test(q)) catKeyword = "hp";
      else if (/dell/.test(q)) catKeyword = "dell";
      else if (/msi/.test(q)) catKeyword = "msi";

      const events = extractRecommendationEvents(history);

      // Search events in reverse chronological order
      for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i];
        if (!ev) continue;
        const matchesCategory =
          !catKeyword ||
          ev.topicKeywords.includes(catKeyword) ||
          ev.userPrompt.toLowerCase().includes(catKeyword) ||
          ev.products.some((pid) => {
            const prod = seedProducts.find((p) => p.id === pid);
            if (!prod) return false;
            return (
              (prod.category && prod.category.toLowerCase().includes(catKeyword)) ||
              (prod.brand && prod.brand.toLowerCase() === catKeyword) ||
              (prod.specs?.usage && prod.specs.usage.toLowerCase().includes(catKeyword.slice(0, 4)))
            );
          });

        if (matchesCategory && ev.products.length > targetOrdinal) {
          const prodId = ev.products[targetOrdinal];
          if (prodId) {
            return { type: "active_product", productId: prodId };
          }
        }
      }
    }

    if (previousRecommendations.length === 0 && !activeProductId) {
      return { type: "missing_reference", reason: "no_historical_reference" };
    }
  }

  // -------------------------------------------------------------------------
  // PRIORITY 3: ACTIVE CONTEXT FOLLOW-UP (Applies only to current active candidates)
  // -------------------------------------------------------------------------
  // A. Multi-Candidate Evaluation ("dari yang tadi", "dari ketiganya", "mana yang paling worth it")
  const isAllCandidatesEvaluation =
    /dari (?:3|ketiga|semua|yang tadi|rekomendasi tadi)|ketiganya|semua (?:laptop|rekomendasi|produk) tadi|mana yang paling (?:cocok|worth it|bagus|terbaik)|paling rekomen|pilih yang terbaik|worth it mana|bandingkan ketiganya|evaluasi ketiganya/i.test(
      q,
    );

  if (isAllCandidatesEvaluation && !isAlternativeRequest) {
    if (previousRecommendations.length > 0) {
      return {
        type: "evaluate_previous",
        products: previousRecommendations,
      };
    }
    if (!activeProductId && history.length === 0) {
      return { type: "missing_reference", reason: "no_prior_recommendations" };
    }
  }

  // B. Ordinal Compare ("Bandingkan nomor 1 dan 2")
  const isCompareIntent = /compare|bandingkan|versus|vs\b|perbandingan|komparasi/i.test(q);
  if (isCompareIntent) {
    if (previousRecommendations.length >= 2) {
      const indices: number[] = [];
      if (hasOrdinal1) indices.push(0);
      if (hasOrdinal2) indices.push(1);
      if (hasOrdinal3) indices.push(2);
      if (hasOrdinal4) indices.push(3);

      if (/kedua laptop|keduanya|kedua produk|dua laptop/i.test(q) && indices.length < 2) {
        indices.push(0, 1);
      }

      const pids = indices
        .slice(0, 3)
        .map((idx) => previousRecommendations[idx]?.product_id)
        .filter((id): id is string => typeof id === "string");

      const uniquePids = [...new Set(pids)];
      if (uniquePids.length >= 2) {
        return {
          type: "compare_ordinals",
          productIds: uniquePids,
        };
      }
    }

    if (previousRecommendations.length === 0 && !activeProductId) {
      return { type: "missing_reference", reason: "no_candidates_to_compare" };
    }
  }

  // C. Ordinal Add To Cart ("Yang nomor 2 masukin ke keranjang")
  const isCartIntent = /cart|keranjang|masuk(?:kan)? ke (?:cart|keranjang)|beli|tambah/i.test(q);
  if (isCartIntent) {
    if (previousRecommendations.length > 0) {
      let targetIdx = -1;
      if (hasOrdinal1) targetIdx = 0;
      else if (hasOrdinal2) targetIdx = 1;
      else if (hasOrdinal3) targetIdx = 2;
      else if (hasOrdinal4) targetIdx = 3;

      const targetItem = targetIdx >= 0 ? previousRecommendations[targetIdx] : undefined;
      if (targetItem) {
        return {
          type: "add_to_cart_ordinal",
          productId: targetItem.product_id,
          quantity: 1,
        };
      }
    }

    if (previousRecommendations.length === 0 && !activeProductId && hasAnyOrdinal) {
      return { type: "missing_reference", reason: "no_candidates_for_cart" };
    }
  }

  // D. Single Product Evaluation & Ordinal Follow-up
  const isEvaluationQuery =
    /laptop ini|produk ini|yang ini|laptop tersebut|produk tersebut|laptop tadi|yang tadi|spek(?:nya)?|layar(?:nya)?|baterai(?:nya)?|batre(?:nya)?|berat(?:nya)?|bobot(?:nya)?|resolusi(?:nya)?|prosesor(?:nya)?|processor(?:nya)?|vga(?:nya)?|gpu(?:nya)?|ram(?:nya)?|storage(?:nya)?|ssd(?:nya)?|garansi(?:nya)?|cocok (?:nggak|gak|kah|buat|untuk)|bagus (?:nggak|gak|kah|buat|untuk)|kuat (?:nggak|gak|kah|buat|untuk)|worth it|cukup (?:nggak|gak|kah|buat|untuk)|apakah ini|bisa buat|berapa|gimana|bagaimana|jelaskan|detail/i.test(
      q,
    );

  if (isEvaluationQuery || hasAnyOrdinal || hasPriorTextRef) {
    if (hasOrdinal2 && previousRecommendations[1]) {
      return { type: "active_product", productId: previousRecommendations[1].product_id };
    }
    if (hasOrdinal3 && previousRecommendations[2]) {
      return { type: "active_product", productId: previousRecommendations[2].product_id };
    }
    if (hasOrdinal4 && previousRecommendations[3]) {
      return { type: "active_product", productId: previousRecommendations[3].product_id };
    }
    if (hasOrdinal1 && previousRecommendations[0]) {
      return { type: "active_product", productId: previousRecommendations[0].product_id };
    }

    if (activeProductId) {
      return { type: "active_product", productId: activeProductId };
    }

    if (previousRecommendations.length === 1 && previousRecommendations[0]) {
      return { type: "active_product", productId: previousRecommendations[0].product_id };
    }

    // -----------------------------------------------------------------------
    // PRIORITY 4: AMBIGUOUS REFERENCE (Active candidates only, never stale history)
    // -----------------------------------------------------------------------
    if (previousRecommendations.length > 1) {
      return {
        type: "ambiguous_reference",
        candidates: previousRecommendations,
      };
    }

    // -----------------------------------------------------------------------
    // PRIORITY 5: NO CONTEXT / MISSING REFERENCE
    // -----------------------------------------------------------------------
    if (previousRecommendations.length === 0 && !activeProductId) {
      return { type: "missing_reference", reason: "no_prior_product" };
    }
  }

  return { type: "none" };
}

