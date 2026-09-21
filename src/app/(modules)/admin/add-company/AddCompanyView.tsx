'use client';

import { useState } from 'react';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { Building2, Eraser, Loader2, ChevronDown, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/apiError';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    COMPANY_FIELDS,
    companyFieldSpec,
    companyFieldPayloadValue,
    validateCompanyField,
    type CompanyFieldKey,
    type CompanyFieldSpec,
} from '@/lib/companyFields';
import { CodeAutocomplete } from '@/components/CodeAutocomplete';
import type { CompanyUpdateChanges, FilterField } from '@/types/search';

/** Every value is held as a string; blanks are dropped from the payload. */
type Draft = Record<string, string>;

const EMPTY_DRAFT: Draft = Object.fromEntries(COMPANY_FIELDS.map(f => [f.key, '']));

/** The one column a record cannot be created without. */
const REQUIRED_FIELD: CompanyFieldKey = 'company_name';

// Grouping/order local to this page only — matches the Figma "Add Company"
// reference exactly (fileKey pskj0D4uvWBsvAB5Csxyt4, node 453:16932): 3-up
// rows, Employees moved after Founded, ownership pulled out into its own
// multi-select. The shared COMPANY_FIELD_SECTIONS (used by EditCompanyModal /
// company-requests) is left untouched so this doesn't reorder fields there.
const DETAILS_KEYS: CompanyFieldKey[] = ['company_name', 'naics_code', 'sic_code', 'annual_revenue', 'year_founded', 'employee_size'];
const LOCATION_KEYS: CompanyFieldKey[] = ['city', 'state', 'zip_code', 'county', 'latitude', 'longitude'];

// Codes are picked from the same lookup the search filters use, so an admin
// can type "machine shops" and get 332710 rather than having to know it — and
// the record can't be created with a code the dataset doesn't have.
const CODE_FIELDS: Partial<Record<CompanyFieldKey, FilterField>> = {
    naics_code: 'naics',
    sic_code: 'sic',
};

const OWNERSHIP_OPTIONS: { key: CompanyFieldKey; label: string }[] = [
    { key: 'minority_owned', label: 'Minority Owned' },
    { key: 'women_owned', label: 'Women Owned' },
    { key: 'veteran_owned', label: 'Veteran Owned' },
];

export default function AddCompanyView() {
    const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
    const [submitting, setSubmitting] = useState(false);
    // Errors stay quiet until the admin has tried to submit once.
    const [attempted, setAttempted] = useState(false);
    const [ownershipOpen, setOwnershipOpen] = useState(false);

    const errors = COMPANY_FIELDS
        .map(f => ({ field: f, message: validateCompanyField(f, draft[f.key]) }))
        .filter((e): e is { field: CompanyFieldSpec; message: string } => e.message !== null);
    const errorFor = (key: CompanyFieldKey) => errors.find(e => e.field.key === key)?.message ?? null;

    const nameMissing = draft[REQUIRED_FIELD].trim() === '';
    const filledCount = COMPANY_FIELDS.filter(f => draft[f.key] !== '').length;
    const isDirty = filledCount > 0;

    const setField = (key: CompanyFieldKey, value: string) => setDraft(d => ({ ...d, [key]: value }));

    // The Figma picker only expresses "this ownership applies" (a chip) or
    // "not set" (no chip) — there's no chip state for an explicit "No", so
    // toggling here only ever sets 'true' or clears back to unset.
    const toggleOwnership = (key: CompanyFieldKey) => {
        setDraft(d => ({ ...d, [key]: d[key] === 'true' ? '' : 'true' }));
    };

    const handleClear = () => {
        setDraft(EMPTY_DRAFT);
        setAttempted(false);
    };

    const handleSubmit = async () => {
        setAttempted(true);
        if (nameMissing || errors.length || submitting) return;

        // Blank fields are omitted rather than sent as empty strings, so the
        // record is created with only what the admin actually supplied.
        const payload = COMPANY_FIELDS.reduce<CompanyUpdateChanges>((acc, field) => {
            if (draft[field.key] === '') return acc;
            return { ...acc, [field.key]: companyFieldPayloadValue(field, draft[field.key]) };
        }, {});

        setSubmitting(true);
        try {
            await apiClient.post('/admin/company', payload);
            toast.success(`${draft[REQUIRED_FIELD].trim()} added`);
            handleClear();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to add company'), {
                duration: 5000,
                className: '!bg-destructive !text-white !border-destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (key: CompanyFieldKey) => {
        const field = companyFieldSpec(key);
        if (!field) return null;
        const error = errorFor(key);
        const required = key === REQUIRED_FIELD;
        const showRequired = required && attempted && nameMissing;

        const codeField = CODE_FIELDS[key];
        if (codeField) {
            return (
                <CodeAutocomplete
                    key={key}
                    label={field.label}
                    field={codeField}
                    value={draft[key]}
                    onChange={value => setField(key, value)}
                    placeholder="Code or industry"
                    variant="form"
                    disabled={submitting}
                />
            );
        }

        return (
            <div key={key}>
                <label htmlFor={`field-${key}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                    {field.label}
                    {required && <span className="text-destructive"> *</span>}
                </label>
                <input
                    id={`field-${key}`}
                    type={field.kind === 'number' ? 'number' : 'text'}
                    inputMode={field.kind === 'number' ? 'decimal' : undefined}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={draft[key]}
                    disabled={submitting}
                    placeholder={field.placeholder}
                    onChange={e => setField(key, e.target.value)}
                    className={cn(
                        'h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 disabled:opacity-50',
                        field.mono && 'font-mono',
                        error || showRequired
                            ? 'border-destructive focus:ring-destructive/30'
                            : 'border-input focus:ring-ring'
                    )}
                />
                {(error || showRequired) && (
                    <p className="mt-1 text-xs text-destructive">
                        {error ?? 'A legal name is required to create a company.'}
                    </p>
                )}
            </div>
        );
    };

    const selectedOwnership = OWNERSHIP_OPTIONS.filter(o => draft[o.key] === 'true');

    return (
        <div className="flex flex-col p-6" style={{ height: 'calc(100vh - 3rem)' }}>
            <div className="shrink-0">
                <h1 className="font-heading text-2xl font-bold">Add Company</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Create a company record. Only the legal name is required — anything left blank is simply not set.
                </p>
            </div>

            {/* pr-3 keeps the fields clear of the scrollbar rather than sitting under it. */}
            <div className="mt-5 flex-1 overflow-auto pr-3">
                <div className="max-w-5xl space-y-6">
                    <div>
                        <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Company Details</h2>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {DETAILS_KEYS.map(renderField)}
                        </div>
                    </div>

                    {/* Ownership — a multi-select chip picker, matching Figma's
                        "Select Ownerships" widget, backed by the same three
                        booleans the rest of the app already uses. */}
                    <div>
                        <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Ownership</h2>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Select Ownerships</label>
                        <Popover open={ownershipOpen} onOpenChange={setOwnershipOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    className="flex min-h-10 w-full max-w-md flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1.5 text-left text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 cursor-pointer"
                                >
                                    {selectedOwnership.length === 0 ? (
                                        <span className="px-0.5 text-muted-foreground">Select ownership types</span>
                                    ) : (
                                        selectedOwnership.map(o => (
                                            <span
                                                key={o.key}
                                                className="flex items-center gap-1 rounded-full bg-brand-accent/10 px-2.5 py-1 text-xs font-medium text-brand-accent"
                                            >
                                                {o.label}
                                                <X
                                                    className="h-3 w-3 cursor-pointer"
                                                    onClick={(e) => { e.stopPropagation(); toggleOwnership(o.key); }}
                                                />
                                            </span>
                                        ))
                                    )}
                                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-1" align="start">
                                {OWNERSHIP_OPTIONS.map(o => (
                                    <button
                                        key={o.key}
                                        type="button"
                                        onClick={() => toggleOwnership(o.key)}
                                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                    >
                                        {o.label}
                                        {draft[o.key] === 'true' && <Check className="h-4 w-4 text-primary" />}
                                    </button>
                                ))}
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div>
                        <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Location</h2>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {LOCATION_KEYS.map(renderField)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="shrink-0 mt-4 border-t border-border pt-4 bg-[#FAFAFA]">
                <div className="flex max-w-5xl flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground pl-4">
                        {filledCount === 0
                            ? 'Fill in the legal name to create a company.'
                            : `${filledCount} field${filledCount === 1 ? '' : 's'} filled`}
                    </p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClear}
                            disabled={submitting || !isDirty}
                            className="flex h-10 items-center gap-2 rounded-lg border border-primary px-4 text-sm font-medium text-primary transition-colors cursor-pointer hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Eraser className="h-4 w-4" /> Clear
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting || errors.length > 0}
                            className="flex h-10 min-w-36 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Adding...
                                </>
                            ) : (
                                <>
                                    <Building2 className="h-4 w-4" /> Add Company
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
