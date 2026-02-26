import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Column key in scope items for each standard tier name
const TIER_COLUMN: Record<string, string> = {
  Essential: "essential",
  Growth: "growth",
  Premium: "premium",
};

// POST /api/proposals/provision-deliverables
// Called after a client accepts a proposal. Creates deliverables + a
// Creative Direction meeting event from the accepted package's scope.
export async function POST(req: NextRequest) {
  try {
    const { proposalId } = await req.json();
    if (!proposalId) return NextResponse.json({ error: "Missing proposalId" }, { status: 400 });

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch the accepted proposal
    const { data: proposal } = await admin
      .from("proposals")
      .select("id, client_id, content, selected_tier_name")
      .eq("id", proposalId)
      .single();

    if (!proposal || proposal.selected_tier_name === null) {
      return NextResponse.json({ ok: true, skipped: "no selected_tier_name" });
    }

    const selectedTier: string = proposal.selected_tier_name;
    const tierCol = TIER_COLUMN[selectedTier] ?? null;

    // Find (or create) the client's active project
    let { data: project } = await admin
      .from("projects")
      .select("id")
      .eq("client_id", proposal.client_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!project) {
      const { data: newProject, error: projErr } = await admin
        .from("projects")
        .insert({
          client_id: proposal.client_id,
          name: `${selectedTier} Package`,
          service_type: "retainer",
          status: "active",
        })
        .select("id")
        .single();
      if (projErr || !newProject) {
        console.error("[provision-deliverables] project create error:", projErr);
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
      }
      project = newProject;
    }

    const projectId = project.id;
    const sections: any[] = Array.isArray(proposal.content) ? proposal.content : [];

    // Build deliverables from scope items in the accepted tier
    const deliverablesToInsert: {
      project_id: string;
      title: string;
      description: string | null;
      sort_order: number;
    }[] = [];

    let order = 0;

    for (const section of sections) {
      if (!section.scopeItems || !Array.isArray(section.scopeItems)) continue;
      for (const item of section.scopeItems) {
        const value: string = tierCol ? (item[tierCol] ?? "") : "";
        if (!value || value === "—" || value === "") continue;
        const title = value === "✓" ? item.feature : `${item.feature} — ${value}`;
        deliverablesToInsert.push({
          project_id: projectId,
          title,
          description: null,
          sort_order: order++,
        });
      }
    }

    // Always add a Creative Direction & Onboarding Call deliverable at the top
    const allDeliverables = [
      {
        project_id: projectId,
        title: "Creative Direction & Onboarding Call",
        description: "Schedule your creative direction call to kick off the project.",
        sort_order: -1,
      },
      ...deliverablesToInsert,
    ];

    if (allDeliverables.length > 0) {
      const { error: delErr } = await admin.from("deliverables").insert(allDeliverables);
      if (delErr) console.error("[provision-deliverables] deliverables insert error:", delErr);
    }

    // Create a placeholder calendar event for the Creative Direction call
    const shootDate = new Date();
    shootDate.setDate(shootDate.getDate() + 7); // 1 week from now, TBC
    const { error: calErr } = await admin.from("calendar_events").insert({
      project_id: projectId,
      title: "Creative Direction & Onboarding Call (TBC)",
      start_date: shootDate.toISOString(),
      type: "meeting",
      color: "#9c847a",
      notes: `Package: ${selectedTier}. Confirm date with client.`,
    });
    if (calErr) console.error("[provision-deliverables] calendar insert error:", calErr);

    return NextResponse.json({ ok: true, deliverables: allDeliverables.length, projectId });
  } catch (err) {
    console.error("[provision-deliverables] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
