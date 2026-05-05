import crypto from "node:crypto";

import { createServiceRoleSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function readNote(notes: unknown, key: string): string | null {
  if (!notes || typeof notes !== "object") return null;
  const v = (notes as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

function isoFromRazorpayTime(v: unknown): string | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const ms = v < 10_000_000_000 ? v * 1000 : v;
  return new Date(ms).toISOString();
}

type SubscriptionEntity = {
  id?: unknown;
  status?: unknown;
  current_end?: unknown;
  notes?: unknown;
};

function parseSubscriptionEntity(sub: unknown): SubscriptionEntity | null {
  if (!sub || typeof sub !== "object") return null;
  return sub as SubscriptionEntity;
}

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  const sig = request.headers.get("x-razorpay-signature");

  if (!verifySignature(raw, sig)) {
    return new Response("invalid signature", { status: 401 });
  }

  let body: { event?: string; payload?: { subscription?: { entity?: unknown } } };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const event = body.event ?? "";
  const entity = parseSubscriptionEntity(body.payload?.subscription?.entity);
  if (!entity?.id) {
    return new Response("ok", { status: 200 });
  }

  let admin;
  try {
    admin = createServiceRoleSupabase();
  } catch {
    return new Response("server misconfigured", { status: 500 });
  }

  const subId = String(entity.id);
  const orgIdFromNote = readNote(entity.notes, "org_id");
  const targetPlan = readNote(entity.notes, "target_plan");
  const billingInterval = readNote(entity.notes, "billing_interval");

  const { data: orgBySub } = await admin
    .from("organizations")
    .select("id")
    .eq("razorpay_subscription_id", subId)
    .maybeSingle();

  const orgId = orgBySub?.id ?? orgIdFromNote;
  if (!orgId) {
    return new Response("ok", { status: 200 });
  }

  const periodEnd = isoFromRazorpayTime(entity.current_end);
  const statusStr =
    typeof entity.status === "string" ? entity.status : String(entity.status ?? "");

  if (
    event === "subscription.activated" ||
    event === "subscription.charged" ||
    event === "subscription.resumed"
  ) {
    if (targetPlan === "pro" || targetPlan === "pro_plus") {
      const patch: Record<string, unknown> = {
        plan: targetPlan,
        subscription_status: statusStr || "active",
        razorpay_subscription_id: subId,
        subscription_current_end: periodEnd,
      };
      if (billingInterval === "year" || billingInterval === "month") {
        patch.billing_interval = billingInterval;
      }
      await admin.from("organizations").update(patch).eq("id", orgId);
    }
    return new Response("ok", { status: 200 });
  }

  if (event === "subscription.cancelled") {
    // User cancelled auto-renew. Keep paid plan access till current period end;
    // do not downgrade immediately to free.
    if (!orgBySub?.id) {
      return new Response("ok", { status: 200 });
    }
    await admin
      .from("organizations")
      .update({
        subscription_status: statusStr || "cancelled",
        subscription_current_end: periodEnd,
      })
      .eq("id", orgBySub.id)
      .eq("razorpay_subscription_id", subId);
    return new Response("ok", { status: 200 });
  }

  if (event === "subscription.completed" || event === "subscription.expired") {
    // Terminal state: paid period is over; do NOT immediately downgrade.
    // Grace handling is computed from subscription_current_end in app logic.
    if (!orgBySub?.id) {
      return new Response("ok", { status: 200 });
    }
    await admin
      .from("organizations")
      .update({
        subscription_status: statusStr || "expired",
        subscription_current_end: periodEnd,
      })
      .eq("id", orgBySub.id)
      .eq("razorpay_subscription_id", subId);
    return new Response("ok", { status: 200 });
  }

  if (event === "subscription.halted" || event === "subscription.paused") {
    if (!orgBySub?.id) {
      return new Response("ok", { status: 200 });
    }
    await admin
      .from("organizations")
      .update({
        subscription_status: statusStr || event.replace("subscription.", ""),
        subscription_current_end: periodEnd,
      })
      .eq("id", orgBySub.id)
      .eq("razorpay_subscription_id", subId);
  }

  return new Response("ok", { status: 200 });
}
