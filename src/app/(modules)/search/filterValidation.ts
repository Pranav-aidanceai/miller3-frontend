import { SearchFilters } from './replayParams';

/** Nothing in the dataset is founded before this, so anything earlier is a typo. */
export const MIN_YEAR = 1700;

/**
 * Keep a field to digits. Used instead of `type="number"`, which still accepts
 * `e`, `+`, `-` and reacts to the scroll wheel.
 */
export function digitsOnly(value: string): string {
    return value.replace(/\D/g, '');
}

/**
 * Keep a field to words. Place and certification names carry separators —
 * `St. Louis`, `Winston-Salem`, `O'Fallon`, `Amsterdam, NY` — so those are
 * allowed through alongside the letters; digits and other symbols are not.
 */
export function lettersOnly(value: string): string {
    return value.replace(/[^A-Za-z\s.'’,-]/g, '');
}

/** Which fields can carry a message. Cross-field errors land on the max of the pair. */
export type FilterErrorKey = 'minYear' | 'maxYear' | 'minEmp' | 'maxEmp' | 'minRev' | 'maxRev';
export type FilterErrors = Partial<Record<FilterErrorKey, string>>;

const asNumber = (value: string): number | null => {
    const trimmed = value.trim();
    return trimmed === '' ? null : Number(trimmed);
};

/**
 * Range and min/max checks for the numeric filters. An empty bound is legal —
 * a one-sided range is a normal search — so only filled-in values are checked.
 */
export function validateFilters(filters: SearchFilters): FilterErrors {
    const errors: FilterErrors = {};
    const thisYear = new Date().getFullYear();

    const minYear = asNumber(filters.minYear);
    const maxYear = asNumber(filters.maxYear);
    const yearRange = `Enter a year between ${MIN_YEAR} and ${thisYear}`;
    if (minYear != null && (minYear < MIN_YEAR || minYear > thisYear)) errors.minYear = yearRange;
    if (maxYear != null && (maxYear < MIN_YEAR || maxYear > thisYear)) errors.maxYear = yearRange;
    if (!errors.minYear && !errors.maxYear && minYear != null && maxYear != null && minYear > maxYear) {
        errors.maxYear = 'Max year must be after min';
    }

    const minEmp = asNumber(filters.minEmp);
    const maxEmp = asNumber(filters.maxEmp);
    if (minEmp != null && maxEmp != null && minEmp > maxEmp) {
        errors.maxEmp = 'Max must be at least min';
    }

    const minRev = asNumber(filters.minRev);
    const maxRev = asNumber(filters.maxRev);
    if (minRev != null && maxRev != null && minRev > maxRev) {
        errors.maxRev = 'Max must be at least min';
    }

    return errors;
}

export function hasFilterErrors(filters: SearchFilters): boolean {
    return Object.keys(validateFilters(filters)).length > 0;
}
