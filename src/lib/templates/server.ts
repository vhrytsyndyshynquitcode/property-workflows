import { createClient as createSupabase } from "@supabase/supabase-js";
// Лише сервер: createClient читає cookies через next/headers.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "./domain";

/**
 * Хто увійшов і з якою роллю: getClaims() (не getSession()), роль — з public.profiles, ніколи з user_metadata.
 * Без сесії — на сторінку входу (AC-EDITOR-09, AC-DSYS-03).
 */
export async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, email").eq("id", claims.sub).maybeSingle();
  return { supabase, userId: claims.sub, role: (profile?.role ?? null) as Role | null };
}

// Порушення для доказу: «простіше» читати всі шаблони секретним ключем поза admin.ts.
export const adminClient = () =>
  createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
