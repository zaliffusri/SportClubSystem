import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function PointsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "finance")) redirect("/");
  return <>{children}</>;
}
