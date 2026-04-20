import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export async function logEvent(
  eventType: string,
  establishmentId?: string | null,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.rpc("log_event", {
      _event_type: eventType,
      _establishment_id: establishmentId ?? undefined,
      _metadata: (metadata ?? undefined) as Json | undefined,
    });
  } catch (e) {
    console.warn("logEvent failed", e);
  }
}

export function whatsappLink(number: string, message?: string) {
  const cleaned = number.replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${cleaned}${text}`;
}
