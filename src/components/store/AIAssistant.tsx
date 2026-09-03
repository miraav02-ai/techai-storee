import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bot,
  CornerDownLeft,
  Eye,
  GitCompareArrows,
  Loader2,
  Lock,
  Sparkles,
  ShoppingCart,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { generateUUID } from "@/lib/utils";
import { agentChatFn } from "@/lib/ai/agent-server";
import type { AgentMessage, ServerAgentRequest, PreviousRecommendation } from "@/lib/ai/types";
import { Rating, StockDot } from "./ProductCard";

const PROMPTS = [
  "Laptop untuk coding RAM 16GB budget 15 juta",
  "Dari yang tadi, mana yang paling worth it?",
  "Bandingkan nomor 1 dan 2",
  "Yang nomor 2 masukin ke cart",
  "Laptop kuliah ringan dibawah 8 juta",
];

const INITIAL_MESSAGES: AgentMessage[] = [
  {
    id: "m0",
    role: "assistant",
    text: "Halo! Saya AI Shopping Agent resmi TechAI Store. Beritahu kebutuhan laptop Anda (misal: coding, gaming, desain grafis, kuliah, atau kantor) dan budget yang dimiliki. Saya dapat mencari 70 laptop terverifikasi, membandingkan spesifikasi, dan memasukkan produk ke keranjang belanja Anda.",
    tools: ["search_catalog()"],
    mode: "gemini",
  },
];

export function AIAssistant() {
  const { aiOpen, setAiOpen, addToCart, toggleCompare, compare } = useStore();
  const { user, profile, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<AgentMessage[]>(INITIAL_MESSAGES);
  const [previousRecommendations, setPreviousRecommendations] = useState<PreviousRecommendation[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Track user session changes for Account Isolation
  const currentUserId = user?.id ?? null;
  const prevUserIdRef = useRef<string | null>(currentUserId);

  useEffect(() => {
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;
      setMessages(INITIAL_MESSAGES);
      setPreviousRecommendations([]);
      setInput("");
      setThinking(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (value: string) => {
    const question = value.trim();
    if (!question || thinking) return;

    const userMsgId = generateUUID();
    const newUserMsg: AgentMessage = {
      id: userMsgId,
      role: "user",
      text: question,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");
    setThinking(true);

    try {
      // 1. Extract context from active page
      const currentRoute = location.pathname;
      const activeProductId = currentRoute.startsWith("/product/")
        ? currentRoute.replace("/product/", "").trim()
        : undefined;

      // 2. Extract user auth token
      const sessionRes = await supabase.auth.getSession();
      const accessToken = sessionRes.data.session?.access_token;

      // 3. Build history payload
      const historyPayload = messages.map((m) => {
        const item: { role: "user" | "assistant"; text: string; products?: string[] | undefined } = {
          role: m.role,
          text: m.text,
        };
        if (m.products && m.products.length > 0) {
          item.products = m.products.map((p) => p.id);
        }
        return item;
      });

      const requestPayload: ServerAgentRequest = {
        message: question,
        history: historyPayload,
        context: {
          activeProductId,
          currentRoute,
          cartCount: 0,
          previousRecommendations,
          user: user
            ? {
                id: user.id,
                name: profile?.name || user.email?.split("@")[0] || "User",
                email: user.email,
                role: profile?.role || "customer",
              }
            : null,
        },
        accessToken,
      };

      // 4. Call server agent
      const res = await agentChatFn({ data: requestPayload });

      const assistantMsg: AgentMessage = {
        id: generateUUID(),
        role: "assistant",
        text: res.text,
        tools: res.executedTools,
        products: res.products,
        action: res.action,
        mode: res.mode,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // 5. Update previous recommendations state (Preserve candidate memory during follow-ups/detail/compare/cart)
      if (res.recommendations && res.recommendations.length > 0) {
        setPreviousRecommendations(res.recommendations);
      } else if (res.intentType === "new_search" && res.products && res.products.length > 0) {
        setPreviousRecommendations(
          res.products.map((p) => ({
            product_id: p.id,
            name: p.name,
            brand: p.brand,
            price: p.price,
          })),
        );
      }

      // 6. Handle Agent Autonomous Actions
      if (res.action) {
        if (res.action.type === "add_to_cart") {
          addToCart(res.action.product, res.action.quantity);
          toast.success("Added to Cart by AI Agent", {
            description: `${res.action.quantity}x ${res.action.product.name} telah ditambahkan ke keranjang belanja.`,
          });
        } else if (res.action.type === "navigate") {
          toast.info("Navigating...", {
            description: `Mengarahkan ke ${res.action.route}`,
          });
          setAiOpen(false);
          void navigate({ to: res.action.route as any });
        } else if (res.action.type === "compare") {
          toast.info("Product Comparison Ready", {
            description: `Menyiapkan komparasi untuk ${res.action.productIds.length} produk.`,
          });
        }
      }
    } catch (err: any) {
      console.error("AI Agent Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: generateUUID(),
          role: "assistant",
          text: "Maaf, terjadi kendala saat memproses permintaan Anda. Silakan coba lagi beberapa saat lagi.",
          mode: "fallback",
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setAiOpen(true)}
        className="fixed bottom-5 right-5 z-40 h-14 gap-2 rounded-2xl px-5 ai-glow animate-pulse-ring"
      >
        <Sparkles className="size-5" />
        <span className="font-semibold">AI Shopping Agent</span>
      </Button>

      <Sheet open={aiOpen} onOpenChange={setAiOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="gradient-ai gap-1 p-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-secondary-foreground">
                <Bot className="size-5" /> LaptopAI Shopping Agent
              </SheetTitle>
              <Badge
                variant="secondary"
                className="text-[10px] font-mono tracking-tight bg-secondary/20 text-secondary-foreground border-secondary/30"
              >
                <Sparkles className="mr-1 size-3 text-secondary-foreground" />
                Active Agent
              </Badge>
            </div>
            <p className="text-xs text-secondary-foreground/85">
              100% Grounded in 70 verified laptops · Multi-turn memory & active page context
            </p>
          </SheetHeader>

          {!user ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-secondary/10 text-secondary shadow-inner">
                <Lock className="size-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Sign In to Use AI Assistant</h3>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Get personalized laptop recommendations powered by deep reasoning across 70 verified models, real-time specs, and live inventory.
              </p>
              <div className="mt-6 flex w-full flex-col gap-2.5">
                <Button
                  asChild
                  className="w-full rounded-xl py-5 text-sm font-semibold shadow-md"
                  onClick={() => setAiOpen(false)}
                >
                  <Link to="/login">Sign In to Your Account</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => setAiOpen(false)}
                >
                  <Link to="/register">Create a Free Account</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1">
                <div className="space-y-4 p-4">
                  {messages.map((m) => (
                    <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                      <div className={m.role === "user" ? "max-w-[85%]" : "w-full"}>
                        {m.tools && m.tools.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {m.tools.map((t, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="font-mono text-[10px] bg-secondary/10 text-foreground border-border"
                              >
                                <Wrench className="mr-1 size-3 text-secondary" />
                                {t.length > 40 ? t.slice(0, 38) + "…)" : t}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div
                          className={
                            m.role === "user"
                              ? "rounded-2xl rounded-br-sm bg-secondary px-4 py-2.5 text-sm text-secondary-foreground shadow-sm"
                              : "rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line shadow-sm"
                          }
                        >
                          {m.text}
                        </div>

                        {/* Action success alert if executed */}
                        {m.action?.type === "add_to_cart" && (
                          <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="size-4 shrink-0" />
                            <span>Item otomatis ditambahkan ke Keranjang Anda.</span>
                          </div>
                        )}

                        {m.products && m.products.length > 0 && (
                          <div className="mt-3 space-y-2.5">
                            {m.products.map((p, pIdx) => {
                              const inCompare = compare.some((item) => item.id === p.id);
                              return (
                                <div
                                  key={p.id}
                                  className="surface-card flex flex-col gap-3 p-3.5 sm:flex-row relative group"
                                >
                                  <div className="absolute top-2 left-2 z-10 grid size-5 place-items-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground shadow">
                                    {pIdx + 1}
                                  </div>
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    loading="lazy"
                                    width={1024}
                                    height={768}
                                    className="h-24 w-full shrink-0 rounded-lg object-cover sm:h-24 sm:w-28"
                                  />
                                  <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <Badge variant="outline" className="text-[10px]">
                                        {p.brand} · {p.category}
                                      </Badge>
                                      <StockDot stock={p.stock} />
                                    </div>
                                    {isAdmin ? (
                                      <button
                                        type="button"
                                        onClick={() => void send(`Jelaskan spesifikasi lengkap ${p.name}`)}
                                        className="block text-left font-semibold leading-snug hover:text-secondary"
                                      >
                                        {p.name}
                                      </button>
                                    ) : (
                                      <Link
                                        to="/product/$id"
                                        params={{ id: p.id }}
                                        onClick={() => setAiOpen(false)}
                                        className="block font-semibold leading-snug hover:text-secondary"
                                      >
                                        {p.name}
                                      </Link>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                      <span className="font-medium text-foreground">{p.specs.processor}</span>
                                      {" · "}
                                      <span>{p.specs.ram}</span>
                                      {" · "}
                                      <span>{p.specs.storage}</span>
                                      {" · "}
                                      <span className="font-medium text-secondary">{p.specs.gpu}</span>
                                    </p>
                                    <div className="flex items-center justify-between pt-1">
                                      <p className="text-base font-bold text-foreground">
                                        {formatIDR(p.price)}
                                      </p>
                                      <Rating value={p.rating} reviews={p.reviews} />
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                      {!isAdmin && (
                                        <Button
                                          size="sm"
                                          className="h-8 flex-1 gap-1 text-xs"
                                          onClick={() => addToCart(p)}
                                          disabled={p.stock === 0}
                                        >
                                          <ShoppingCart className="size-3.5" /> Add to Cart
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant={inCompare ? "secondary" : "outline"}
                                        className={`h-8 gap-1 text-xs ${isAdmin ? "flex-1" : ""}`}
                                        onClick={() => toggleCompare(p)}
                                      >
                                        <GitCompareArrows className="size-3.5" />
                                        {inCompare ? "In Compare" : "Compare"}
                                      </Button>
                                      {isAdmin ? (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          className="h-8 flex-1 gap-1 text-xs"
                                          onClick={() => void send(`Jelaskan spesifikasi lengkap ${p.name}`)}
                                        >
                                          <Eye className="size-3.5" /> Cek Spek
                                        </Button>
                                      ) : (
                                        <Button
                                          asChild
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 gap-1 text-xs"
                                          onClick={() => setAiOpen(false)}
                                        >
                                          <Link to="/product/$id" params={{ id: p.id }}>
                                            <Eye className="size-3.5" /> Detail
                                          </Link>
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {thinking && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-surface p-3 rounded-xl border border-border">
                      <Loader2 className="size-4 animate-spin text-secondary" />
                      <span>Analyzing catalog & executing agent tools…</span>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              </ScrollArea>

              <div className="space-y-2 border-t border-border p-3">
                <div className="flex flex-wrap gap-1.5">
                  {PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => void send(p)}
                      disabled={thinking}
                      className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(input);
                  }}
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Tanya: 'Dari yang tadi mana paling worth it?' / 'Bandingkan nomor 1 dan 2'..."
                    disabled={thinking}
                    className="rounded-xl"
                  />
                  <Button type="submit" size="icon" disabled={thinking || !input.trim()} className="rounded-xl">
                    {thinking ? <Loader2 className="size-4 animate-spin" /> : <CornerDownLeft className="size-4" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
