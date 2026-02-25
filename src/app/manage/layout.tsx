import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");
  return <>{children}</>;
}
