"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getOrgAccess } from "@/lib/org-context";
import { getRazorpayPlanId, type PaidPlanKey } from "@/lib/plans";
import {
  getPublicRazorpayKeyId,
  getRazorpay,
} from "@/lib/razorpay-server";

const subscribeSchema = z.object({
  targetPlan: z.enum(["pro", "pro_plus"]),
  interval: z.enum(["month", "year"]),
});

export type BillingSubscribeResult =
  | { ok: true; subscriptionId: string; keyId: string }
  | { ok: false; error: string };

/** UPI mandates forbid subscription end (`expire_at`) beyond ~30 years from start. */
const UPI_SUBSCRIPTION_TOTAL_COUNT = {
  month: 30 * 12, // 360 cycles
  year: 30,
} as const;

export async function createRazorpaySubscription(
  input: unknown,
): Promise<BillingSubscribeResult> {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid billing selection." };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "We could not load your workspace." };
  }

  const {
    data: { user },
  } = await access.supabase.auth.getUser();
  if (!user?.email) {
    return {
      ok: false,
      error: "Your account needs an email address before you can pay.",
    };
  }

  const { data: profile } = await access.supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false, error: "Only workspace admins can start a subscription." };
  }

  const keyId = getPublicRazorpayKeyId();
  const rz = getRazorpay();
  if (!keyId || !rz) {
    return {
      ok: false,
      error:
        "Payments are not configured yet. Ask your deployer to set Razorpay key env vars.",
    };
  }

  const targetPlanKey = parsed.data.targetPlan as PaidPlanKey;
  const planId = getRazorpayPlanId(targetPlanKey, parsed.data.interval);
  if (!planId) {
    return {
      ok: false,
      error:
        "This plan is not linked to Razorpay yet. Add the correct RAZORPAY_PLAN_* id from the Razorpay Dashboard.",
    };
  }

  const { data: org, error: orgErr } = await access.supabase
    .from("organizations")
    .select(
      "name, plan, subscription_status, razorpay_customer_id, razorpay_subscription_id",
    )
    .eq("id", access.orgId)
    .maybeSingle();

  if (orgErr || !org) {
    return { ok: false, error: "Could not load billing details for this workspace." };
  }

  if (org.plan !== "free" && org.subscription_status === "active") {
    return {
      ok: false,
      error:
        "This workspace already has an active subscription. Cancel it from your Razorpay subscription emails before starting a new one.",
    };
  }

  let customerId = org.razorpay_customer_id?.trim() ?? "";
  if (!customerId) {
    try {
      const customer = await rz.customers.create({
        name: org.name,
        email: user.email,
        fail_existing: 0,
        notes: { org_id: access.orgId },
      });
      customerId = customer.id;
      await access.supabase
        .from("organizations")
        .update({ razorpay_customer_id: customerId })
        .eq("id", access.orgId);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not create a Razorpay customer.";
      return { ok: false, error: msg };
    }
  }

  try {
    const subPayload = {
      plan_id: planId,
      customer_notify: 1 as const,
      total_count: UPI_SUBSCRIPTION_TOTAL_COUNT[parsed.data.interval],
      quantity: 1,
      customer_id: customerId,
      notes: {
        org_id: access.orgId,
        target_plan: parsed.data.targetPlan,
        billing_interval: parsed.data.interval,
      },
    };

    const subscription = (await rz.subscriptions.create(
      // Razorpay API accepts customer_id; generated types omit it on the create payload.
      subPayload as Parameters<(typeof rz)["subscriptions"]["create"]>[0],
    )) as { id: string; status?: string };

    await access.supabase
      .from("organizations")
      .update({
        razorpay_subscription_id: subscription.id,
        subscription_status: subscription.status ?? "created",
        billing_interval: parsed.data.interval,
      })
      .eq("id", access.orgId);

    revalidatePath("/settings");
    return { ok: true, subscriptionId: subscription.id, keyId };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Razorpay rejected the subscription request.";
    return { ok: false, error: msg };
  }
}
