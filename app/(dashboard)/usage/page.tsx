import { redirect } from "next/navigation";

/**
 * Legacy URL — billing and usage are combined on `/billing`.
 */
export default function UsagePageRedirect(): never {
  redirect("/billing");
}
