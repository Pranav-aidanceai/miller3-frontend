export interface CompanySearchPayload {
  search_text: string | null;
  state: string[] | null;
  city: string | null;
  county: string | null;
  naics_code: string | null;
  employee_size: number[] | null
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
  sort_by: string | null;
  sort_order: 'asc' | 'desc';
  limit: number;
  cursor: string | null;
  year_founded_min: number | null;
  year_founded_max: number | null;
  ownership_type: string[] | null;
  enrichment_status: string | null;
}

export interface Company {
  id: string;
  company_name: string;
  city: string;
  state: string;
  naics_code: string | null;
  sic_code: string | null;
  employee_size: number | null;
  annual_revenue: number | null;
  year_founded: number | null;
  enrichment_status: 'unenriched' | 'enriched' | 'pending';
  has_mobile_number: boolean;
  has_email: boolean;
  has_website: boolean;
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
  website: string | null;
  enrichment_status: 'unenriched' | 'enriched' | 'pending';
  enrichment_source: string | null;
  last_enriched_at: string | null;
  field_completeness_pct: number | null;
  created_at: string;
  updated_at: string;
  execution_time_ms: number;
  not_accessible: string[];
}