'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Info, Loader2, Save, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSessionExpiring } from '@/lib/session';
import { useAppSelector } from '@/store/hooks';
import { CompanyData, CompanyUpdateChanges } from '@/types/search';
import { ApiErrorResponse } from '@/types/common';
import {
    COMPANY_FIELDS,
    COMPANY_FIELD_SECTIONS,
    companyFieldPayloadValue,
    formatCompanyFieldValue,
    validateCompanyField,
    type CompanyFieldKey,
    type CompanyFieldSpec,
} from '@/lib/companyFields';
import { requestCompanyUpdateAction, updateCompanyRecordAction } from './searchServices';

/** Every draft value is held as a string so the diff against the original is a plain comparison. */
type Draft = Record<string, string>;

function toDraftValue(field: CompanyFieldSpec, company: CompanyData | null): string {
    const raw = company?.[field.key as keyof CompanyData];
    if (raw === null || raw === undefined || raw === '') return '';
    if (field.kind === 'boolean') return raw ? 'true' : 'false';
    return String(raw);
}

function buildDraft(company: CompanyData | null): Draft {
    return Object.fromEntries(COMPANY_FIELDS.map(f => [f.key, toDraftValue(f, company)]));
}

export default function EditCompanyModal({
    company,
    onClose,
    onSaved,
}: {
    company: CompanyData;
    onClose: () => void;
    /** Fired only when an admin's edit was applied, so the drawer can refetch. */
    onSaved?: () => void;
}) {
    // Admins write straight to the record; everyone else raises a review request.
    const isAdmin = useAppSelector(state => state.auth.role) === 'ADMIN';
    const original = buildDraft(company);
    const [draft, setDraft] = useState<Draft>(original);
    const [reason, setReason] = useState('');
    // The reviewer needs a justification, so the empty state is only called out
    // once the user has actually been in the box (or tried to submit).
    const [reasonTouched, setReasonTouched] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const isLocked = (key: CompanyFieldKey) => company.not_accessible?.includes(key) ?? false;

    // A locked column would be rejected with a 403, so it never counts as a change.
    const editable = COMPANY_FIELDS.filter(f => !isLocked(f.key));
    const changedFields = editable.filter(f => draft[f.key] !== '' && draft[f.key] !== original[f.key]);
    const errors = editable
        .map(f => ({ field: f, message: validateCompanyField(f, draft[f.key]) }))
        .filter((e): e is { field: CompanyFieldSpec; message: string } => e.message !== null);
    const errorFor = (key: CompanyFieldKey) => errors.find(e => e.field.key === key)?.message ?? null;
    // Only a review request carries a justification; an admin's edit has no reviewer.
    const reasonMissing = !isAdmin && reason.trim() === '';
    // Flagged once the box has been visited, or as soon as there is a change
    // waiting on it — before that a red box would be nagging about nothing.
    const showReasonError = reasonMissing && (reasonTouched || changedFields.length > 0);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !submitting) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, submitting]);

    const handleSubmit = async () => {
        if (!changedFields.length || errors.length || reasonMissing) return;

        const changes = changedFields.reduce<CompanyUpdateChanges>((acc, field) => {
            return {
                ...acc,
                [field.key]: companyFieldPayloadValue(field, draft[field.key]),
            };
        }, {});

        setSubmitting(true);
        const { data, error } = isAdmin
            ? await updateCompanyRecordAction({ company_id: company.company_id, ...changes })
            : await requestCompanyUpdateAction({
                company_id: company.company_id,
                changes,
                reason: reason.trim(),
            });
        setSubmitting(false);

        if (error || !data) {
            if (!isSessionExpiring()) {
                toast.error(
                    (error as ApiErrorResponse)?.detail ||
                    (isAdmin ? 'Failed to update company' : 'Failed to submit update request'),
                    {
                        duration: 5000,
                        className: '!bg-destructive !text-white !border-destructive',
                    }
                );
            }
            return;
        }

        const fieldCount = `${changedFields.length} field${changedFields.length === 1 ? '' : 's'}`;
        if (isAdmin) {
            toast.success(`Company updated — ${fieldCount} changed`);
            onSaved?.();
        } else {
            toast.success(`Update request submitted for review — ${fieldCount} proposed`);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && onClose()} />

            <div className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="shrink-0 border-b border-border px-6 py-5 pr-14">
                    <h2 className="text-xl font-semibold">Edit Company Details</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {isAdmin ? 'Editing ' : 'Propose changes to '}
                        <span className="font-medium text-foreground">{company.company_name}</span>.
                        {isAdmin
                            ? ' Your changes are applied to the record immediately.'
                            : ' Your edits are sent to an admin for review before they go live.'}
                    </p>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        aria-label="Close"
                        className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Fields */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="mb-4 hidden grid-cols-[1fr_auto_1fr] items-center gap-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
                        <span>Current value</span>
                        <span className="w-4" />
                        <span>New value</span>
                    </div>

                    <div className="space-y-6">
                        {COMPANY_FIELD_SECTIONS.map(section => (
                            <div key={section.title}>
                                <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">{section.title}</h3>
                                <div className="space-y-2">
                                    {section.fields.map(field => {
                                        const locked = isLocked(field.key);
                                        const error = errorFor(field.key);
                                        const changed = !locked && draft[field.key] !== '' && draft[field.key] !== original[field.key];

                                        return (
                                            <div
                                                key={field.key}
                                                className={cn(
                                                    'rounded-lg border px-3 py-2.5 transition-colors',
                                                    error ? 'border-destructive/60 bg-destructive/5'
                                                        : changed ? 'border-primary/50 bg-primary/5'
                                                            : 'border-border'
                                                )}
                                            >
                                                <div className="grid items-center gap-x-3 gap-y-1.5 sm:grid-cols-[1fr_auto_1fr]">
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-muted-foreground">{field.label}</p>
                                                        {locked ? (
                                                            <span className="flex items-center gap-1.5 text-sm font-medium tracking-widest text-muted-foreground/60 select-none">
                                                                ••••
                                                            </span>
                                                        ) : (
                                                            <p className={cn('truncate text-sm font-medium', field.mono && 'font-mono')}>
                                                                {formatCompanyFieldValue(field.key, company[field.key as keyof CompanyData])}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 sm:block" />

                                                    {locked ? (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Info className="h-3.5 w-3.5 shrink-0" />
                                                            Upgrade your plan to edit this field
                                                        </div>
                                                    ) : field.kind === 'boolean' ? (
                                                        <select
                                                            value={draft[field.key]}
                                                            disabled={submitting}
                                                            onChange={e => setDraft(d => ({ ...d, [field.key]: e.target.value }))}
                                                            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-ring disabled:opacity-50"
                                                        >
                                                            <option value="">No value</option>
                                                            <option value="true">Yes</option>
                                                            <option value="false">No</option>
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type={field.kind === 'number' ? 'number' : 'text'}
                                                            inputMode={field.kind === 'number' ? 'decimal' : undefined}
                                                            min={field.min}
                                                            max={field.max}
                                                            step={field.step}
                                                            value={draft[field.key]}
                                                            disabled={submitting}
                                                            placeholder={field.placeholder}
                                                            onChange={e => setDraft(d => ({ ...d, [field.key]: e.target.value }))}
                                                            className={cn(
                                                                'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 disabled:opacity-50',
                                                                field.mono && 'font-mono',
                                                                error
                                                                    ? 'border-destructive focus:ring-destructive/30'
                                                                    : 'border-input focus:ring-ring'
                                                            )}
                                                        />
                                                    )}
                                                </div>

                                                {error && <p className="mt-1.5 text-xs text-destructive sm:col-span-3">{error}</p>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* An admin's edit goes straight to the record, so there is
                            no reviewer to justify it to. */}
                        {!isAdmin && <div>
                            <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                                Reason <span className="text-destructive">*</span>
                            </h3>
                            <textarea
                                rows={3}
                                value={reason}
                                disabled={submitting}
                                onChange={e => setReason(e.target.value)}
                                onBlur={() => setReasonTouched(true)}
                                placeholder="eg: Confirmed the new address and phone number on the company's website on 3 Aug."
                                className={cn(
                                    'w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 disabled:opacity-50',
                                    showReasonError
                                        ? 'border-destructive focus:ring-destructive/30'
                                        : 'border-input focus:ring-ring'
                                )}
                            />
                            {showReasonError ? (
                                <p className="mt-1.5 text-xs text-destructive">
                                    A reason is required — the reviewer needs to know why this change is being proposed.
                                </p>
                            ) : (
                                <p className="mt-1.5 text-xs text-muted-foreground">
                                    Tell the reviewer where this information came from.
                                </p>
                            )}
                        </div>}
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-border px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                            {!changedFields.length
                                ? `Edit a field to ${isAdmin ? 'update this company' : 'propose a change'}. Blank fields are left untouched.`
                                : reasonMissing
                                    ? `${changedFields.length} field${changedFields.length === 1 ? '' : 's'} changed — add a reason to submit`
                                    : `${changedFields.length} field${changedFields.length === 1 ? '' : 's'} changed`}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={submitting}
                                className="h-10 rounded-lg border border-border px-4 text-sm font-medium transition-colors cursor-pointer hover:bg-accent disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !changedFields.length || errors.length > 0 || reasonMissing}
                                className="flex h-10 min-w-36 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {isAdmin ? 'Saving...' : 'Submitting...'}
                                    </>
                                ) : isAdmin ? (
                                    <>
                                        <Save className="h-4 w-4" /> Save changes
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" /> Submit for review
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
