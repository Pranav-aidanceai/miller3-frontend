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

    if (filters.has_mobile_number) params.set('has_phone', '1');
    if (filters.has_email) params.set('has_email', '1');
    if (filters.has_website) params.set('has_website', '1');

    return params.toString();
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
        hasPhone: params.get('has_phone') === '1',
        hasEmail: params.get('has_email') === '1',
        hasWebsite: params.get('has_website') === '1',
    };

    const hasAny = JSON.stringify(filters) !== JSON.stringify(emptyFilters);
    return hasAny ? filters : null;
}
