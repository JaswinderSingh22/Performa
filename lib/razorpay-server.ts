import "server-only";

import Razorpay from "razorpay";

export function getRazorpay(): Razorpay | null {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

export function getPublicRazorpayKeyId(): string | null {
  const v = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  return v && v.length > 0 ? v : null;
}
