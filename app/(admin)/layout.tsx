import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalLayout } from "@/components/layout/PortalLayout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <PortalLayout role="admin" userName={profile?.full_name ?? "Lara"}>
      {children}
    </PortalLayout>
  );
}
