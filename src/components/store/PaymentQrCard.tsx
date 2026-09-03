import { AlertCircle, Clock, Copy, QrCode, RotateCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/catalog";
import { refreshQrCodeFn } from "@/lib/payment-server";

export interface PaymentQrCardProps {
  orderId?: string | undefined;
  amount: number;
  expiresAt?: string | null | undefined;
  paymentMethod?: string | undefined;
  onExpiresAtChange?: ((newExpiresAt: string) => void) | undefined;
  onExpiredStatusChange?: ((isExpired: boolean) => void) | undefined;
  className?: string | undefined;
}

export function PaymentQrCard({
  orderId,
  amount,
  expiresAt,
  paymentMethod = "QRIS",
  onExpiresAtChange,
  onExpiredStatusChange,
  className = "",
}: PaymentQrCardProps) {
  // Local state for current expires_at
  const [currentExpiresAt, setCurrentExpiresAt] = useState<string>(() => {
    if (expiresAt) return expiresAt;
    return new Date(Date.now() + 5 * 60 * 1000).toISOString();
  });

  const [timeLeft, setTimeLeft] = useState<number>(5 * 60);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Sync with prop when expiresAt changes externally
  useEffect(() => {
    if (expiresAt) {
      setCurrentExpiresAt(expiresAt);
    }
  }, [expiresAt]);

  // Real-time Countdown Timer (MM:SS)
  useEffect(() => {
    const calculateTimeLeft = () => {
      const targetTime = new Date(currentExpiresAt).getTime();
      const now = Date.now();
      const diffInSeconds = Math.max(0, Math.floor((targetTime - now) / 1000));

      setTimeLeft(diffInSeconds);

      const expired = diffInSeconds <= 0;
      setIsExpired(expired);
      if (onExpiredStatusChange) {
        onExpiredStatusChange(expired);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [currentExpiresAt, onExpiredStatusChange]);

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Handle Refresh QR Code (AJAX / ServerFn - No page refresh)
  const handleRefreshQr = useCallback(async () => {
    setRefreshing(true);
    try {
      if (orderId) {
        // Send async request to backend server function
        const res = await refreshQrCodeFn({
          data: { orderId },
        });

        if (res.success && res.expires_at) {
          setCurrentExpiresAt(res.expires_at);
          setIsExpired(false);
          if (onExpiresAtChange) {
            onExpiresAtChange(res.expires_at);
          }
          toast.success("Kode QR Diperbarui", {
            description: "Batas waktu pembayaran diperpanjang 5 menit.",
          });
        } else {
          throw new Error(res.message || "Gagal memperbarui kode QR");
        }
      } else {
        // Client-side refresh for checkout preview before order is saved
        const newExpires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        setCurrentExpiresAt(newExpires);
        setIsExpired(false);
        if (onExpiresAtChange) {
          onExpiresAtChange(newExpires);
        }
        toast.success("Kode QR Diperbarui", {
          description: "Batas waktu pembayaran telah direset ke 5 menit.",
        });
      }
    } catch (err: any) {
      console.error("Refresh QR error:", err);
      toast.error("Gagal Refresh Kode QR", {
        description: err?.message || "Terjadi kesalahan saat memperbarui QR.",
      });
    } finally {
      setRefreshing(false);
    }
  }, [orderId, onExpiresAtChange]);

  const copyAmount = () => {
    void navigator.clipboard.writeText(String(amount));
    toast.success("Nominal Disalin", {
      description: `Rp${formatIDR(amount)} disalin ke clipboard.`,
    });
  };

  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 text-center space-y-4 shadow-sm ${className}`}>
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-left">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {paymentMethod === "Bank Transfer" ? "Virtual Account & QR" : "Pembayaran QRIS"}
          </span>
          <p className="text-xs text-muted-foreground">
            Pindai QR dengan aplikasi mobile banking atau e-wallet (BCA, Mandiri, GoPay, OVO, Dana).
          </p>
        </div>

        {/* Real-time Countdown Badge */}
        <Badge
          variant="outline"
          className={`gap-1.5 px-3 py-1 font-mono text-xs font-semibold transition-colors ${
            isExpired
              ? "border-destructive/40 bg-destructive/10 text-destructive animate-pulse"
              : timeLeft < 120
                ? "border-amber-500/40 bg-amber-500/10 text-amber-500 animate-pulse"
                : "border-secondary/30 bg-secondary/10 text-secondary"
          }`}
        >
          <Clock className="size-3.5" />
          {isExpired ? "00:00 (Kadaluarsa)" : `Sisa Waktu: ${formatTime(timeLeft)}`}
        </Badge>
      </div>

      {/* QR Code Container with Blur/Overlay when Expired */}
      <div className="relative mx-auto flex size-52 items-center justify-center rounded-2xl border border-border bg-white p-3 shadow-inner overflow-hidden">
        <img
          src="/images/qr-testing.png"
          alt="QR Code Pembayaran"
          className={`size-full object-contain transition-all duration-300 ${
            isExpired ? "blur-md scale-95 opacity-30" : "scale-100 opacity-100"
          }`}
        />

        {/* Expired Overlay */}
        {isExpired && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/85 p-3 text-center backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-5" />
            </div>
            <p className="text-xs font-bold text-foreground">Kode QR Sudah Kadaluarsa</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Masa berlaku 5 menit habis. Klik tombol di bawah untuk perbarui.
            </p>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={refreshing}
              onClick={() => void handleRefreshQr()}
              className="mt-1 h-8 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-sm"
            >
              <RotateCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Memperbarui..." : "Refresh Kode QR"}
            </Button>
          </div>
        )}
      </div>

      {/* Metadata & Nominal Information */}
      <div className="space-y-2 rounded-xl bg-card p-3 border border-border text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total Pembayaran:</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base text-foreground">Rp{formatIDR(amount)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 rounded text-muted-foreground hover:text-foreground"
              onClick={copyAmount}
              title="Salin nominal"
            >
              <Copy className="size-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-muted-foreground">
          <span>NMID / Merchant:</span>
          <span className="font-mono font-semibold text-foreground">ID1020030040050 · PT LaptopAI Indonesia</span>
        </div>

        {orderId && (
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Order ID:</span>
            <span className="font-mono font-semibold text-secondary">{orderId.slice(0, 13)}...</span>
          </div>
        )}
      </div>

      {/* Manual Refresh Button when not expired */}
      {!isExpired && (
        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={refreshing}
            onClick={() => void handleRefreshQr()}
            className="gap-1.5 text-xs text-muted-foreground hover:text-secondary h-7 px-3 rounded-lg"
          >
            <RotateCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Memperbarui..." : "Refresh Waktu QR"}
          </Button>
        </div>
      )}
    </div>
  );
}
