export interface SearchFilters {
    /** Free-text company-name search — applied together with the rest. */
    searchText: string;
    stateFilter: string[];
    cityFilter: string;
    countyFilter: string;
    naicsFilter: string;
    sicFilter: string;
    msaFilter: string;
    certificationFilter: string;
    minYear: string;
    maxYear: string;
    minEmp: string;
    maxEmp: string;
    minRev: string;
    maxRev: string;
    demoFilter: string[];
    /** How the checked ownership flags combine — `AND` (default) or `OR`. */
    ownershipMatch: 'AND' | 'OR';
    hasPhone: boolean;
    hasEmail: boolean;
    hasWebsite: boolean;
}

export const emptyFilters: SearchFilters = {
    searchText: '',
    stateFilter: [],
    cityFilter: '',
    countyFilter: '',
    naicsFilter: '',
    sicFilter: '',
    msaFilter: '',
    certificationFilter: '',
    minYear: '',
    maxYear: '',
    minEmp: '',
    maxEmp: '',
    minRev: '',
    maxRev: '',
    demoFilter: [],
    ownershipMatch: 'AND',
    hasPhone: false,
    hasEmail: false,
    hasWebsite: false,
};

/** A numeric range as the backend returns it. Either bound may be absent. */
interface Range {
    min?: number | null;
    max?: number | null;
}

export interface StructuredFilters {
    /** The company-name box's text — the `q` param on the search page. */
    search_text?: string | null;
    city?: string[] | null;
    state?: string[] | null;
    county?: string[] | null;
    naics_code?: string[] | null;
    sic_code?: string[] | null;
    msa?: string[] | null;
    certification_status?: string[] | null;
    has_email?: boolean | null;
    has_website?: boolean | null;
    has_mobile_number?: boolean | null;
    minority_owned?: boolean | null;
    women_owned?: boolean | null;
    veteran_owned?: boolean | null;
    ownership_match?: 'AND' | 'OR' | null;
    year_founded?: Range | null;
    annual_revenue?: Range | null;
    employee_size_range?: Range | null;
}

// Demographic flags are stored as booleans by the backend but as checkbox
// labels by the filter sidebar.
const DEMO_LABELS = {
    minority_owned: 'Minority-Owned',
    women_owned: 'Women-Owned',
    veteran_owned: 'Veteran-Owned',
} as const;

/**
 * Serialize a history entry's `filters_applied` into URL params the search
 * page can rehydrate. Empty/absent filters are omitted so the URL stays short.
 */
export function structuredFiltersToQuery(filters: StructuredFilters): string {
    const params = new URLSearchParams();

    // `search_text` is the plain company-name box, and on its own it's enough
    // to replay an entry — leaving it out made text-only searches look
    // unreplayable.
    const searchText = filters.search_text?.trim();
    if (searchText) params.set('q', searchText);

    (filters.state ?? []).forEach(s => params.append('state', s));
    if (filters.city?.[0]) params.set('city', filters.city[0]);
    if (filters.county?.[0]) params.set('county', filters.county[0]);
    if (filters.naics_code?.[0]) params.set('naics', filters.naics_code[0]);
    if (filters.sic_code?.[0]) params.set('sic', filters.sic_code[0]);
    if (filters.msa?.[0]) params.set('msa', filters.msa[0]);
    if (filters.certification_status?.[0]) params.set('certification', filters.certification_status[0]);

    if (filters.year_founded?.min != null) params.set('min_year', String(filters.year_founded.min));
    if (filters.year_founded?.max != null) params.set('max_year', String(filters.year_founded.max));
    if (filters.employee_size_range?.min != null) params.set('min_emp', String(filters.employee_size_range.min));
    if (filters.employee_size_range?.max != null) params.set('max_emp', String(filters.employee_size_range.max));
    if (filters.annual_revenue?.min != null) params.set('min_rev', String(filters.annual_revenue.min));
    if (filters.annual_revenue?.max != null) params.set('max_rev', String(filters.annual_revenue.max));

    (Object.keys(DEMO_LABELS) as (keyof typeof DEMO_LABELS)[]).forEach(key => {
        if (filters[key]) params.append('demo', DEMO_LABELS[key]);
    });

    // Only worth carrying when it differs from the backend's default.
    if (filters.ownership_match === 'OR') params.set('ownership_match', 'OR');

    if (filters.has_mobile_number) params.set('has_phone', '1');
    if (filters.has_email) params.set('has_email', '1');
    if (filters.has_website) params.set('has_website', '1');

    return params.toString();
}

/**
 * A human-readable summary of a structured history entry — every filter that
 * was applied, e.g. "NAICS : 423450 · State : GA, IL, IN, KY, NJ +8 more ·
 * Founded : 2000 – 2002 · Ownership : Minority-Owned · Has : Phone, Email,
 * Website". Structured searches carry no `raw_input` worth showing (only AI
 * searches do), so this is what titles the row. Falls back to a plain
 * description when nothing recognizable was applied.
 */
export function describeStructuredFilters(filters: StructuredFilters | null | undefined, raw_input: string | null): string {
    if (!filters) return raw_input ?? 'Search';

    // Every value of a list filter, not just the first — a four-state search
    // that reads "State : UT" looks like it lost three of them. Long lists are
    // capped so one filter can't crowd the others out of the title.
    const MAX_SHOWN = 5;
    const list = (values?: string[] | null) => {
        const items = (values ?? []).filter(Boolean);
        if (items.length === 0) return null;
        if (items.length <= MAX_SHOWN) return items.join(', ');
        return `${items.slice(0, MAX_SHOWN).join(', ')} +${items.length - MAX_SHOWN} more`;
    };

    // Either bound may stand on its own, so a range reads as "10 – 50", "10+"
    // or "up to 50".
    const range = (bounds: Range | null | undefined, format: (n: number) => string) => {
        if (bounds?.min != null && bounds.max != null) return `${format(bounds.min)} – ${format(bounds.max)}`;
        if (bounds?.min != null) return `${format(bounds.min)}+`;
        if (bounds?.max != null) return `up to ${format(bounds.max)}`;
        return null;
    };
    const year = (n: number) => String(n); // a year takes no thousands separator
    // Pinned to en-US so grouping doesn't shift with the viewer's locale.
    const grouped = (n: number) => n.toLocaleString('en-US');

    const owned = (Object.keys(DEMO_LABELS) as (keyof typeof DEMO_LABELS)[])
        .filter(key => filters[key])
        .map(key => DEMO_LABELS[key]);
    const contact = [
        filters.has_mobile_number ? 'Phone' : null,
        filters.has_email ? 'Email' : null,
        filters.has_website ? 'Website' : null,
    ].filter((label): label is string => !!label);

    // Ordered as a user is most likely to have searched — what they typed, then
    // industry, then place, then the numeric and flag filters.
    const parts: [string, string | null][] = [
        ['Search', filters.search_text?.trim() || null],
        ['NAICS', list(filters.naics_code)],
        ['SIC', list(filters.sic_code)],
        ['City', list(filters.city)],
        ['County', list(filters.county)],
        ['State', list(filters.state)],
        ['MSA', list(filters.msa)],
        ['Certification', list(filters.certification_status)],
        ['Employees', range(filters.employee_size_range, grouped)],
        ['Revenue', range(filters.annual_revenue, grouped)],
        ['Founded', range(filters.year_founded, year)],
        // `ownership_match` is how the checked flags combined, so it belongs in
        // the summary — "Minority-Owned or Women-Owned" is a different search
        // from "Minority-Owned, Women-Owned".
        ['Ownership', owned.length > 0 ? owned.join(filters.ownership_match === 'OR' ? ' or ' : ', ') : null],
        ['Has', contact.length > 0 ? contact.join(', ') : null],
    ];

    const summary = parts
        .filter(([, value]) => !!value)
        .map(([label, value]) => `${label} : ${value}`)
        .join(' · ');

    return summary || raw_input || 'Search';
}

/**
 * Rebuild filter state from URL params. Returns null when the URL carries no
 * replay params at all, so callers can fall back to their own persisted state.
 */
export function filtersFromQuery(search: string): SearchFilters | null {
    const params = new URLSearchParams(search);
    const digits = (key: string) => (params.get(key) ?? '').replace(/[^0-9]/g, '');

    const filters: SearchFilters = {
        searchText: params.get('q') ?? '',
        stateFilter: params.getAll('state'),
        cityFilter: params.get('city') ?? '',
        countyFilter: params.get('county') ?? '',
        naicsFilter: params.get('naics') ?? '',
        sicFilter: params.get('sic') ?? '',
        msaFilter: params.get('msa') ?? '',
        certificationFilter: params.get('certification') ?? '',
        minYear: digits('min_year'),
        maxYear: digits('max_year'),
        minEmp: digits('min_emp'),
        maxEmp: digits('max_emp'),
        minRev: digits('min_rev'),
        maxRev: digits('max_rev'),
        demoFilter: params.getAll('demo').filter(d => (Object.values(DEMO_LABELS) as string[]).includes(d)),
        ownershipMatch: params.get('ownership_match') === 'OR' ? 'OR' : 'AND',
        hasPhone: params.get('has_phone') === '1',
        hasEmail: params.get('has_email') === '1',
        hasWebsite: params.get('has_website') === '1',
    };

    const hasAny = JSON.stringify(filters) !== JSON.stringify(emptyFilters);
    return hasAny ? filters : null;
}
