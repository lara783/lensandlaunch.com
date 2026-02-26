import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalLayout } from "@/components/layout/PortalLayout";

export default async function TeamLayout({
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

  if (profile?.role === "admin") redirect("/admin");
  if (profile?.role === "client") redirect("/dashboard");
  if (profile?.role !== "team") redirect("/login");

  return (
    <PortalLayout role="team" userName={profile?.full_name ?? user.email ?? "Team"}>
      {children}
    </PortalLayout>
  );
}
