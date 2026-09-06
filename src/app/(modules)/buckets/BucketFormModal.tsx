'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api/client';
import { searchAction } from '../search/searchServices';
import { getErrorMessage } from '@/lib/apiError';
import { toast } from 'sonner';
import { X, Loader2, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Bucket } from './BucketList';
import type { CompanySearchPayload } from '@/types/search';

interface PickedCompany {
    id: string;
    name: string;
}

interface BucketFormModalProps {
    mode: 'create' | 'edit';
    /** Required in edit mode. */
    bucket?: Bucket;
    /** Open with the company search already expanded — used by the toolbar's "Add" button. */
    autoOpenSearch?: boolean;
    onClose: () => void;
    onSaved: (bucket: Bucket) => void;
}

const EMPTY_SEARCH: CompanySearchPayload = {
    search_text: null, state: null, city: null, county: null, naics_code: null,
    employee_size_min: null, employee_size_max: null, annual_revenue_min: null, annual_revenue_max: null,
    minority_owned: null, women_owned: null, veteran_owned: null, sic_code: null, msa: null,
    certification_status: null, sort_by: null, sort_order: 'asc', limit: 8, cursor: null,
    year_founded_min: null, year_founded_max: null, ownership_type: null, enrichment_status: null,
};

/**
 * One modal for both "Create a bucket" and "Edit bucket", matching the Figma
 * reference exactly (fileKey pskj0D4uvWBsvAB5Csxyt4): a name field, the
 * bucket's companies as removable chips, and an inline company search to add
 * more — backed by the same `/bucket`, `/bucket/company` endpoints the rest
 * of the app already uses (no new API surface).
 */
export default function BucketFormModal({ mode, bucket, autoOpenSearch, onClose, onSaved }: BucketFormModalProps) {
    const isEdit = mode === 'edit';

    const [name, setName] = useState(bucket?.name ?? '');
    const [nameError, setNameError] = useState(false);

    // The companies the bucket already had (edit mode) vs. what's picked now —
    // diffed on save so only the actual add/remove calls are made.
    const [initialCompanies, setInitialCompanies] = useState<PickedCompany[]>([]);
    const [selected, setSelected] = useState<PickedCompany[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(isEdit);

    // Create mode shows the search box up front (Figma's "Select the
    // companies"); edit mode hides it behind "+ Add more companies" until asked for.
    const [searchOpen, setSearchOpen] = useState(!isEdit || !!autoOpenSearch);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PickedCompany[]>([]);
    const [searching, setSearching] = useState(false);

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isEdit || !bucket) return;
        let active = true;
        (async () => {
            setLoadingCompanies(true);
            try {
                const res = await apiClient.get('/bucket/company', { params: { bucket_id: bucket.id, limit: 200 } });
                if (!active) return;
                const rows = (res.data?.results ?? []) as { company_id?: string; id?: string; company_name: string }[];
                const list = rows.map(r => ({ id: String(r.company_id ?? r.id), name: r.company_name }));
                setInitialCompanies(list);
                setSelected(list);
            } catch (err: unknown) {
                toast.error(getErrorMessage(err, 'Failed to load bucket companies'));
            } finally {
                if (active) setLoadingCompanies(false);
            }
        })();
        return () => { active = false; };
    }, [isEdit, bucket]);

    useEffect(() => {
        if (!searchOpen) return;
        let active = true;
        const q = query.trim();
        const timer = setTimeout(async () => {
            if (!active) return;
            if (!q) {
                setResults([]);
                setSearching(false);
                return;
            }
            setSearching(true);
            const { data } = await searchAction({ ...EMPTY_SEARCH, search_text: q });
            if (!active) return;
            const companies = (data?.results ?? []) as { id: string; company_name: string }[];
            setResults(companies.map(c => ({ id: c.id, name: c.company_name })));
            setSearching(false);
        }, 350);
        return () => { active = false; clearTimeout(timer); };
    }, [query, searchOpen]);

    const isPicked = (id: string) => selected.some(c => c.id === id);
    const addCompany = (c: PickedCompany) => {
        if (!isPicked(c.id)) setSelected(prev => [...prev, c]);
        setQuery('');
        setResults([]);
    };
    const removeCompany = (id: string) => setSelected(prev => prev.filter(c => c.id !== id));

    const handleSave = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            setNameError(true);
            return;
        }
        setNameError(false);
        setSaving(true);
        try {
            let target: Bucket;
            if (isEdit && bucket) {
                target = bucket;
                if (trimmed !== bucket.name) {
                    const res = await apiClient.patch('/bucket', { bucket_id: bucket.id, name: trimmed });
                    target = res.data;
                }
                const initialIds = new Set(initialCompanies.map(c => c.id));
                const selectedIds = new Set(selected.map(c => c.id));
                const toAdd = selected.filter(c => !initialIds.has(c.id)).map(c => c.id);
                const toRemove = initialCompanies.filter(c => !selectedIds.has(c.id)).map(c => c.id);
                if (toAdd.length) await apiClient.post('/bucket/company', { bucket_id: bucket.id, company_ids: toAdd });
                if (toRemove.length) await apiClient.delete('/bucket/company', { data: { bucket_id: bucket.id, company_ids: toRemove } });
                target = { ...target, company_count: selected.length };
                toast.success('Bucket updated');
            } else {
                const res = await apiClient.post('/bucket', { name: trimmed });
                target = res.data;
                if (selected.length) {
                    await apiClient.post('/bucket/company', { bucket_id: target.id, company_ids: selected.map(c => c.id) });
                    target = { ...target, company_count: selected.length };
                }
                toast.success(`Bucket "${target.name}" created`);
            }
            onSaved(target);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, isEdit ? 'Failed to update bucket' : 'Bucket creation failed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-border p-5">
                    <p className="text-lg font-bold">{isEdit ? 'Edit bucket' : 'Create a bucket'}</p>
                    <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Enter Bucket Name</label>
                        <input
                            autoFocus
                            value={name}
                            maxLength={60}
                            disabled={saving}
                            placeholder="Enter a bucket name"
                            onChange={e => { setName(e.target.value); if (nameError) setNameError(false); }}
                            className={cn(
                                'h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 disabled:opacity-50',
                                nameError ? 'border-destructive focus:ring-destructive/30' : 'border-input focus:ring-ring'
                            )}
                        />
                        {nameError && <p className="mt-1 text-xs text-destructive">A bucket name is required.</p>}
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            {isEdit ? 'Selected companies' : 'Select the companies'}
                        </label>

                        {isEdit && (loadingCompanies ? (
                            <div className="flex min-h-17 items-center justify-center rounded-lg border border-input">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            selected.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 rounded-lg border border-input p-2">
                                    {selected.map(c => (
                                        <span key={c.id} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                                            {c.name}
                                            <X className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => removeCompany(c.id)} />
                                        </span>
                                    ))}
                                </div>
                            )
                        ))}

                        {isEdit && !searchOpen && (
                            <button
                                type="button"
                                onClick={() => setSearchOpen(true)}
                                className="mt-2 flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2 cursor-pointer"
                            >
                                Add more companies <Plus className="h-3.5 w-3.5" />
                            </button>
                        )}

                        {searchOpen && (
                            <div className={isEdit ? 'mt-2' : ''}>
                                {!isEdit && selected.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-1.5 rounded-lg border border-input p-2">
                                        {selected.map(c => (
                                            <span key={c.id} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                                                {c.name}
                                                <X className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => removeCompany(c.id)} />
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        placeholder="Search companies"
                                        className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                {(searching || results.length > 0) && (
                                    <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border">
                                        {searching ? (
                                            <div className="flex items-center justify-center p-3">
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : (
                                            results.map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    disabled={isPicked(c.id)}
                                                    onClick={() => addCompany(c)}
                                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                                >
                                                    {c.name}
                                                    {!isPicked(c.id) && <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 bg-primary p-4">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-md border border-primary-foreground/40 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-foreground/10 disabled:opacity-40 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-md bg-background px-5 py-2 text-sm font-semibold text-primary hover:opacity-90 disabled:opacity-40 cursor-pointer"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Bucket
                    </button>
                </div>
            </div>
        </div>
    );
}
