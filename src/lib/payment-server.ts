import { createServerFn } from "@tanstack/react-start";
import { supabase } from "./supabase";

export type RefreshQrRequest = {
  orderId: string;
};

export type RefreshQrResponse = {
  success: boolean;
  expires_at: string;
  status?: string;
  message: string;
  error?: string;
};

/**
 * Server Function: Refresh QR Code / Extend Payment Expiration by 5 Minutes
 */
export const refreshQrCodeFn = createServerFn({ method: "POST" })
  .validator((d: RefreshQrRequest) => d)
  .handler(async ({ data }): Promise<RefreshQrResponse> => {
    try {
      const { orderId } = data;
      if (!orderId) {
        return {
          success: false,
          expires_at: "",
          message: "Order ID diperlukan untuk memperbarui kode QR.",
          error: "Missing order ID",
        };
      }

      // Calculate new expiration time: NOW + 5 Minutes
      const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Fetch current order
      const { data: order, error: fetchErr } = await supabase
        .from("orders")
        .select("id, status")
        .eq("id", orderId)
        .maybeSingle();

      if (fetchErr) {
        console.error("Error fetching order for QR refresh:", fetchErr);
        return {
          success: false,
          expires_at: "",
          message: "Gagal menemukan data pesanan.",
          error: fetchErr.message,
        };
      }

      // Determine updated status: if previously expired, set back to payment_review
      let nextStatus = order?.status;
      if (order?.status === "expired") {
        nextStatus = "payment_review";
      }

      // Update order updated_at & status in database
      const updatePayload: { updated_at: string; status?: string } = {
        updated_at: new Date().toISOString(),
      };
      if (nextStatus && nextStatus !== order?.status) {
        updatePayload.status = nextStatus;
      }

      const { error: updateErr } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", orderId);

      if (updateErr) {
        console.error("Error updating order timestamp in database:", updateErr);
        return {
          success: false,
          expires_at: "",
          message: "Gagal memperbarui batas waktu pembayaran di database.",
          error: updateErr.message,
        };
      }

      return {
        success: true,
        expires_at: newExpiresAt,
        status: nextStatus || "payment_review",
        message: "Kode QR berhasil diperbarui! Masa berlaku pembayaran diperpanjang 5 menit.",
      };
    } catch (err: any) {
      console.error("Unexpected error in refreshQrCodeFn:", err);
      return {
        success: false,
        expires_at: "",
        message: err?.message || "Terjadi kesalahan saat memperbarui kode QR.",
        error: err?.message,
      };
    }
  });
