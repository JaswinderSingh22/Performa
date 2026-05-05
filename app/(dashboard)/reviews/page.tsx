import { redirect } from "next/navigation";
import type { ReactElement } from "react";

export default async function WorkspaceReviewsPage(): Promise<ReactElement> {
  redirect("/dashboard");
}
