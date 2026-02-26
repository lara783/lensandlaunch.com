// HubSpot CRM integration via Private App API
// Requires env var: HUBSPOT_PRIVATE_APP_TOKEN
// Scopes needed: crm.objects.contacts.read/write, crm.objects.deals.read/write,
//                crm.objects.notes.write, files.ui_hidden.write

const BASE = "https://api.hubapi.com";

function headers() {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) throw new Error("HUBSPOT_PRIVATE_APP_TOKEN not set");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ── Contacts ─────────────────────────────────────────────────────────────────

/** Find a HubSpot contact by email. Returns the contact ID or null. */
export async function findContactByEmail(email: string): Promise<string | null> {
  const res = await fetch(
    `${BASE}/crm/v3/objects/contacts/search`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
        properties: ["email"],
        limit: 1,
      }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.results?.[0]?.id ?? null;
}

/** Create or find a HubSpot contact. Returns the contact ID. */
export async function upsertContact(params: {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
}): Promise<string | null> {
  try {
    const existing = await findContactByEmail(params.email);
    if (existing) return existing;

    const nameParts = (params.firstName ?? "").split(" ");
    const res = await fetch(`${BASE}/crm/v3/objects/contacts`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        properties: {
          email: params.email,
          firstname: nameParts[0] ?? "",
          lastname: (nameParts.slice(1).join(" ") || params.lastName) ?? "",
          company: params.company ?? "",
        },
      }),
    });
    if (!res.ok) {
      console.error("[hubspot.upsertContact] Error:", await res.text());
      return null;
    }
    const data = await res.json();
    return data.id ?? null;
  } catch (err) {
    console.error("[hubspot.upsertContact] Exception:", err);
    return null;
  }
}

// ── Deals ─────────────────────────────────────────────────────────────────────

/** Deal stage IDs — replace with your actual HubSpot pipeline stage IDs if different */
export const DEAL_STAGES = {
  proposalSent:  "appointmentscheduled",  // default HubSpot stage
  closedWon:     "closedwon",
  closedLost:    "closedlost",
} as const;

/** Create a new HubSpot deal, associated with a contact. Returns deal ID. */
export async function createDeal(params: {
  name: string;
  contactId: string;
  amount?: number;
  stage?: string;
}): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/crm/v3/objects/deals`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        properties: {
          dealname: params.name,
          dealstage: params.stage ?? DEAL_STAGES.proposalSent,
          amount: params.amount?.toString() ?? "",
          pipeline: "default",
        },
        associations: [
          {
            to: { id: params.contactId },
            types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("[hubspot.createDeal] Error:", await res.text());
      return null;
    }
    const data = await res.json();
    return data.id ?? null;
  } catch (err) {
    console.error("[hubspot.createDeal] Exception:", err);
    return null;
  }
}

/** Update a deal's stage. */
export async function updateDealStage(dealId: string, stage: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/crm/v3/objects/deals/${dealId}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ properties: { dealstage: stage } }),
    });
    return res.ok;
  } catch (err) {
    console.error("[hubspot.updateDealStage] Exception:", err);
    return false;
  }
}

// ── Files + Notes ─────────────────────────────────────────────────────────────

/** Upload a file buffer to HubSpot Files API. Returns the file ID. */
export async function uploadFile(params: {
  filename: string;
  content: ArrayBuffer;
  mimeType: string;
}): Promise<string | null> {
  try {
    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    if (!token) return null;

    const form = new FormData();
    form.append("file", new Blob([params.content], { type: params.mimeType }), params.filename);
    form.append("folderPath", "/proposals");
    form.append("options", JSON.stringify({ access: "PRIVATE", overwrite: false, duplicateValidationStrategy: "NONE", duplicateValidationScope: "ENTIRE_PORTAL" }));

    const res = await fetch(`${BASE}/files/v3/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      console.error("[hubspot.uploadFile] Error:", await res.text());
      return null;
    }
    const data = await res.json();
    return data.id ?? null;
  } catch (err) {
    console.error("[hubspot.uploadFile] Exception:", err);
    return null;
  }
}

/** Attach a PDF (by public URL) to a deal as a Note engagement. */
export async function attachPdfToDeal(params: {
  dealId: string;
  noteBody: string;
  pdfUrl: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/crm/v3/objects/notes`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        properties: {
          hs_note_body: `${params.noteBody}\n\nPDF: ${params.pdfUrl}`,
          hs_timestamp: new Date().toISOString(),
        },
        associations: [
          {
            to: { id: params.dealId },
            types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 214 }],
          },
        ],
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[hubspot.attachPdfToDeal] Exception:", err);
    return false;
  }
}
