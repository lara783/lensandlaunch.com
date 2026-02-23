export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = "admin" | "client";
export type ProjectStatus = "active" | "paused" | "completed";
export type InvoiceStatus = "pending" | "paid" | "overdue";
export type ProposalStatus = "draft" | "sent" | "accepted" | "declined";
export type EventType = "shoot" | "edit" | "review" | "publish" | "meeting";
export type ServiceType = "photography" | "videography" | "content_strategy" | "retainer";

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  business_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  service_type: ServiceType;
  status: ProjectStatus;
  start_date: string | null;
  created_at: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  project_id: string;
  client_id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: InvoiceStatus;
  line_items: LineItem[];
  notes: string | null;
  created_at: string;
}

export interface Deliverable {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  client_approved: boolean;
  agency_approved: boolean;
  sort_order: number;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  project_id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  type: EventType;
  notes: string | null;
  color: string | null;
}

export interface ProposalSection {
  heading: string;
  body: string;
}

export interface Proposal {
  id: string;
  client_id: string;
  project_id: string | null;
  title: string;
  content: ProposalSection[];
  status: ProposalStatus;
  pdf_url: string | null;
  sent_at: string | null;
  created_at: string;
}

export type DocumentType = "invoice" | "contract" | "other";

export interface Document {
  id: string;
  project_id: string;
  client_id: string;
  name: string;
  description: string | null;
  file_url: string;
  type: DocumentType;
  size_bytes: number | null;
  created_at: string;
}

export interface BrandColor {
  label: string;
  hex: string;
}

export interface BrandFont {
  name: string;
  source: "system" | "upload";
  url?: string;
}

export interface BrandKit {
  id: string;
  client_id: string;
  colors: BrandColor[];
  fonts: BrandFont[];
  logo_url: string | null;
  updated_at: string;
  created_at: string;
}

export interface ClientAsset {
  id: string;
  client_id: string;
  name: string;
  file_url: string;
  asset_type: string;
  size_bytes: number | null;
  created_at: string;
}

// Joined types for convenience
export interface ProjectWithClient extends Project {
  profiles: Profile;
}

export interface DeliverableWithProject extends Deliverable {
  projects: Project;
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "created_at">; Update: Partial<Profile> };
      projects: { Row: Project; Insert: Omit<Project, "id" | "created_at">; Update: Partial<Project> };
      invoices: { Row: Invoice; Insert: Omit<Invoice, "id" | "created_at">; Update: Partial<Invoice> };
      deliverables: { Row: Deliverable; Insert: Omit<Deliverable, "id" | "created_at">; Update: Partial<Deliverable> };
      calendar_events: { Row: CalendarEvent; Insert: Omit<CalendarEvent, "id">; Update: Partial<CalendarEvent> };
      proposals: { Row: Proposal; Insert: Omit<Proposal, "id" | "created_at">; Update: Partial<Proposal> };
    };
  };
};
