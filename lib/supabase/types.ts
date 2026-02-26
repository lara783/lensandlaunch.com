export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = "admin" | "client" | "team";
export type ProjectStatus = "active" | "paused" | "completed";
export type InvoiceStatus = "pending" | "paid" | "overdue";
export type ProposalStatus = "draft" | "sent" | "accepted" | "declined";
export type EventType = "shoot" | "edit" | "review" | "publish" | "meeting" | "report";
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
  shoot_location: string | null;
  call_time: string | null;
  access_notes: string | null;
  mood_board_url: string | null;
  internal_brief: string | null;
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
  payment_type: string | null;
  line_items: LineItem[];
  notes: string | null;
  created_at: string;
}

export type DeliverableCategory = "carousel" | "static_post" | "infographic" | "video" | "short_form_reel";

export interface Deliverable {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  client_approved: boolean;
  agency_approved: boolean;
  sort_order: number;
  content_url: string | null;
  category: DeliverableCategory | null;
  tags: string[];
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

export interface PricingTier {
  name: string;
  price: number;
  period: string;   // "month" | "project" | "one-off" | ""
  tagline: string;
  highlighted: boolean;
}

export interface ScopeItem {
  feature: string;
  essential: string; // "" = not included, "✓" = included, or a quantity like "2x"
  growth: string;
  premium: string;
}

export interface TimelineStep {
  step: number;
  title: string;
  description: string;
}

export interface ProposalSection {
  heading: string;
  body: string;
  tiers?: PricingTier[];
  scopeItems?: ScopeItem[];
  timelineSteps?: TimelineStep[];
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
  voice_tone: string | null;
  voice_audience: string | null;
  voice_messaging: string | null;
  voice_words_use: string | null;
  voice_words_avoid: string | null;
  voice_tagline: string | null;
  updated_at: string;
  created_at: string;
}

export type MeetingType = "creative_direction" | "strategy" | "review" | "kickoff" | "analytics" | "other";
export type AnalyticsPlatform = "facebook" | "instagram" | "tiktok";

export interface MeetingLog {
  id: string;
  client_id: string;
  project_id: string | null;
  calendar_event_id: string | null;
  title: string;
  held_at: string;
  meeting_type: MeetingType;
  attendees: string | null;
  notes: string | null;
  content_planned: string | null;
  action_items: string | null;
  created_at: string;
}

export interface ContentAnalytics {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  platform: AnalyticsPlatform;
  reach: number | null;
  impressions: number | null;
  engagement_rate: number | null;
  new_followers: number | null;
  total_followers: number | null;
  top_post_url: string | null;
  top_post_reach: number | null;
  notes: string | null;
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

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  active: boolean;
  sort_order: number;
  profile_id: string | null;
  created_at: string;
}

export interface ProjectTeamAssignment {
  id: string;
  project_id: string;
  team_member_id: string;
  role_on_project: string | null;
  team_notes: string | null;
  created_at: string;
}

export interface TeamMemberWithRole extends TeamMember {
  role_on_project: string | null;
}

export type VideoReviewStatus = "pending" | "approved" | "changes_requested";

export interface VideoAnnotation {
  id: string;
  timestamp_seconds: number;
  shape: "circle" | "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  note: string;
  created_by: string;
  created_at: string;
}

export interface DeliverableReview {
  id: string;
  deliverable_id: string;
  video_url: string;
  annotations: VideoAnnotation[];
  status: VideoReviewStatus;
  reviewer_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export type MonthlyReportStatus = "pending" | "generating" | "done" | "failed";

export interface MonthlyReport {
  id: string;
  client_id: string;
  project_id: string;
  calendar_event_id: string | null;
  report_period_start: string;
  report_period_end: string;
  pdf_url: string | null;
  generated_at: string | null;
  status: MonthlyReportStatus;
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
