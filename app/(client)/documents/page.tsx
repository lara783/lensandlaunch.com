import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { redirect } from "next/navigation";
import { FileDown, FileText, FileCheck } from "lucide-react";
import type { Document } from "@/lib/supabase/types";

const typeLabel: Record<string, string> = {
  invoice: "Invoices",
  contract: "Contracts",
  other: "Other Files",
};

const typeIcon: Record<string, React.ReactNode> = {
  invoice: <FileText size={16} />,
  contract: <FileCheck size={16} />,
  other: <FileDown size={16} />,
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: documents } = await (supabase as any)
    .from("documents")
    .select("*")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const grouped = (["invoice", "contract", "other"] as const).reduce((acc, type) => {
    acc[type] = (documents ?? []).filter((d: Document) => d.type === type);
    return acc;
  }, {} as Record<string, Document[]>);

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Documents" subtitle="Files shared with you by Lens & Launch." />
      <div className="mt-8 space-y-8">
        {(["invoice", "contract", "other"] as const).map((type) => {
          const docs = grouped[type];
          if (docs.length === 0) return null;
          return (
            <section key={type}>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ color: "var(--ll-taupe)" }}>{typeIcon[type]}</span>
                <h2
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
                >
                  {typeLabel[type]}
                </h2>
              </div>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-5 py-4 rounded-2xl transition-all group"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      textDecoration: "none",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span style={{ color: "var(--ll-taupe)", flexShrink: 0 }}>
                        <FileDown size={18} />
                      </span>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
                        >
                          {doc.name}
                        </p>
                        {doc.description && (
                          <p
                            className="text-xs mt-0.5 truncate"
                            style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
                          >
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      {doc.size_bytes && (
                        <span className="text-xs hidden sm:block" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                          {formatBytes(doc.size_bytes)}
                        </span>
                      )}
                      <span
                        className="text-xs"
                        style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
                      >
                        {new Date(doc.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span
                        className="text-xs px-3 py-1 rounded-full font-semibold group-hover:opacity-80 transition-opacity"
                        style={{ background: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
                      >
                        Download
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          );
        })}

        {(!documents || documents.length === 0) && (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <FolderEmpty />
            <p className="mt-4 text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              No documents yet. Files shared by your team will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FolderEmpty() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 10C6 7.8 7.8 6 10 6H20L26 12H38C40.2 12 42 13.8 42 16V38C42 40.2 40.2 42 38 42H10C7.8 42 6 40.2 6 38V10Z" fill="var(--secondary)" stroke="var(--border)" strokeWidth="1.5"/>
    </svg>
  );
}
