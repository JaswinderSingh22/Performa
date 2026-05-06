"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type WorkspaceMemberRoleResult = { ok: true } | { ok: false; error: string };

const updateRoleSchema = z.object({
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["admin", "hr", "manager", "tl"]),
});

export async function updateWorkspaceMemberRole(
  input: unknown,
): Promise<WorkspaceMemberRoleResult> {
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid role update." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, error: "You must be signed in." };
  }

  const { error } = await supabase.rpc("set_workspace_member_role", {
    p_org_id: parsed.data.orgId,
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
  });

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}
