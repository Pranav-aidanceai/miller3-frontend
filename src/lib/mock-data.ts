export type UserRole = 'admin' | 'premium' | 'standard' | 'free';
export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ErrorSource = 'enrichment' | 'ai_search' | 'auth' | 'external_api' | 'system';
export type ErrorStatus = 'open' | 'acknowledged' | 'resolved';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: 'active' | 'disabled';
  avatar?: string;
  createdAt: string;
  lastActive: string;
  searchesToday: number;
  exportsMonth: number;
  enrichmentsMonth: number;
  hasOnboarded: boolean;
}

export interface Company {
  id: string;
  name: string;
  dba: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  county: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  naics_code: string;
  naics_description: string;
  sic_code: string;
  sic_description: string;
  employees: number;
  revenue: number;
  year_founded: number;
  ownership_type: string[];
  demographics: string[];
  last_enriched_at: string;
  enrichment_completeness: number;
  sources: string[];
}

export interface QueryLogEntry {
  id: string;
  userId: string;
  type: 'structured' | 'ai';
  query: string;
  filters?: Record<string, unknown>;
  resultCount: number;
  timestamp: string;
  generatedSql?: string;
}

export interface ExportLogEntry {
  id: string;
  userId: string;
  filename: string;
  format: 'csv' | 'json';
  rowCount: number;
  columns: string[];
  timestamp: string;
  data?: Company[];
}

export interface EnrichmentLogEntry {
  id: string;
  userId: string;
  companyId: string;
  companyName: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  fieldsUpdated: string[];
  oldValues: Record<string, string>;
  newValues: Record<string, string>;
  source: string;
  timestamp: string;
  cost: number;
}

export interface ErrorLogEntry {
  id: string;
  severity: ErrorSeverity;
  source: ErrorSource;
  errorType: string;
  message: string;
  userId?: string;
  timestamp: string;
  status: ErrorStatus;
  stackTrace?: string;
  context?: Record<string, unknown>;
}

export interface QuotaOverride {
  userId: string;
  adminId: string;
  searchQuota?: number;
  exportQuota?: number;
  exportRowCap?: number;
  enrichmentQuota?: number;
  enrichmentCredits?: number;
  expiresAt?: string;
  reason: string;
  timestamp: string;
}

export const ROLE_LIMITS: Record<UserRole, { searches: number; exports: number; exportRows: number; enrichments: number }> = {
  admin: { searches: 999999, exports: 999999, exportRows: 999999, enrichments: 999999 },
  premium: { searches: 500, exports: 50, exportRows: 5000, enrichments: 200 },
  standard: { searches: 100, exports: 10, exportRows: 500, enrichments: 50 },
  free: { searches: 20, exports: 0, exportRows: 0, enrichments: 5 },
};

const states = ['CA','TX','NY','FL','IL','PA','OH','GA','NC','MI','NJ','VA','WA','AZ','MA','TN','IN','MO','MD','WI','CO','MN','SC','AL','LA','KY','OR','OK','CT','UT'];
const cities: Record<string, string[]> = {
  CA: ['Los Angeles','San Francisco','San Diego','San Jose','Sacramento'],
  TX: ['Houston','Dallas','Austin','San Antonio','Fort Worth'],
  NY: ['New York','Buffalo','Rochester','Albany','Syracuse'],
  FL: ['Miami','Orlando','Tampa','Jacksonville','Fort Lauderdale'],
  IL: ['Chicago','Aurora','Naperville','Springfield','Rockford'],
};
const counties: Record<string, string> = {
  'Los Angeles': 'Los Angeles County', 'San Francisco': 'San Francisco County', 'Houston': 'Harris County',
  'Dallas': 'Dallas County', 'New York': 'New York County', 'Chicago': 'Cook County',
  'Miami': 'Miami-Dade County', 'Austin': 'Travis County', 'San Diego': 'San Diego County',
  'Orlando': 'Orange County', 'Tampa': 'Hillsborough County', 'Denver': 'Denver County',
};

const naicsCodes = [
  { code: '236220', desc: 'Commercial and Institutional Building Construction' },
  { code: '541511', desc: 'Custom Computer Programming Services' },
  { code: '621111', desc: 'Offices of Physicians' },
  { code: '484110', desc: 'General Freight Trucking, Local' },
  { code: '722511', desc: 'Full-Service Restaurants' },
  { code: '541330', desc: 'Engineering Services' },
  { code: '238220', desc: 'Plumbing, Heating, and Air-Conditioning Contractors' },
  { code: '541611', desc: 'Administrative Management Consulting Services' },
  { code: '423430', desc: 'Computer Equipment Merchant Wholesalers' },
  { code: '561720', desc: 'Janitorial Services' },
  { code: '524210', desc: 'Insurance Agencies and Brokerages' },
  { code: '531210', desc: 'Offices of Real Estate Agents and Brokers' },
  { code: '621210', desc: 'Offices of Dentists' },
  { code: '541512', desc: 'Computer Systems Design Services' },
  { code: '236118', desc: 'Residential Remodelers' },
  { code: '517311', desc: 'Wired Telecommunications Carriers' },
  { code: '334111', desc: 'Electronic Computer Manufacturing' },
  { code: '325411', desc: 'Medicinal and Botanical Manufacturing' },
  { code: '311812', desc: 'Commercial Bakeries' },
  { code: '332710', desc: 'Machine Shops' },
];

const sicCodes = [
  { code: '1522', desc: 'General Contractors-Residential Buildings' },
  { code: '7371', desc: 'Computer Services-Systems Design' },
  { code: '8011', desc: 'Physicians & Surgeons' },
  { code: '4213', desc: 'Trucking-Except Local' },
  { code: '5812', desc: 'Eating Places' },
  { code: '8711', desc: 'Engineering Services' },
  { code: '1711', desc: 'Plumbing-Heating-Air Conditioning' },
  { code: '7389', desc: 'Services-Misc Business Services' },
  { code: '5045', desc: 'Computers & Peripherals' },
  { code: '7349', desc: 'Services-Misc Business Services' },
];

const companyPrefixes = ['Apex','Meridian','Pinnacle','Summit','Horizon','Vertex','Atlas','Nexus','Prime','Vanguard','Sterling','Pacific','Harbor','Pioneer','CoreTech','Elevate','Quantum','Ironbridge','BlueWave','Cascade','Redwood','Silverline','Nova','Orion','Catalyst','Titanium','Eagle','Granite','Coastal','Metro'];
const companySuffixes = ['Solutions','Partners','Group','Industries','Corp','Services','Technologies','Enterprises','Holdings','Associates','Dynamics','Consulting','Logistics','Systems','Health','Capital','Digital','Innovations','Engineering','Labs'];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uuid(): string { return crypto.randomUUID(); }

function randomDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(randInt(0,23), randInt(0,59));
  return d.toISOString();
}

const ownershipTypes = ['Minority-Owned','Women-Owned','Veteran-Owned','Small Business','HUBZone','8(a) Certified','LGBTQ-Owned','Disabled Veteran-Owned'];

function generateCompany(): Company {
  const state = rand(states);
  const cityList = cities[state] || ['Springfield','Georgetown','Franklin','Madison','Clinton'];
  const city = rand(cityList);
  const county = counties[city] || `${city} County`;
  const naics = rand(naicsCodes);
  const sic = rand(sicCodes);
  const employees = rand([5,12,25,50,75,100,150,250,500,1000,2500,5000]);
  const revenue = employees * randInt(50000, 200000);
  const hasPhone = Math.random() > 0.2;
  const hasEmail = Math.random() > 0.25;
  const hasWebsite = Math.random() > 0.15;
  const ownTypes = Array.from(new Set(Array.from({length: randInt(0,2)}, () => rand(ownershipTypes))));
  const completeness = [hasPhone, hasEmail, hasWebsite].filter(Boolean).length / 3;

  const name = `${rand(companyPrefixes)} ${rand(companySuffixes)}`;

  return {
    id: uuid(),
    name,
    dba: Math.random() > 0.7 ? `${name.split(' ')[0]} ${rand(['Co','Inc','LLC'])}` : '',
    address: `${randInt(100,9999)} ${rand(['Main','Oak','Elm','Park','Market','Commerce','Industrial','Tech'])} ${rand(['St','Ave','Blvd','Dr','Way','Pkwy'])}`,
    city, state, zipcode: String(randInt(10000,99999)), county, country: 'US',
    phone: hasPhone ? `(${randInt(200,999)}) ${randInt(200,999)}-${randInt(1000,9999)}` : '',
    email: hasEmail ? `info@${name.toLowerCase().replace(/\s+/g,'')}.com` : '',
    website: hasWebsite ? `https://www.${name.toLowerCase().replace(/\s+/g,'')}.com` : '',
    naics_code: naics.code, naics_description: naics.desc,
    sic_code: sic.code, sic_description: sic.desc,
    employees, revenue,
    year_founded: randInt(1960, 2023),
    ownership_type: ownTypes,
    demographics: ownTypes,
    last_enriched_at: randomDate(120),
    enrichment_completeness: Math.round(completeness * 100),
    sources: Array.from(new Set(Array.from({length: randInt(1,3)}, () => rand(['Google Places','Web Scrape','Manual','Public Records','SEC Filing'])))),
  };
}

function generateQueryLog(users: User[]): QueryLogEntry[] {
  return Array.from({ length: 25 }, (_) => ({
    id: uuid(),
    userId: rand(users).id,
    type: Math.random() > 0.3 ? 'structured' as const : 'ai' as const,
    query: rand([
      'Healthcare companies in California',
      'Tech startups in Austin',
      'Manufacturing firms with >100 employees',
      'Restaurants in New York',
      'Minority-owned businesses in Texas',
      'Companies with missing contact info',
      'Construction firms in Cook County',
      'Logistics companies in Florida',
    ]),
    resultCount: randInt(5, 150),
    timestamp: randomDate(14),
  }));
}

function generateExportLog(users: User[]): ExportLogEntry[] {
  return Array.from({ length: 20 }, () => ({
    id: uuid(),
    userId: rand(users.filter(u => u.role !== 'free')).id,
    filename: `export_${rand(['healthcare','tech','construction','logistics','restaurants'])}_${randInt(1,99)}.${rand(['csv','json'])}`,
    format: rand<'csv' | 'json'>(['csv', 'json']),
    rowCount: randInt(10, 500),
    columns: ['name','city','state','phone','email','naics_code'],
    timestamp: randomDate(14),
  }));
}

function generateEnrichmentLog(users: User[], companies: Company[]): EnrichmentLogEntry[] {
  return Array.from({ length: 25 }, () => {
    const co = rand(companies);
    const status = rand<EnrichmentLogEntry['status']>(['complete','complete','complete','failed','queued']);
    return {
      id: uuid(), userId: rand(users).id, companyId: co.id, companyName: co.name,
      status,
      fieldsUpdated: status === 'complete' ? rand([['phone'],['email'],['phone','email'],['website'],['phone','email','website']]) : [],
      oldValues: {}, newValues: {},
      source: rand(['Google Places','Web Scrape','Public Records']),
      timestamp: randomDate(14),
      cost: 0.003,
    };
  });
}

function generateErrorLog(users: User[]): ErrorLogEntry[] {
  const types = [
    { severity: 'critical' as const, source: 'enrichment' as const, errorType: 'enrichment_failure', message: 'Failed to enrich company: Google Places API timeout after 30s' },
    { severity: 'high' as const, source: 'ai_search' as const, errorType: 'ai_search_failure', message: 'LLM failed to generate valid SQL for query' },
    { severity: 'high' as const, source: 'external_api' as const, errorType: 'serper_rate_limit', message: 'Serper API rate limit exceeded (429)' },
    { severity: 'medium' as const, source: 'auth' as const, errorType: 'auth_failure', message: 'Failed login attempt from unknown IP' },
    { severity: 'low' as const, source: 'system' as const, errorType: 'llm_timeout', message: 'LLM response timeout after 60s' },
    { severity: 'critical' as const, source: 'external_api' as const, errorType: 'serper_rate_limit', message: 'Serper credit balance critically low (< 100 credits)' },
    { severity: 'medium' as const, source: 'enrichment' as const, errorType: 'enrichment_failure', message: 'Web scrape blocked by Cloudflare (403)' },
    { severity: 'high' as const, source: 'system' as const, errorType: 'llm_timeout', message: 'Database connection pool exhausted' },
    { severity: 'low' as const, source: 'auth' as const, errorType: 'auth_failure', message: 'Session expired for user during active enrichment' },
    { severity: 'medium' as const, source: 'ai_search' as const, errorType: 'ai_search_failure', message: 'Generated SQL contained unsupported JOIN operation' },
  ];
  return Array.from({ length: 30 }, () => {
    const t = rand(types);
    return {
      id: uuid(), ...t,
      userId: Math.random() > 0.3 ? rand(users).id : undefined,
      timestamp: randomDate(14),
      status: rand<ErrorStatus>(['open','open','open','acknowledged','resolved']),
      stackTrace: `Error: ${t.message}\n    at EnrichmentService.process (enrichment.ts:142)\n    at async Router.handle (router.ts:89)\n    at async Server.handleRequest (server.ts:45)`,
      context: { requestId: uuid().slice(0,8), endpoint: '/api/enrich' },
    };
  });
}

export function generateSeedData() {
  const users: User[] = [
    { id: 'u1', name: 'Alex Morgan', email: 'admin@miller3.demo', password: 'admin123', role: 'admin', status: 'active', createdAt: '2024-01-15T00:00:00Z', lastActive: new Date().toISOString(), searchesToday: 12, exportsMonth: 8, enrichmentsMonth: 45, hasOnboarded: true },
    { id: 'u2', name: 'Sarah Chen', email: 'premium@miller3.demo', password: 'premium123', role: 'premium', status: 'active', createdAt: '2024-02-01T00:00:00Z', lastActive: randomDate(1), searchesToday: 34, exportsMonth: 15, enrichmentsMonth: 22, hasOnboarded: true },
    { id: 'u3', name: 'James Wilson', email: 'standard@miller3.demo', password: 'standard123', role: 'standard', status: 'active', createdAt: '2024-03-10T00:00:00Z', lastActive: randomDate(2), searchesToday: 8, exportsMonth: 3, enrichmentsMonth: 10, hasOnboarded: true },
    { id: 'u4', name: 'Emily Davis', email: 'free@miller3.demo', password: 'free123', role: 'free', status: 'active', createdAt: '2024-04-01T00:00:00Z', lastActive: randomDate(3), searchesToday: 5, exportsMonth: 0, enrichmentsMonth: 1, hasOnboarded: false },
  ];

  const companies = Array.from({ length: 200 }, (_) => generateCompany());
  const queryLog = generateQueryLog(users);
  const exportLog = generateExportLog(users);
  const enrichmentLog = generateEnrichmentLog(users, companies);
  const errorLog = generateErrorLog(users);

  return { users, companies, queryLog, exportLog, enrichmentLog, errorLog, quotaOverrides: [] as QuotaOverride[] };
}

export const AI_SEARCH_PROMPTS: Record<string, { sql: string; filterFn: (c: Company) => boolean }> = {
  'healthcare companies in california': {
    sql: "SELECT * FROM companies WHERE naics_code LIKE '621%' AND state = 'CA'",
    filterFn: c => c.naics_code.startsWith('621') && c.state === 'CA',
  },
  'minority-owned logistics firms in texas': {
    sql: "SELECT * FROM companies WHERE naics_code LIKE '484%' AND state = 'TX' AND demographics @> '{Minority-Owned}'",
    filterFn: c => c.naics_code.startsWith('484') && c.state === 'TX' && c.ownership_type.includes('Minority-Owned'),
  },
  'tech startups founded after 2020': {
    sql: "SELECT * FROM companies WHERE naics_code LIKE '541%' AND year_founded > 2020",
    filterFn: c => c.naics_code.startsWith('541') && c.year_founded > 2020,
  },
  'manufacturing companies with revenue over 10 million': {
    sql: "SELECT * FROM companies WHERE naics_code LIKE '33%' AND revenue > 10000000",
    filterFn: c => c.naics_code.startsWith('33') && c.revenue > 10000000,
  },
  'construction firms in cook county': {
    sql: "SELECT * FROM companies WHERE naics_code LIKE '236%' AND county = 'Cook County'",
    filterFn: c => c.naics_code.startsWith('236') && c.county === 'Cook County',
  },
  'restaurants in new york': {
    sql: "SELECT * FROM companies WHERE naics_code LIKE '722%' AND state = 'NY'",
    filterFn: c => c.naics_code.startsWith('722') && c.state === 'NY',
  },
  'companies with 50 or more employees': {
    sql: "SELECT * FROM companies WHERE employees >= 50",
    filterFn: c => c.employees >= 50,
  },
  'women-owned businesses': {
    sql: "SELECT * FROM companies WHERE demographics @> '{Women-Owned}'",
    filterFn: c => c.ownership_type.includes('Women-Owned'),
  },
  'companies with missing contact info': {
    sql: "SELECT * FROM companies WHERE phone = '' OR email = '' OR website = ''",
    filterFn: c => !c.phone || !c.email || !c.website,
  },
  'engineering services in california': {
    sql: "SELECT * FROM companies WHERE naics_code = '541330' AND state = 'CA'",
    filterFn: c => c.naics_code === '541330' && c.state === 'CA',
  },
  'small businesses in florida': {
    sql: "SELECT * FROM companies WHERE demographics @> '{Small Business}' AND state = 'FL'",
    filterFn: c => c.ownership_type.includes('Small Business') && c.state === 'FL',
  },
  'veteran-owned companies': {
    sql: "SELECT * FROM companies WHERE demographics @> '{Veteran-Owned}'",
    filterFn: c => c.ownership_type.includes('Veteran-Owned'),
  },
};
