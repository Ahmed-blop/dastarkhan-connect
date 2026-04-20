import { supabase } from "@/integrations/supabase/client";

export async function logEvent(
  eventType: string,
  establishmentId?: string | null,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.rpc("log_event", {
      _event_type: eventType,
      _establishment_id: establishmentId ?? null,
      _metadata: metadata ?? null,
    });
  } catch (e) {
    // analytics never blocks
    console.warn("logEvent failed", e);
  }
}

export function whatsappLink(number: string, message?: string) {
  const cleaned = number.replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${cleaned}${text}`;
}
