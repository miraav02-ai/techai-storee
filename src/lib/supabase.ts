import { createClient } from "@supabase/supabase-js";

const env = import.meta.env as Record<string, string | undefined>;

const rawUrl =
  env["VITE_SUPABASE_URL"] && env["VITE_SUPABASE_URL"] !== "YOUR_SUPABASE_URL"
    ? env["VITE_SUPABASE_URL"]
    : "https://placeholder-project.supabase.co";

const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

const supabasePublishableKey =
  env["VITE_SUPABASE_PUBLISHABLE_KEY"] &&
  env["VITE_SUPABASE_PUBLISHABLE_KEY"] !== "YOUR_SUPABASE_PUBLISHABLE_KEY"
    ? env["VITE_SUPABASE_PUBLISHABLE_KEY"]
    : "placeholder-publishable-key";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
