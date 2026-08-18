import type { ReactNode } from 'react';
import { Company } from '@/types/search';
import { MaskedCell } from './helper';

export interface CompanyColumn {
    key: string;
    label: string;
    align?: 'left' | 'right' | 'center';
    render: (c: Company, notAccessibleFields: string[]) => ReactNode;
}

/**
 * Columns the user can toggle on/off in the table view, beyond the static
 * Company/Contact ones. Keep this list in sync with `Company` — anything not
 * present on the row has nothing to render.
 */
export const OPTIONAL_COLUMNS: CompanyColumn[] = [
    {
        key: 'naics_code',
        label: 'NAICS',
        render: (c, notAccessibleFields) => (
            <MaskedCell
                fieldKey="naics_code"
                displayValue={c.naics_code}
                mono
                tooltipPlace="right"
                notAccessibleFields={notAccessibleFields}
            />
        ),
    },
    {
        key: 'sic_code',
        label: 'SIC',
        render: (c, notAccessibleFields) => (
            <MaskedCell
                fieldKey="sic_code"
                displayValue={c.sic_code}
                mono
                tooltipPlace="right"
                notAccessibleFields={notAccessibleFields}
            />
        ),
    },
    {
        key: 'employee_size',
        label: 'Employees',
        align: 'right',
        render: (c, notAccessibleFields) => (
            <MaskedCell
                fieldKey="employee_size"
                displayValue={c.employee_size != null ? c.employee_size.toLocaleString() : null}
                align="right"
                tooltipPlace="top"
                notAccessibleFields={notAccessibleFields}
            />
        ),
    },
    {
        key: 'annual_revenue',
        label: 'Revenue',
        align: 'right',
        render: (c, notAccessibleFields) => (
            <MaskedCell
                fieldKey="annual_revenue"
                displayValue={c.annual_revenue != null ? `$${c.annual_revenue.toLocaleString()}` : null}
                align="right"
                tooltipPlace="top"
                notAccessibleFields={notAccessibleFields}
            />
        ),
    },
    {
        key: 'year_founded',
        label: 'Year Founded',
        align: 'right',
        render: (c, notAccessibleFields) => (
            <MaskedCell
                fieldKey="year_founded"
                displayValue={c.year_founded ?? null}
                align="right"
                tooltipPlace="top"
                notAccessibleFields={notAccessibleFields}
            />
        ),
    },
    {
        key: 'county',
        label: 'County',
        render: (c, notAccessibleFields) => (
            <MaskedCell
                fieldKey="county"
                displayValue={c.county}
                tooltipPlace="right"
                notAccessibleFields={notAccessibleFields}
            />
        ),
    },
    {
        key: 'msa',
        label: 'MSA',
        render: (c, notAccessibleFields) => (
            <MaskedCell
                fieldKey="msa"
                displayValue={c.msa}
                tooltipPlace="right"
                notAccessibleFields={notAccessibleFields}
            />
        ),
    },
    {
        key: 'address',
        label: 'Address',
        render: (c, notAccessibleFields) => (
            <MaskedCell
                fieldKey="address"
                displayValue={c.address}
                tooltipPlace="right"
                notAccessibleFields={notAccessibleFields}
            />
        ),
    },
    {
        key: 'certification_status',
        label: 'Certification Status',
        render: (c, notAccessibleFields) => (
            <MaskedCell
                fieldKey="certification_status"
                displayValue={c.certification_status}
                fallback="-"
                tooltipPlace="right"
                notAccessibleFields={notAccessibleFields}
            />
        ),
    },
    {
        key: 'ownership_type',
        label: 'Ownership Type',
        render: (c, notAccessibleFields) => (
            <MaskedCell
                fieldKey="ownership_type"
                displayValue={c.ownership_type}
                fallback="-"
                tooltipPlace="right"
                notAccessibleFields={notAccessibleFields}
            />
        ),
    },
];

/** Matches the columns the table showed before column selection existed. */
export const DEFAULT_VISIBLE_COLUMNS = ['naics_code', 'employee_size', 'annual_revenue'];

/** Name + Contact are static, so this leaves room for 4 more — 6 total. */
export const MAX_TOTAL_COLUMNS = 6;
export const MAX_OPTIONAL_COLUMNS = MAX_TOTAL_COLUMNS - 2;

/** Where the per-browser column choice is cached so it survives a reload. */
export const TABLE_COLUMNS_STORAGE_KEY = 'miller3:table-columns';
