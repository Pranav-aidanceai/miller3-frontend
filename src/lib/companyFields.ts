import type { CompanyUpdateChanges } from '@/types/search';

export type CompanyFieldKey = keyof CompanyUpdateChanges;

export interface CompanyFieldSpec {
    key: CompanyFieldKey;
    label: string;
    kind: 'text' | 'number' | 'boolean';
    /** Bounds the API enforces, mirrored here so the user is told before submitting. */
    min?: number;
    max?: number;
    step?: string;
    placeholder?: string;
    mono?: boolean;
}

export const CURRENT_YEAR = new Date().getFullYear();

/**
 * The columns a user may propose changes to, grouped the way the edit modal
 * lays them out. Shared with the requests list so a proposed change reads with
 * the same label it was entered under.
 */
export const COMPANY_FIELD_SECTIONS: { title: string; fields: CompanyFieldSpec[] }[] = [
    {
        title: 'Firmographics',
        fields: [
            { key: 'company_name', label: 'Legal Name', kind: 'text', placeholder: 'eg: Acme Manufacturing Inc.' },
            { key: 'naics_code', label: 'NAICS', kind: 'text', mono: true, placeholder: 'eg: 332710' },
            { key: 'sic_code', label: 'SIC', kind: 'text', mono: true, placeholder: 'eg: 3599' },
            { key: 'employee_size', label: 'Employees', kind: 'text', placeholder: 'eg: 50-100' },
            { key: 'annual_revenue', label: 'Revenue (USD)', kind: 'number', min: 0, step: '1', placeholder: 'eg: 5000000' },
            { key: 'year_founded', label: 'Founded', kind: 'number', min: 1700, max: CURRENT_YEAR, step: '1', placeholder: 'eg: 1998' },
        ],
    },
    {
        title: 'Ownership',
        fields: [
            { key: 'minority_owned', label: 'Minority Owned', kind: 'boolean' },
            { key: 'women_owned', label: 'Women Owned', kind: 'boolean' },
            { key: 'veteran_owned', label: 'Veteran Owned', kind: 'boolean' },
        ],
    },
    {
        title: 'Location',
        fields: [
            { key: 'city', label: 'City', kind: 'text', placeholder: 'eg: Cleveland' },
            { key: 'state', label: 'State', kind: 'text', placeholder: 'eg: OH' },
            { key: 'zip_code', label: 'Zipcode', kind: 'text', mono: true, placeholder: 'eg: 44113' },
            { key: 'county', label: 'County', kind: 'text', placeholder: 'eg: Cuyahoga' },
            { key: 'latitude', label: 'Latitude', kind: 'number', min: -90, max: 90, step: 'any', mono: true, placeholder: 'eg: 41.4993' },
            { key: 'longitude', label: 'Longitude', kind: 'number', min: -180, max: 180, step: 'any', mono: true, placeholder: 'eg: -81.6944' },
        ],
    },
];

export const COMPANY_FIELDS = COMPANY_FIELD_SECTIONS.flatMap(s => s.fields);

const FIELD_BY_KEY = new Map<string, CompanyFieldSpec>(COMPANY_FIELDS.map(f => [f.key, f]));

export const companyFieldSpec = (key: string) => FIELD_BY_KEY.get(key);

/**
 * Human label for a column name. Anything the API starts returning before this
 * list catches up still reads sensibly rather than showing a raw column name.
 */
export function companyFieldLabel(key: string): string {
    return FIELD_BY_KEY.get(key)?.label ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Render a column's value the way it reads on the record, not as raw JSON. */
export function formatCompanyFieldValue(key: string, value: unknown): string {
    if (value === null || value === undefined || value === '') return 'NA';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (key === 'annual_revenue' && typeof value === 'number') return `$${value.toLocaleString()}`;
    return String(value);
}

/**
 * Check a raw form value against the bounds the API enforces. Empty passes —
 * "did the user fill this in" is a separate question from "is it valid".
 */
export function validateCompanyField(field: CompanyFieldSpec, value: string): string | null {
    if (value === '') return null;
    if (field.kind !== 'number') return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return `${field.label} must be a number.`;
    if (field.min !== undefined && num < field.min) return `${field.label} must be at least ${field.min}.`;
    if (field.max !== undefined && num > field.max) return `${field.label} must be at most ${field.max}.`;
    if (field.step === '1' && !Number.isInteger(num)) return `${field.label} must be a whole number.`;
    return null;
}

/** Turn a form's string value into the type the API expects for that column. */
export function companyFieldPayloadValue(field: CompanyFieldSpec, value: string): string | number | boolean {
    if (field.kind === 'number') return Number(value);
    if (field.kind === 'boolean') return value === 'true';
    return value.trim();
}
