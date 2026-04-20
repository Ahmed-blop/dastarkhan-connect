import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function useFavorites() {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    setLoading(true);
    supabase
      .from("favorites")
      .select("establishment_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setIds(new Set((data ?? []).map((r) => r.establishment_id)));
        setLoading(false);
      });
  }, [user]);

  const toggle = async (establishmentId: string) => {
    if (!user) return false;
    if (ids.has(establishmentId)) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("establishment_id", establishmentId);
      setIds((prev) => {
        const n = new Set(prev);
        n.delete(establishmentId);
        return n;
      });
      return false;
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, establishment_id: establishmentId });
      setIds((prev) => new Set(prev).add(establishmentId));
      return true;
    }
  };

  return { ids, isFavorite: (id: string) => ids.has(id), toggle, loading };
}
