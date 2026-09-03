-- Migration: Add expires_at column to orders table for QR Code & Payment Expiration (5 Minutes)
-- Date: 2026-09-03

-- 1. Add expires_at column to public.orders if not exists (Default 5 Minutes)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minute');

-- 2. Add index for faster expiration queries and status checks
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON public.orders(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_expires_at ON public.orders(status, expires_at);

-- 3. Document the status column to include 'expired' status
COMMENT ON COLUMN public.orders.status IS 'Order lifecycle status: pending_payment, payment_review, confirmed, processing, shipped, delivered, completed, cancelled, expired';

-- 4. Backfill existing orders that do not have expires_at set
UPDATE public.orders 
SET expires_at = created_at + INTERVAL '5 minute' 
WHERE expires_at IS NULL;
