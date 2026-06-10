'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { X, Copy, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCompanyAction } from './searchServices';
import { CompanyData } from '@/types/search';
import SimilarPage from './Similar';
import { ApiErrorResponse } from '@/types/common';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

// Leaflet relies on `window`, so load the map only on the client.
const LocationMap = dynamic(() => import('./LocationMap'), {
    ssr: false,
    loading: () => (
        <div className="flex h-72 w-full items-center justify-center rounded-lg border border-border bg-muted/30">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
    ),
});

/**
 * Renders a field row. If the field key is present in `notAccessible`,
 * the value is replaced with masked "xxxx" text and an upgrade tooltip is shown.
 */
function Field({
    label,
    value,
    mono,
    fieldKey,
    notAccessible,
}: {
    label: string;
    value: string | number | null | undefined;
    mono?: boolean;
    fieldKey?: string;
    notAccessible?: string[];
}) {
    const isLocked = fieldKey !== undefined && notAccessible?.includes(fieldKey);

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
            ) : (
                <span className={cn('text-sm font-medium text-right', mono && 'font-mono')}>
                    {value || 'NA'}
                </span>
            )}
        </div>
    );
}

export function CompanyDrawer({ id, onClose }: { id: string; onClose: () => void }) {

    const [tab, setTab] = useState<'overview' | 'similar' | 'location' | 'activity'>('overview');
    const [companyData, setCompanyData] = useState<CompanyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCompany = async (id: string) => {
        setLoading(true);
        setError(null);
        const response = await getCompanyAction(id);
        if (response.error) {
            const errBody = response.error as ApiErrorResponse;
            setError(errBody.detail);
        } else {
            setCompanyData(response.data);
        }
        setLoading(false);
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
                            {(companyData?.last_enriched_at || companyData?.last_enriched_label) && <p className='text-xs mt-2 text-red-500'>{companyData?.last_enriched_label} {companyData?.last_enriched_at}</p>}
                            {/* <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={enriching}
                                    onClick={handleEnrich}
                                    className={cn("flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50")}
                                >
                                    <Zap className="h-4 w-4" /> {enriching ? 'Enriching...' : 'Enrich'}
                                </button>
                            </div> */}
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
                                <Field notAccessible={companyData?.not_accessible} label="Legal Name"  fieldKey="company_name"    value={companyData?.company_name} />
                                <Field notAccessible={companyData?.not_accessible} label="NAICS"       fieldKey="naics_code"      value={companyData?.naics_code   ?? 'NA'} mono />
                                <Field notAccessible={companyData?.not_accessible} label="SIC"         fieldKey="sic_code"        value={companyData?.sic_code     ?? 'NA'} mono />
                                <Field notAccessible={companyData?.not_accessible} label="Employees"   fieldKey="employee_size"   value={companyData?.employee_size ?? 'NA'} />
                                <Field
                                    notAccessible={companyData?.not_accessible}
                                    label="Revenue"
                                    fieldKey="annual_revenue"
                                    value={companyData?.annual_revenue
                                        ? `$${companyData.annual_revenue.toLocaleString()}`
                                        : 'NA'}
                                />
                                <Field notAccessible={companyData?.not_accessible} label="Founded"     fieldKey="year_founded"    value={companyData?.year_founded} />
                                <Field notAccessible={companyData?.not_accessible} label="Ownership"   fieldKey="ownership_type"  value={companyData?.ownership_type || 'Not specified'} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Contact</h3>
                                <Field notAccessible={companyData?.not_accessible} label="Phone"   fieldKey="phone"   value={companyData?.phone} />
                                <Field notAccessible={companyData?.not_accessible} label="Email"   fieldKey="email"   value={companyData?.email} />
                                <Field notAccessible={companyData?.not_accessible} label="Website" fieldKey="website" value={companyData?.website} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Location</h3>
                                <Field notAccessible={companyData?.not_accessible} label="City"    fieldKey="city"     value={companyData?.city} />
                                <Field notAccessible={companyData?.not_accessible} label="State"   fieldKey="state"    value={companyData?.state} />
                                <Field notAccessible={companyData?.not_accessible} label="Zipcode" fieldKey="zip_code" value={companyData?.zip_code} mono />
                                <Field notAccessible={companyData?.not_accessible} label="County"  fieldKey="county"   value={companyData?.county} />
                            </div>
                        </div>
                    )}
                    {tab === 'similar' && (
                        <SimilarPage companyId={id} handleFetch={(id: string) => {
                            setTab('overview');
                            fetchCompany(id);
                        }} />
                    )}
                    {tab === 'location' && (
                        <div className="space-y-4">
                            {companyData?.latitude != null && companyData?.longitude != null ? (
                                <LocationMap
                                    lat={companyData.latitude}
                                    lng={companyData.longitude}
                                    companyName={companyData.company_name}
                                    address={[companyData.city, companyData.state, companyData.zip_code]
                                        .filter(Boolean)
                                        .join(', ')}
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