'use client';

import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Building2, Eraser, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/apiError';
import {
    COMPANY_FIELDS,
    COMPANY_FIELD_SECTIONS,
    companyFieldPayloadValue,
    validateCompanyField,
    type CompanyFieldKey,
    type CompanyFieldSpec,
} from '@/lib/companyFields';
import type { CompanyUpdateChanges } from '@/types/search';

/** Every value is held as a string; blanks are dropped from the payload. */
type Draft = Record<string, string>;

const EMPTY_DRAFT: Draft = Object.fromEntries(COMPANY_FIELDS.map(f => [f.key, '']));

/** The one column a record cannot be created without. */
const REQUIRED_FIELD: CompanyFieldKey = 'company_name';

export default function AddCompanyPage() {
    const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
    const [submitting, setSubmitting] = useState(false);
    // Errors stay quiet until the admin has tried to submit once.
    const [attempted, setAttempted] = useState(false);

    const errors = COMPANY_FIELDS
        .map(f => ({ field: f, message: validateCompanyField(f, draft[f.key]) }))
        .filter((e): e is { field: CompanyFieldSpec; message: string } => e.message !== null);
    const errorFor = (key: CompanyFieldKey) => errors.find(e => e.field.key === key)?.message ?? null;

    const nameMissing = draft[REQUIRED_FIELD].trim() === '';
    const filledCount = COMPANY_FIELDS.filter(f => draft[f.key] !== '').length;
    const isDirty = filledCount > 0;

    const setField = (key: CompanyFieldKey, value: string) => setDraft(d => ({ ...d, [key]: value }));

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
            await axios.post('/api/admin/company', payload);
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

    return (
        <div className="flex flex-col p-5" style={{ height: 'calc(100vh - 3rem)' }}>
            <div className="shrink-0">
                <h1 className="text-2xl font-bold">Add Company</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Create a company record. Only the legal name is required — anything left blank is simply not set.
                </p>
            </div>

            {/* pr-3 keeps the fields clear of the scrollbar rather than sitting under it. */}
            <div className="mt-4 flex-1 overflow-auto pr-3">
                <div className="max-w-4xl space-y-6">
                    {COMPANY_FIELD_SECTIONS.map(section => (
                        <div key={section.title}>
                            <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">{section.title}</h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {section.fields.map(field => {
                                    const error = errorFor(field.key);
                                    const required = field.key === REQUIRED_FIELD;
                                    const showRequired = required && attempted && nameMissing;

                                    return (
                                        <div key={field.key}>
                                            <label
                                                htmlFor={`field-${field.key}`}
                                                className="mb-1 block text-xs font-medium text-muted-foreground"
                                            >
                                                {field.label}
                                                {required && <span className="text-destructive"> *</span>}
                                            </label>

                                            {field.kind === 'boolean' ? (
                                                <select
                                                    id={`field-${field.key}`}
                                                    value={draft[field.key]}
                                                    disabled={submitting}
                                                    onChange={e => setField(field.key, e.target.value)}
                                                    className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-ring disabled:opacity-50"
                                                >
                                                    <option value="">Not specified</option>
                                                    <option value="true">Yes</option>
                                                    <option value="false">No</option>
                                                </select>
                                            ) : (
                                                <input
                                                    id={`field-${field.key}`}
                                                    type={field.kind === 'number' ? 'number' : 'text'}
                                                    inputMode={field.kind === 'number' ? 'decimal' : undefined}
                                                    min={field.min}
                                                    max={field.max}
                                                    step={field.step}
                                                    value={draft[field.key]}
                                                    disabled={submitting}
                                                    placeholder={field.placeholder}
                                                    onChange={e => setField(field.key, e.target.value)}
                                                    className={cn(
                                                        'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 disabled:opacity-50',
                                                        field.mono && 'font-mono',
                                                        error || showRequired
                                                            ? 'border-destructive focus:ring-destructive/30'
                                                            : 'border-input focus:ring-ring'
                                                    )}
                                                />
                                            )}

                                            {(error || showRequired) && (
                                                <p className="mt-1 text-xs text-destructive">
                                                    {error ?? 'A legal name is required to create a company.'}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="shrink-0 mt-4 border-t border-border pt-4">
                <div className="flex max-w-4xl flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        {filledCount === 0
                            ? 'Fill in the legal name to create a company.'
                            : `${filledCount} field${filledCount === 1 ? '' : 's'} filled`}
                    </p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClear}
                            disabled={submitting || !isDirty}
                            className="flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition-colors cursor-pointer hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
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
                                    <Building2 className="h-4 w-4" /> Add company
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
