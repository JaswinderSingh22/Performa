import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function OrgSetupRequired() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader className="space-y-3">
          <CardTitle className="text-xl">Finish setup</CardTitle>
          <CardDescription className="leading-relaxed">
            ReviewPilot couldn&apos;t load your workspace configuration. Confirm
            the required environment variables and database migration are
            applied, then try again—or sign in to access your organization.
          </CardDescription>
          <p className="text-muted-foreground pt-2 text-sm">
            <Link
              href="/login"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Sign in
            </Link>{" "}
            if your account already has a workspace link.
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
