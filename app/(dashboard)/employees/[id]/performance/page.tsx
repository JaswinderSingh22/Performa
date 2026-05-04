import { redirect } from "next/navigation";

type PageProps = Readonly<{ params: Promise<{ id: string }> }>;

/** Legacy route — consolidated into insights for a single landing experience. */
export default async function EmployeePerformancePage({
  params,
}: PageProps): Promise<never> {
  const { id } = await params;
  redirect(`/employees/${id}/insights`);
}
