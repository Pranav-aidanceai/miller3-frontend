export interface CompanySearchPayload {
  search_text: string | null;
  state: string[] | null;
  city: string | null;
  county: string | null;
  naics_code: string | null;
  employee_size_min: number | null
  employee_size_max: number | null
  annual_revenue_min: number | null;
  annual_revenue_max: number | null;
  minority_owned: true | null;
  women_owned: true | null;
  veteran_owned: true | null;
  small_business?: true | null;
  hubzone?: true | null;
  eight_a_certified?: true | null;
  has_mobile_number?: true | null;
  has_email?: true | null;
  has_website?: true | null;
  sic_code: string | null;
  msa: string | null;
  certification_status: string | null;
  sort_by: string | null;
  sort_order: 'asc' | 'desc';
  limit: number;
  cursor: string | null;
  year_founded_min: number | null;
  year_founded_max: number | null;
  ownership_type: string[] | null;
  enrichment_status: string | null;
}

export interface ExportPayload {
  format: string,
  row_limit: number,
  search_text: string | null;
  state: string[] | null;
  city: string | null;
  county: string | null;
  naics_code: string | null;
  employee_size_min: number | null
  employee_size_max: number | null
  annual_revenue_min: number | null;
  annual_revenue_max: number | null;
  minority_owned: true | null;
  women_owned: true | null;
  veteran_owned: true | null;
  small_business?: true | null;
  hubzone?: true | null;
  eight_a_certified?: true | null;
  has_mobile_number?: true | null;
  has_email?: true | null;
  has_website?: true | null;
  sic_code: string | null;
  msa: string | null;
  certification_status: string | null;
  sort_by: string | null;
  sort_order: 'asc' | 'desc';
  year_founded_min: number | null;
  year_founded_max: number | null;
  ownership_type: string[] | null;
  enrichment_status: string | null;
}

/** The searchable dropdown filters backed by `/api/<field>-filter`. */
export type FilterField = 'naics' | 'sic' | 'msa' | 'certification';

/**
 * Response of the autocomplete filters. Paging is cursor based. `results` is a
 * `{ code: title }` dict for the coded fields (NAICS/SIC/certification) and a
 * plain list of values for the ones with no separate code (MSA).
 */
export interface CodeFilterResponse {
  field: string;
  query: string;
  results: Record<string, string> | string[];
  next_cursor: string | null;
  prev_cursor: string | null;
  latency_ms: number;
}

export interface Company {
  id: string;
  company_name: string;
  city: string;
  state: string;
  naics_code: string | null;
  sic_code: string | null;
  employee_size: string | null;
  annual_revenue: number | null;
  year_founded: number | null;
  enrichment_status: 'unenriched' | 'enriched' | 'pending';
  phone: string | null;
  email: string | null;
  website: string | null;
  has_mobile_number: boolean;
  has_email: boolean;
  has_website: boolean;
}

/** Response of `POST /api/company-description` — an AI-written company summary. */
export interface CompanyDescriptionResponse {
  company_id: string;
  description: string;
  status: string;
  source: string | null;
  model: string | null;
  prompt_version: string | null;
  generated_at: string | null;
  cached: boolean;
  credits_charged: number;
  crawl_iterations: number;
  pages_crawled: string[];
  elapsed_ms: number;
  /** AI caveat the API wants surfaced alongside the text. */
  disclaimer: string | null;
}

/**
 * Columns a user may propose changes to. The keys mirror the admin edit body;
 * anything outside the caller's role tier is rejected by the API with a 403.
 */
export interface CompanyUpdateChanges {
  company_name?: string;
  city?: string;
  county?: string;
  state?: string;
  zip_code?: string;
  naics_code?: string;
  sic_code?: string;
  employee_size?: string;
  annual_revenue?: number;
  year_founded?: number;
  minority_owned?: boolean;
  women_owned?: boolean;
  veteran_owned?: boolean;
  latitude?: number;
  longitude?: number;
}

/** Body of `POST /api/company-update` — queues an edit for admin review. */
export interface CompanyUpdatePayload {
  company_id: string;
  changes: CompanyUpdateChanges;
  reason?: string;
}

/**
 * Body of `PUT /api/admin/company` — an admin editing a record directly, with
 * the columns flat alongside the id rather than nested under `changes`.
 */
export type AdminCompanyEditPayload = { company_id: string } & CompanyUpdateChanges;

export interface CompanyUpdateResponse {
  request_id: string;
}

export type CompanyUpdateStatus = 'pending' | 'approved' | 'rejected' | 'partially_approved';

export type CompanyFieldAction = 'approve' | 'reject';

/** An admin's verdict on a single proposed field. */
export interface CompanyFieldDecision {
  action: CompanyFieldAction;
  /** Set when the admin approved a value other than the one proposed. */
  value: string | number | boolean | null;
  reason: string | null;
}

/** A row of `GET /api/company-update` — one edit the user proposed. */
export interface CompanyUpdateRequest {
  request_id: string;
  company_id: string;
  company_name: string;
  status: CompanyUpdateStatus;
  submitted_changes: Record<string, unknown>;
  reason: string | null;
  /** The reviewer's overall note. Null until an admin has acted on the request. */
  review_reason: string | null;
  field_decisions: Record<string, CompanyFieldDecision> | null;
  reviewed_at: string | null;
  created_at: string;
  latency_ms: number | null;
}

export interface CompanyUpdateRequestsResponse {
  requests: CompanyUpdateRequest[];
  total: number;
  page: number;
  limit: number;
  latency_ms: number;
}

/**
 * A row of `GET /api/admin/company-request`. The admin view names the proposed
 * columns `requested_changes` and carries who raised them.
 */
export interface AdminCompanyUpdateRequest {
  request_id: string;
  company_id: string;
  company_name: string;
  requested_by: string;
  requested_by_email: string | null;
  requested_changes: Record<string, unknown>;
  reason: string | null;
  status: CompanyUpdateStatus;
  field_decisions: Record<string, CompanyFieldDecision> | null;
  created_at: string;
}

export interface AdminCompanyUpdateRequestsResponse {
  requests: AdminCompanyUpdateRequest[];
  total: number;
  page: number;
  limit: number;
  latency_ms: number;
}

/** A verdict as the review endpoint accepts it — no `value`, unlike the response. */
export interface CompanyFieldReviewDecision {
  action: CompanyFieldAction;
  reason?: string | null;
}

/** Body of `POST /api/admin/company-request` — an admin's ruling on one request. */
export interface CompanyUpdateReviewPayload {
  request_id: string;
  field_decisions: Record<string, CompanyFieldReviewDecision>;
  /** The reviewer's overall note, surfaced to the requester. */
  reason?: string;
}

export interface CompanyData {
  id: string;
  company_id: string;
  company_name: string;
  city: string;
  county: string | null;
  state: string;
  zip_code: string;
  naics_code: string | null;
  sic_code: string | null;
  employee_size: string | null;
  annual_revenue: number | null;
  year_founded: number | null;
  ownership_type: string | null;
  minority_owned: boolean | null;
  women_owned: boolean | null;
  veteran_owned: boolean | null;
  phone: string | null;
  email: string | null;
  emails: string[];
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  enrichment_status: 'unenriched' | 'enriched' | 'pending';
  enrichment_source: string | null;
  last_enriched_at: string | null;
  last_enriched_label: string,
  field_completeness_pct: number | null;
  created_at: string;
  updated_at: string;
  execution_time_ms: number;
  not_accessible: string[];
  msa: string | null;
  address: string | null;
  certification_status: string | null;
  company_description: string | null;
  buckets: string[];
}