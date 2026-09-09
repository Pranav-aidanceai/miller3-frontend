'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { X, Copy, AlertCircle, Info, Zap, Sparkles, RefreshCw, Pencil, ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api/client';
import { getErrorMessage } from '@/lib/apiError';
import { filterTitleOf, generateCompanyDescriptionAction, getCompanyAction, getFilterOptionsAction, getSimilarCompanyAction, singleEnrichAction } from './searchServices';
import { isSessionExpiring } from '@/lib/session';
import { CodeFilterResponse, CompanyData } from '@/types/search';
import SimilarPage from './Similar';
import { ApiErrorResponse } from '@/types/common';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useDispatch } from 'react-redux';
import { updateCreditsRemaining } from '@/store/slices/authSlice';
import BucketPickerPopover from '../buckets/BucketPickerPopover';
import type { Bucket } from '../buckets/BucketList';
import EditCompanyModal from './EditCompanyModal';

const ENRICHMENT_STALE_DAYS = 90;


function sicTitleOf(results: CodeFilterResponse['results'] | undefined, prefix: string): string | null {
    if (!results || Array.isArray(results)) return null;
    return Object.entries(results).find(([code]) => code.slice(0, 4) === prefix)?.[1] ?? null;
}

function formatEnrichedAt(iso: string): { text: string; isStale: boolean } {
    const d = new Date(iso);
    const now = new Date();
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const isToday = d.toDateString() === now.toDateString();
    const text = isToday
        ? `Today at ${time}`
        : `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at ${time}`;
    const ageDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return { text, isStale: ageDays > ENRICHMENT_STALE_DAYS };
}

const LocationMap = dynamic(() => import('./LocationMap'), {
    ssr: false,
    loading: () => (
        <div className="flex h-72 w-full items-center justify-center rounded-xl border border-border bg-muted/30">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
    ),
});

const ENRICHABLE_FIELDS: { key: keyof CompanyData; label: string }[] = [
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'website', label: 'Website' },
];

const ENRICHABLE_KEYS: string[] = ENRICHABLE_FIELDS.map(f => String(f.key));

function diffEnrichedFields(before: CompanyData | null, after: CompanyData | undefined) {
    if (!after) return [];
    return ENRICHABLE_FIELDS.filter(({ key }) => {
        const next = after[key];
        if (next === null || next === undefined || next === '') return false;
        const previous = before?.[key];
        return String(next) !== String(previous ?? '');
    });
}

function formatFieldList(labels: string[]): string {
    if (labels.length === 1) return labels[0];
    return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/**
 * One label-over-value card. The drawer lays these out in wrapping rows, so a
 * chip sizes to its own content rather than sitting on a shared grid track.
 */
function DetailChip({
    label,
    value,
    mono,
    fieldKey,
    notAccessible,
    link,
    enrichedFields,
    hint,
}: {
    label: string;
    value: string | number | null | undefined;
    mono?: boolean;
    fieldKey?: string;
    notAccessible?: string[];
    link?: boolean;
    enrichedFields?: string[];
    /** Extra detail shown on hover — the full NAICS/SIC industry title, say. */
    hint?: string | null;
}) {
    const isLocked = fieldKey !== undefined && notAccessible?.includes(fieldKey);
    // A locked chip only ever renders dots, so it is never worth glowing.
    const enriched = !isLocked && fieldKey !== undefined && enrichedFields?.includes(fieldKey);
    const isEmpty = value === null || value === undefined || value === '' || value === 'NA';
    // Only phone/email/website are ever filled in by enrichment, so only those
    // are worth pointing at the Enrich button when they come back blank.
    const offerEnrich = !isLocked && isEmpty && fieldKey !== undefined && ENRICHABLE_KEYS.includes(fieldKey);
    const href = link && value ? (/^https?:\/\//i.test(String(value)) ? String(value) : `https://${value}`) : null;

    // Unique tooltip anchor ids per field to avoid conflicts.
    const slug = fieldKey ?? label.replace(/\s+/g, '-').toLowerCase();
    const lockTipId = `upgrade-tooltip-${slug}`;
    const hintTipId = `chip-hint-${slug}`;

    const valueClass = cn('text-base font-semibold tracking-[-0.02em] font-heading', mono && 'font-mono');

    return (
        <div className="min-w-0 max-w-full rounded-[13px] border border-border p-3">
            <p className="text-sm font-medium text-[#5A5A5AB2] font-heading">{label}</p>

            {isLocked ? (
                <span className="mt-0.5 flex items-center gap-1.5">
                    <span className={cn(valueClass, 'select-none tracking-widest text-muted-foreground/60')}>••••</span>
                    <span
                        data-tooltip-id={lockTipId}
                        data-tooltip-content="Please upgrade to see this field"
                        className="inline-flex items-center cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                        aria-label="Upgrade to view this field"
                    >
                        <Info className="h-3.5 w-3.5" />
                    </span>
                    <Tooltip
                        id={lockTipId}
                        place="top"
                        className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
                    />
                </span>
            ) : offerEnrich ? (
                <p className={cn(valueClass, 'text-warning')}>Enrich to get data</p>
            ) : href ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className={cn(valueClass, 'block truncate text-primary hover:underline', enriched && 'enriched-value')}
                    title={String(value)}
                >
                    {value}
                </a>
            ) : (
                <>
                    <p
                        data-tooltip-id={hint ? hintTipId : undefined}
                        data-tooltip-content={hint ?? undefined}
                        className={cn(valueClass, 'truncate', hint && 'cursor-help', enriched && 'enriched-value')}
                        title={hint ? undefined : String(value ?? 'NA')}
                    >
                        {isEmpty ? 'NA' : value}
                    </p>
                    {hint && (
                        <Tooltip
                            id={hintTipId}
                            place="top"
                            className="max-w-64! text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
                        />
                    )}
                </>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h3 className="text-base font-semibold text-[#5A5A5AB2] font-heading">{title}</h3>
            <div className="flex flex-wrap gap-4">{children}</div>
        </section>
    );
}

/* Cycled while the model works, so a long generation still reads as progress
   rather than a stalled screen. */
const DESCRIPTION_STEPS = [
    'Gathering public sources…',
    'Reading the company website…',
    'Cross-checking industry signals…',
    'Summarising what we found…',
    'Polishing the wording…',
];

const DEFAULT_DESCRIPTION_DISCLAIMER =
    'This description was generated by AI from company data and may contain inaccuracies.';

function GeneratingDescription() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setStep(s => (s + 1) % DESCRIPTION_STEPS.length), 2400);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex-1 space-y-3">
            <span key={step} className="ai-sweep-text text-sm font-medium animate-in fade-in duration-500 font-heading">
                {DESCRIPTION_STEPS[step]}
            </span>
            <div className="space-y-2">
                <div className="ai-skeleton-line w-full" />
                <div className="ai-skeleton-line w-11/12" />
                <div className="ai-skeleton-line w-4/5" />
            </div>
        </div>
    );
}

function DescriptionSection({
    description,
    disclaimer,
    generating,
    onGenerate,
}: {
    description: string | null | undefined;
    disclaimer: string | null;
    generating: boolean;
    onGenerate: () => void;
}) {
    const hasDescription = !!description?.trim();

    return (
        <div className="flex items-start gap-2">
            <Sparkles className={cn('mt-0.5 h-4 w-4 shrink-0 text-ai', generating && 'animate-pulse')} />

            {generating ? (
                <GeneratingDescription />
            ) : hasDescription ? (
                <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed whitespace-pre-line font-heading font-normal">{description}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground font-heading font-normal">{disclaimer ?? DEFAULT_DESCRIPTION_DISCLAIMER}</p>
                        <button
                            type="button"   
                            onClick={onGenerate}
                            className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ai transition-colors hover:bg-ai/10 cursor-pointer"
                        >
                            <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground font-heading font-normal">No description on file for this company yet.</p>
                    <button
                        type="button"
                        onClick={onGenerate}
                        className="flex items-center gap-2 rounded-xl bg-ai px-4 py-2 text-sm font-medium text-ai-foreground transition-colors hover:bg-ai/90 active:scale-[0.98] cursor-pointer"
                    >
                        <Sparkles className="h-4 w-4 font-heading" /> Generate Description
                    </button>
                </div>
            )}
        </div>
    );
}

const TABS = ['overview', 'similar', 'location'] as const;
type Tab = (typeof TABS)[number];

export function CompanyDrawer({ id, onClose, onEnriched }: { id: string; onClose: () => void; onEnriched?: (enriched?: CompanyData) => void }) {

    const dispatch = useDispatch();
    const [tab, setTab] = useState<Tab>('overview');
    const [companyData, setCompanyData] = useState<CompanyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [enriching, setEnriching] = useState<boolean>(false);
    const [generatingDescription, setGeneratingDescription] = useState<boolean>(false);
    const [editing, setEditing] = useState<boolean>(false);
    // Only the generation response carries the AI caveat, so it is kept beside
    // the description rather than on the company record.
    const [descriptionDisclaimer, setDescriptionDisclaimer] = useState<string | null>(null);
    const notAccessible = companyData?.not_accessible;
    // The drawer can be walked onto another company (a similar match or a map
    // pin), so bucket actions follow what's loaded, not the id it opened with.
    const currentId = companyData?.company_id ?? id;
    const isLocked = (key: string) => notAccessible?.includes(key) ?? false;
    const [similar, setSimilar] = useState<CompanyData[]>([]);
    const [similarLoading, setSimilarLoading] = useState(false);
    const similarFetchedFor = useRef<string | null>(null);
    // The companies walked through to reach the one on screen, so a match opened
    // from Similar (or the map) can be stepped back out of.
    const [trail, setTrail] = useState<string[]>([]);
    // Fields the latest enrichment filled in. Kept until the drawer closes (or a
    // different company is loaded into it) so the user can see what was gained.
    const [enrichedFields, setEnrichedFields] = useState<string[]>([]);
    const [removingBucket, setRemovingBucket] = useState<string | null>(null);
    // Descriptions are keyed by the code they were fetched for, so a drawer swap never shows a stale label.
    const [naicsInfo, setNaicsInfo] = useState<{ code: string; label: string | null } | null>(null);
    const [sicInfo, setSicInfo] = useState<{ code: string; label: string | null } | null>(null);
    const naicsCode = companyData?.naics_code;
    const sicCode = companyData?.sic_code;
    const naicsLabel = naicsInfo && naicsInfo.code === naicsCode ? naicsInfo.label : null;
    const sicLabel = sicInfo && sicInfo.code === sicCode ? sicInfo.label : null;
    const naicsLoading = !!naicsCode && !isLocked('naics_code') && naicsInfo?.code !== naicsCode;
    const sicLoading = !!sicCode && !isLocked('sic_code') && sicInfo?.code !== sicCode;

    // The chip shows the bare code; the industry title rides along as its hover
    // hint, which keeps a row of chips from being dominated by one long label.
    const codeHint = (code: string | null | undefined, label: string | null, isLoading: boolean) => {
        if (!code) return null;
        if (isLoading) return 'Loading…';
        return label ? `${code} : ${label}` : null;
    };

    const fetchCompany = async (cid: string): Promise<CompanyData | undefined> => {
        setLoading(true);
        setError(null);
        const response = await getCompanyAction(cid);
        let result: CompanyData | undefined;
        if (response.error) {
            const errBody = response.error as ApiErrorResponse;
            setError(errBody.detail);
        } else {
            result = response.data;
            setCompanyData(response.data);
        }
        setLoading(false);
        return result;
    };

    useEffect(() => {
        if (!id) return;
        let active = true;
        (async () => {
            const response = await getCompanyAction(id);
            if (!active) return;
            if (response.error) {
                const errBody = response.error as ApiErrorResponse;
                setError(errBody.detail);
            } else {
                setCompanyData(response.data);
            }
            setLoading(false);
        })();
        return () => { active = false; };
    }, [id]);

    useEffect(() => {
        const cid = companyData?.company_id;
        if (!cid) return;
        if (tab !== 'similar') return;
        if (similarFetchedFor.current === cid) return;
        similarFetchedFor.current = cid;
        let active = true;
        (async () => {
            setSimilarLoading(true);
            try {
                const response = await getSimilarCompanyAction({ company_id: cid, limit: 5, cursor: null });
                if (active) setSimilar(response.data.results ?? []);
            } catch {
                if (active && !isSessionExpiring()) toast.error('Failed to fetch similar companies');
            } finally {
                if (active) setSimilarLoading(false);
            }
        })();
        return () => { active = false; };
    }, [tab, companyData?.company_id]);

    // Resolve the NAICS/SIC codes to their human-readable descriptions.
    useEffect(() => {
        if (!naicsCode || isLocked('naics_code')) return;
        let active = true;
        (async () => {
            const response = await getFilterOptionsAction('naics', { q: naicsCode, limit: 1 });
            if (active) setNaicsInfo({ code: naicsCode, label: filterTitleOf(response.data?.results, naicsCode) });
        })();
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [naicsCode, notAccessible]);

    useEffect(() => {
        if (!sicCode || isLocked('sic_code')) return;
        let active = true;
        (async () => {
            // A record's SIC can carry trailing detail digits, but the catalogue
            // is keyed by the 4-digit industry — query and match on that prefix,
            // not on the full code, or the lookup finds nothing.
            const prefix = sicCode.slice(0, 4);
            const response = await getFilterOptionsAction('sic', { q: prefix, limit: 1 });
            if (active) setSicInfo({ code: sicCode, label: sicTitleOf(response.data?.results, prefix) });
        })();
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sicCode, notAccessible]);

    const openCompany = (cid: string) => {
        setTab('overview');
        setEnrichedFields([]);
        setDescriptionDisclaimer(null);
        fetchCompany(cid);
    };

    // Load a different company into the drawer (from a similar match or a map pin).
    const loadCompany = (cid: string) => {
        if (cid === currentId) return;
        setTrail(prev => [...prev, currentId]);
        openCompany(cid);
    };

    const goBack = () => {
        const previous = trail[trail.length - 1];
        if (!previous) return;
        setTrail(prev => prev.slice(0, -1));
        openCompany(previous);
    };

    /* The footer chips drop a company from a list in one click, per the design.
       The endpoint is keyed by bucket id but the company record carries only
       names, so the bucket list is fetched to recover the id. */
    const handleRemoveBucket = async (name: string) => {
        if (removingBucket) return;
        setRemovingBucket(name);
        try {
            const response = await apiClient.get('/bucket');
            const bucket = (response.data?.items ?? []).find((b: Bucket) => b.name === name);
            if (!bucket) throw new Error(`Bucket "${name}" no longer exists`);
            await apiClient.delete('/bucket/company', { data: { bucket_id: bucket.id, company_ids: [currentId] } });
            setCompanyData(prev => prev ? { ...prev, buckets: prev.buckets.filter(b => b !== name) } : prev);
            toast.success(`Removed from "${name}"`);
        } catch (err: unknown) {
            if (!isSessionExpiring()) toast.error(getErrorMessage(err, 'Failed to remove from the bucket'));
        } finally {
            setRemovingBucket(null);
        }
    };

    const handleGenerateDescription = async () => {
        if (!currentId) return;
        setGeneratingDescription(true);
        const { data, error } = await generateCompanyDescriptionAction({
            company_id: currentId,
            regenerate: true,
        });
        setGeneratingDescription(false);
        if (error || !data) {
            if (!isSessionExpiring()) {
                toast.error((error as ApiErrorResponse)?.detail || 'Failed to generate description', {
                    duration: 5000,
                    className: '!bg-destructive !text-white !border-destructive'
                });
            }
            return;
        }
        setCompanyData(prev =>
            prev && prev.company_id === data.company_id
                ? { ...prev, company_description: data.description }
                : prev
        );
        setDescriptionDisclaimer(data.disclaimer);
        toast.success('Description generated');
    };

    const handleEnrich = async () => {
        setEnriching(true);
        // Snapshot before the refetch overwrites it, so we can tell what is new.
        const before = companyData;
        const payload = {
            company_id: currentId,
            company_name: companyData?.company_name || '',
            location: [companyData?.city, companyData?.state, companyData?.zip_code].filter(Boolean).join(', ')
        };
        const { data, errors } = await singleEnrichAction(payload);
        if (errors) {
            setEnriching(false);
            const firstError = errors[0];
            const errorCode = firstError?.error?.error_code;
            const detail = firstError?.error?.errors?.[0]?.message || firstError?.error?.detail || firstError?.message || 'Enrich failed';

            if (errorCode === 'HTTP_402') {
                toast.custom((toastId) => (
                    <div className="relative flex w-full flex-col gap-3 rounded-lg border border-destructive bg-destructive p-4 text-white shadow-lg">
                        <button
                            type="button"
                            aria-label="Close"
                            onClick={() => toast.dismiss(toastId)}
                            className="absolute right-2 top-2 rounded p-0.5 text-white/80 transition-colors hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <div className="flex items-start gap-3 pr-5">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            <p className="text-sm font-medium leading-snug">
                                You&apos;ve reached your monthly credit limit. Contact your admin to request more credits.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                window.location.href = 'mailto:admin@miller3.com?subject=Request for more credits';
                            }}
                            className="w-fit rounded-md bg-black/30 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/40"
                        >
                            Contact admin for more credits
                        </button>
                    </div>
                ), { duration: Infinity });
                return;
            }

            if (!isSessionExpiring()) {
                toast.error(detail, {
                    duration: 5000,
                    className: '!bg-destructive !text-white !border-destructive'
                });
            }
        } else if (data?.status === "SUCCESS") {
            setEnriching(false);
            const remaining = parseInt(data.headers ?? '', 10);
            if (!Number.isNaN(remaining)) dispatch(updateCreditsRemaining(remaining));
            const updated = await fetchCompany(currentId);
            const gained = diffEnrichedFields(before, updated);
            // Accumulate, so a second enrichment in the same session does not
            // drop the highlight off what the first one brought in.
            setEnrichedFields(prev => [...new Set([...prev, ...gained.map(f => f.key)])]);
            // Refresh the underlying search list so the row reflects the new
            // enrichment status without the user having to reload. The freshly
            // fetched company is passed up so callers can patch their row in
            // place rather than re-running an expensive query.
            onEnriched?.(updated);
            toast.success(
                gained.length
                    ? `Company enriched — updated ${formatFieldList(gained.map(f => f.label))}`
                    : 'Company enriched — no new data found'
            );
        }
    };

    const chipProps = { notAccessible, enrichedFields };

    const locationChips = (
        <>
            <DetailChip {...chipProps} label="Address" fieldKey="address" value={companyData?.address} />
            <DetailChip {...chipProps} label="City" fieldKey="city" value={companyData?.city} />
            <DetailChip {...chipProps} label="State" fieldKey="state" value={companyData?.state} />
            <DetailChip {...chipProps} label="ZIPCODE" fieldKey="zip_code" value={companyData?.zip_code} mono />
            <DetailChip {...chipProps} label="County" fieldKey="county" value={companyData?.county} />
            <DetailChip {...chipProps} label="MSA" fieldKey="msa" value={companyData?.msa} />
        </>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-card shadow-xl animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="shrink-0 bg-primary px-6 py-5 text-primary-foreground">
                    {trail.length > 0 && (
                        <button
                            type="button"
                            onClick={goBack}
                            className="-ml-1 mb-1 flex items-center gap-1 rounded-md px-1 py-0.5 text-sm text-primary-foreground/80 transition-colors cursor-pointer hover:text-primary-foreground"
                        >
                            <ChevronLeft className="h-4 w-4" /> Back
                        </button>
                    )}

                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h2 className="truncate text-2xl font-semibold font-heading" title={companyData?.company_name}>
                                {companyData?.company_name}
                            </h2>
                            <p className="mt-1 text-sm text-primary-foreground/80">
                                {[companyData?.city, companyData?.state].filter(Boolean).join(', ')}
                            </p>
                            {companyData?.last_enriched_label && (
                                companyData?.last_enriched_at ? (() => {
                                    const { text, isStale } = formatEnrichedAt(companyData.last_enriched_at);
                                    return (
                                        <p className={cn('mt-1 text-xs font-heading font-normal', isStale ? 'text-warning' : 'text-primary-foreground/70')}>
                                            Last enriched at {text}
                                        </p>
                                    );
                                })() : (
                                    <p className="mt-1 text-xs text-warning">{companyData.last_enriched_label}</p>
                                )
                            )}
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="rounded-md p-1 text-primary-foreground/80 transition-colors cursor-pointer hover:bg-primary-foreground/10 hover:text-primary-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <div className="flex items-center gap-2">
                                {companyData && (
                                    <button
                                        type="button"
                                        onClick={() => setEditing(true)}
                                        className="flex items-center gap-1.5 rounded-xl border border-primary-foreground/50 px-3 py-3 text-sm transition-colors cursor-pointer hover:bg-primary-foreground/10 font-heading"
                                    >
                                        <Pencil className="h-3.5 w-3.5" /> Edit details
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={enriching}
                                    onClick={handleEnrich}
                                    className="flex items-center gap-2 rounded-xl bg-card p-3 text-base text-primary transition-opacity cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 font-heading"
                                >
                                    <Zap className="h-4 w-4" /> {enriching ? 'Enriching…' : 'Enrich'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="relative flex-1 overflow-y-auto p-6">
                    {/* Loading State */}
                    {loading && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/80 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                <p className="text-sm text-muted-foreground font-heading">Loading company details...</p>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {!loading && error && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/80 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-3 text-center px-6">
                                <AlertCircle className="h-8 w-8 text-destructive" />
                                <p className="text-sm text-destructive font-medium">{error}</p>
                                <button
                                    onClick={() => fetchCompany(currentId)}
                                    className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors cursor-pointer font-heading"
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="inline-flex items-center rounded-full bg-muted">
                        {TABS.map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={cn(
                                    'rounded-full px-6 py-3 text-sm font-heading font-normal capitalize transition-colors cursor-pointer',
                                    tab === t
                                        ? 'bg-primary font-medium text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4">
                        {tab === 'overview' && (
                            <div className="space-y-4">
                                <DescriptionSection
                                    description={companyData?.company_description}
                                    disclaimer={descriptionDisclaimer}
                                    generating={generatingDescription}
                                    onGenerate={handleGenerateDescription}
                                />

                                <Section title="Company Details">
                                    <DetailChip {...chipProps} label="NAICS" fieldKey="naics_code" value={naicsCode} mono hint={codeHint(naicsCode, naicsLabel, naicsLoading)} />
                                    <DetailChip {...chipProps} label="SIC" fieldKey="sic_code" value={sicCode} mono hint={codeHint(sicCode, sicLabel, sicLoading)} />
                                    <DetailChip {...chipProps} label="Number of Employees" fieldKey="employee_size" value={companyData?.employee_size} />
                                    <DetailChip
                                        {...chipProps}
                                        label="Revenue"
                                        fieldKey="annual_revenue"
                                        value={companyData?.annual_revenue != null ? `$${companyData.annual_revenue.toLocaleString()}` : null}
                                    />
                                    <DetailChip {...chipProps} label="Founded" fieldKey="year_founded" value={companyData?.year_founded} />
                                    <DetailChip {...chipProps} label="Ownership" fieldKey="ownership_type" value={companyData?.ownership_type || 'Not Specified'} />
                                    <DetailChip {...chipProps} label="Certification" fieldKey="certification_status" value={companyData?.certification_status} />
                                </Section>

                                <Section title="Contact Details">
                                    <DetailChip {...chipProps} label="Phone" fieldKey="phone" value={companyData?.phone} />
                                    <DetailChip {...chipProps} label="Email" fieldKey="email" value={companyData?.email} />
                                    <DetailChip {...chipProps} label="Website" fieldKey="website" value={companyData?.website} link />
                                </Section>

                                <Section title="Location">{locationChips}</Section>
                            </div>
                        )}

                        {tab === 'similar' && (
                            <SimilarPage companies={similar} isLoading={similarLoading} onSelect={loadCompany} />
                        )}

                        {tab === 'location' && (
                            <div className="space-y-4">
                                {companyData?.latitude != null && companyData?.longitude != null ? (
                                    <LocationMap
                                        companyId={companyData.company_id}
                                        lat={companyData.latitude}
                                        lng={companyData.longitude}
                                        companyName={companyData.company_name}
                                        address={[companyData.city, companyData.state, companyData.zip_code]
                                            .filter(Boolean)
                                            .join(', ')}
                                        onSelectSimilar={loadCompany}
                                    />
                                ) : (
                                    <div className="flex h-72 w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                                        No map coordinates available for this company.
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-4">{locationChips}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex shrink-0 items-center justify-between gap-4 bg-primary px-6 py-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {companyData?.buckets?.map(name => (
                            <span key={name} className="bucket-chip font-heading">
                                <span className="max-w-40 truncate" title={name}>{name}</span>
                                <button
                                    type="button"
                                    aria-label={`Remove from ${name}`}
                                    disabled={removingBucket === name}
                                    onClick={() => handleRemoveBucket(name)}
                                    className="shrink-0 transition-opacity cursor-pointer hover:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {removingBucket === name
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <X className="h-3 w-3" />}
                                </button>
                            </span>
                        ))}
                    </div>

                    {tab === 'location' ? (
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(
                                    [companyData?.address, companyData?.city, companyData?.state, companyData?.zip_code]
                                        .filter(Boolean)
                                        .join(', ')
                                );
                                toast.success('Address copied');
                            }}
                            className="flex shrink-0 items-center gap-2 rounded-lg border border-primary-foreground px-3 py-1.5 text-sm text-primary-foreground transition-colors cursor-pointer hover:bg-primary-foreground/10"
                        >
                            <Copy className="h-4 w-4" /> Copy Address
                        </button>
                    ) : (
                        <BucketPickerPopover
                            companyIds={[currentId]}
                            bucketNames={companyData?.buckets}
                            showCount={false}
                            onDone={() => fetchCompany(currentId)}
                            className="shrink-0 rounded-lg border border-primary-foreground bg-transparent px-3 py-1.5 text-sm font-normal text-primary-foreground hover:bg-primary-foreground/10"
                        />
                    )}
                </div>
            </div>

            {editing && companyData && (
                <EditCompanyModal
                    company={companyData}
                    onClose={() => setEditing(false)}
                    onSaved={() => fetchCompany(currentId)}
                />
            )}
        </div>
    );
}
