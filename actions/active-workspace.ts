"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({
  orgId: z.string().uuid(),
});

export type ActiveWorkspaceResult = { ok: true } | { ok: false; error: string };

export async function setActiveWorkspace(
  input: unknown,
): Promise<ActiveWorkspaceResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid workspace." };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "You must be signed in." };

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("org_id")
    .eq("org_id", parsed.data.orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.org_id) {
    return { ok: false, error: "You are not a member of this workspace." };
  }

  const cookieStore = await cookies();
  cookieStore.set("active_org_id", parsed.data.orgId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });

  return { ok: true };
}

