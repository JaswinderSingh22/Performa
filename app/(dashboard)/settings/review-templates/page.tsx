import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ReviewPresetCatalog } from "@/components/settings/review-preset-catalog";
import { buttonVariants } from "@/components/ui/button";
import { getOrgAccess } from "@/lib/org-context";
import { normalizePlan } from "@/lib/plans";

export default async function ReviewTemplatesSettingsPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;
  if (access.role !== "admin" && access.role !== "hr") {
    return (
      <>
        <DashboardHeader title="Review templates" description="Admin or HR only." />
        <main className="p-6 text-muted-foreground text-sm">
          You don&apos;t have access to workspace template settings.
        </main>
      </>
    );
  }

  const { data: org } = await access.supabase
    .from("organizations")
    .select("plan")
    .eq("id", access.orgId)
    .maybeSingle();

  const plan = normalizePlan(org?.plan as string | null | undefined);

  return (
    <>
      <DashboardHeader
        title="Self-review questionnaires"
        description="Built-in presets for review cycles — pick one each time HR creates a cycle."
        actions={
          <Link
            href="/settings"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5" })}
          >
            <ArrowLeftIcon className="size-4" />
            Settings home
          </Link>
        }
      />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
        <ReviewPresetCatalog plan={plan} />
      </main>
    </>
  );
}
