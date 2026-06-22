'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { X, Copy, AlertCircle, Info, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCompanyAction, getSimilarCompanyAction, singleEnrichAction } from './searchServices';
import { isSessionExpiring } from '@/lib/session';
import { CompanyData } from '@/types/search';
import SimilarPage from './Similar';
import { ApiErrorResponse } from '@/types/common';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useDispatch } from 'react-redux';
import { updateEnrichmentCredits } from '@/store/slices/authSlice';

const ENRICHMENT_STALE_DAYS = 90;

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
        <div className="flex h-72 w-full items-center justify-center rounded-lg border border-border bg-muted/30">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
    ),
});


function Field({
    label,
    value,
    mono,
    fieldKey,
    notAccessible,
    link,
}: {
    label: string;
    value: string | number | null | undefined;
    mono?: boolean;
    fieldKey?: string;
    notAccessible?: string[];
    link?: boolean;
}) {
    const isLocked = fieldKey !== undefined && notAccessible?.includes(fieldKey);
    const href = link && value ? (/^https?:\/\//i.test(String(value)) ? String(value) : `https://${value}`) : null;

    // Unique tooltip anchor id per field to avoid conflicts
    const tooltipId = `upgrade-tooltip-${fieldKey ?? label.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">{label}</span>

            {isLocked ? (
                <span className="flex items-center gap-1.5">
                    <span
                        className={cn(
                            'text-sm font-medium text-right select-none tracking-widest text-muted-foreground/60',
                            mono && 'font-mono'
                        )}
                    >
                        ••••
                    </span>
                    {/* Info icon — tooltip anchor */}
                    <span
                        data-tooltip-id={tooltipId}
                        data-tooltip-content="Please upgrade to see this field"
                        className="inline-flex items-center cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                        aria-label="Upgrade to view this field"
                    >
                        <Info className="h-3.5 w-3.5" />
                    </span>
                    <Tooltip
                        id={tooltipId}
                        place="left"
                        className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
                    />
                </span>
            ) : href ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={cn('text-sm font-medium text-right text-primary hover:underline break-all', mono && 'font-mono')}
                >
                    {value}
                </a>
            ) : (
                <span className={cn('text-sm font-medium text-right', mono && 'font-mono')}>
                    {value || 'NA'}
                </span>
            )}
        </div>
    );
}

export function CompanyDrawer({ id, onClose, onEnriched }: { id: string; onClose: () => void; onEnriched?: (enriched?: CompanyData) => void }) {

    const dispatch = useDispatch();
    const [tab, setTab] = useState<'overview' | 'similar' | 'location' | 'activity'>('overview');
    const [companyData, setCompanyData] = useState<CompanyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [enriching, setEnriching] = useState<boolean>(false);

    const [similar, setSimilar] = useState<CompanyData[]>([]);
    const [similarLoading, setSimilarLoading] = useState(false);
    const similarFetchedFor = useRef<string | null>(null);

    const fetchCompany = async (id: string): Promise<CompanyData | undefined> => {
        setLoading(true);
        setError(null);
        const response = await getCompanyAction(id);
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

    // Lazily fetch the similar-companies list once the user opens the similar
    // tab, keyed to the company currently shown so it refreshes when the user
    // drills into a different company. (The location map fetches its own pins.)
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

    // Load a different company into the drawer (from a similar pin or list card).
    const loadCompany = (cid: string) => {
        setTab('overview');
        fetchCompany(cid);
    };

    const handleEnrich = async () => {
        setEnriching(true);
        const payload = {
            company_id: id,
            company_name: companyData?.company_name || '',
            location: [companyData?.city, companyData?.state, companyData?.zip_code].filter(Boolean).join(', ')
        };
        const { data, errors } = await singleEnrichAction(payload);
        if (errors) {
            setEnriching(false);
            const firstError = errors[0];
            const errorCode = firstError?.error?.error_code;
            const detail = firstError?.error?.detail || firstError?.message || 'Enrich failed';

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
                                You&apos;ve reached your monthly enrichment credit limit. Contact your admin to request more credits.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                window.location.href = 'mailto:admin@miller3.com?subject=Request for more enrichment credits';
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
            dispatch(updateEnrichmentCredits(data.headers));
            const updated = await fetchCompany(id);
            // Refresh the underlying search list so the row reflects the new
            // enrichment status without the user having to reload. The freshly
            // fetched company is passed up so callers can patch their row in
            // place rather than re-running an expensive query.
            onEnriched?.(updated);
            toast.success('Company enriched successfully');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl h-[90vh] max-h-[90vh] bg-card border border-border rounded-lg shadow-xl overflow-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="sticky top-0 z-10 bg-card border-b border-border p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold">{companyData?.company_name}</h2>
                            <p className="text-sm text-muted-foreground">{companyData?.city}, {companyData?.state}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {companyData?.naics_code &&
                                    <span className="rounded-pill bg-muted px-2 py-0.5 text-xs font-mono">{companyData?.naics_code}</span>
                                }
                                {companyData?.employee_size &&
                                    <span className="rounded-pill bg-muted px-2 py-0.5 text-xs">{`${companyData?.employee_size} employees`}</span>
                                }
                                {companyData?.year_founded && (
                                    <span className="rounded-pill bg-muted px-2 py-0.5 text-xs">{companyData?.year_founded}</span>
                                )}
                            </div>
                            {companyData?.last_enriched_label && (
                                companyData?.last_enriched_at ? (() => {
                                    const { text, isStale } = formatEnrichedAt(companyData.last_enriched_at);
                                    return <p className={isStale ? 'text-destructive' : 'text-success'}>Last enriched at {text}</p>;
                                })() : (
                                    <p className='text-destructive'>{companyData?.last_enriched_label}</p>
                                )
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={enriching}
                                    onClick={handleEnrich}
                                    className={cn("flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50")}
                                >
                                    <Zap className="h-4 w-4" /> {enriching ? 'Enriching...' : 'Enrich'}
                                </button>
                            </div>
                        </div>
                        <button onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm z-20">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <p className="text-sm text-muted-foreground">Loading company details...</p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm z-20">
                        <div className="flex flex-col items-center gap-3 text-center px-6">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                            <p className="text-sm text-destructive font-medium">{error}</p>
                            <button
                                onClick={() => fetchCompany(id)}
                                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                )}

                <div className="px-6">
                    <div className="flex gap-4">
                        {(['overview', 'similar', 'location'] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)} className={cn('border-b-2 pb-2 pt-3 text-sm font-medium transition-colors capitalize cursor-pointer',
                                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {tab === 'overview' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Firmographics</h3>
                                <Field label="Legal Name" fieldKey="company_name" value={companyData?.company_name} />
                                <Field label="NAICS" fieldKey="naics_code" value={companyData?.naics_code ?? 'NA'} mono />
                                <Field label="SIC" fieldKey="sic_code" value={companyData?.sic_code ?? 'NA'} mono />
                                <Field label="Employees" fieldKey="employee_size" value={companyData?.employee_size ?? 'NA'} />
                                <Field
                                    notAccessible={companyData?.not_accessible}
                                    label="Revenue"
                                    fieldKey="annual_revenue"
                                    value={companyData?.annual_revenue
                                        ? `$${companyData.annual_revenue.toLocaleString()}`
                                        : 'NA'}
                                />
                                <Field label="Founded" fieldKey="year_founded" value={companyData?.year_founded} />
                                <Field label="Ownership" fieldKey="ownership_type" value={companyData?.ownership_type || 'Not specified'} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Contact</h3>
                                <Field label="Phone" fieldKey="phone" value={companyData?.phone} />
                                <Field label="Email" fieldKey="email" value={companyData?.email} />
                                <Field label="Website" fieldKey="website" value={companyData?.website} link />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Location</h3>
                                <Field label="City" fieldKey="city" value={companyData?.city} />
                                <Field label="State" fieldKey="state" value={companyData?.state} />
                                <Field label="Zipcode" fieldKey="zip_code" value={companyData?.zip_code} mono />
                                <Field label="County" fieldKey="county" value={companyData?.county} />
                            </div>
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
                                <div className="flex h-72 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                                    No map coordinates available for this company.
                                </div>
                            )}
                            <p className="text-sm">{companyData?.city}, {companyData?.state} {companyData?.zip_code}</p>
                            <p className="text-sm text-muted-foreground">{companyData?.county}</p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${companyData?.city}, ${companyData?.state} ${companyData?.zip_code}`);
                                    toast.success('Address copied');
                                }}
                                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                            >
                                <Copy className="h-4 w-4" /> Copy address
                            </button>
                        </div>
                    )}
                    {tab === 'activity' && (
                        <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet for this company.</p>
                    )}
                </div>
            </div>
        </div>
    );
}