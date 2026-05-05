import { redirect } from "next/navigation";

import { getOrgAccess } from "@/lib/org-context";

type PageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default async function EmployeeDetailPage({
  params,
}: PageProps): Promise<React.ReactElement | null> {
  const { id } = await params;
  const access = await getOrgAccess();
  if (!access) return null;
  redirect(`/employees/${id}/insights`);
}
