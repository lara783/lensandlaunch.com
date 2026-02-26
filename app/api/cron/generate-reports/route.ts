import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Daily cron: 0 23 * * * (9am AEST)
// Checks for Monthly Report events due today and triggers PDF generation for each.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Find pending monthly_reports whose calendar event falls today
  const { data: dueReports, error } = await (supabase as any)
    .from("monthly_reports")
    .select("id, client_id, project_id, calendar_event_id, calendar_events(start_date)")
    .eq("status", "pending")
    .not("calendar_event_id", "is", null);

  if (error) {
    console.error("Cron: failed to fetch due reports:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const todayReports = (dueReports ?? []).filter((r: any) => {
    const evtDate = r.calendar_events?.start_date?.split("T")[0];
    return evtDate === today;
  });

  if (!todayReports.length) {
    return NextResponse.json({ message: "No reports due today.", date: today });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.lensandlaunch.com";

  // Trigger generation for each due report (fire-and-forget)
  const triggered = await Promise.allSettled(
    todayReports.map((r: any) =>
      fetch(`${appUrl}/api/admin/reports/generate/${r.id}`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      })
    )
  );

  return NextResponse.json({
    message: `Triggered ${todayReports.length} report(s).`,
    date: today,
    reportIds: todayReports.map((r: any) => r.id),
    results: triggered.map((t) => t.status),
  });
}
