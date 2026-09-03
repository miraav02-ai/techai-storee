import type { Product } from "../catalog";

export type AgentRole = "user" | "assistant" | "system" | "function";

export type PreviousRecommendation = {
  product_id: string;
  name: string;
  brand: string;
  price: number;
};

export type AgentAction =
  | { type: "add_to_cart"; product: Product; quantity: number }
  | { type: "navigate"; route: string }
  | { type: "compare"; productIds: string[] }
  | { type: "none" };

export type AgentMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools?: string[] | undefined;
  products?: Product[] | undefined;
  action?: AgentAction | undefined;
  mode?: "gemini" | "fallback" | undefined;
  reasoning?: Record<string, any> | undefined;
  previousRecommendations?: PreviousRecommendation[] | undefined;
};

export type AgentContext = {
  activeProductId?: string | undefined;
  currentRoute?: string | undefined;
  cartCount?: number | undefined;
  previousRecommendations?: PreviousRecommendation[] | undefined;
  user?: {
    id: string;
    name: string;
    email?: string | undefined;
    role?: string | undefined;
  } | null | undefined;
};

export type SearchCatalogArgs = {
  query?: string | undefined;
  brand?: string | undefined;
  max_price?: number | undefined;
  min_ram?: number | undefined;
  gpu?: string | undefined;
  category?: string | undefined;
};

export type GetProductDetailArgs = {
  product_id: string;
};

export type CompareProductsArgs = {
  product_ids: string[];
};

export type CheckProductStockArgs = {
  product_id: string;
};

export type AddToCartArgs = {
  product_id: string;
  quantity?: number | undefined;
};

export type NavigateToPageArgs = {
  route: string;
};

export type ServerAgentRequest = {
  message: string;
  history: { role: "user" | "assistant"; text: string; products?: string[] | undefined }[];
  context: AgentContext;
  accessToken?: string | undefined;
};

export type RecommendationIntent =
  | "new_search"
  | "followup"
  | "evaluation"
  | "comparison"
  | "detail"
  | "cart"
  | "ambiguous"
  | "none";

export type ServerAgentResponse = {
  text: string;
  products?: Product[] | undefined;
  executedTools: string[];
  action?: AgentAction | undefined;
  mode: "gemini" | "fallback";
  recommendations?: PreviousRecommendation[] | undefined;
  intentType?: RecommendationIntent | undefined;
  error?: string | undefined;
};
