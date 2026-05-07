import { redirect } from "next/navigation";
import type { ReactElement } from "react";

type PageProps = Readonly<{ params: Promise<{ id: string }> }>;

export default async function GenerateReviewRedirect({
  params,
}: PageProps): Promise<ReactElement> {
  const { id } = await params;
  redirect(`/employees/${id}/insights`);
}
