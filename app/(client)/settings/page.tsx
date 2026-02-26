import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import SettingsClient from "@/components/settings/SettingsClient";

export default async function ClientSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Settings" subtitle="Manage your account" />
      <div className="mt-8">
        <SettingsClient
          userId={user.id}
          initialName={profile?.full_name ?? ""}
          initialBusinessName={profile?.business_name ?? null}
          initialEmail={profile?.email ?? user.email ?? ""}
          initialAvatarUrl={profile?.avatar_url ?? null}
          showBusinessName={true}
        />
      </div>
    </div>
  );
}
