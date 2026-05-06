'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Copy, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCompanyAction } from './searchServices';
import { CompanyData } from '@/types/search';
import SimilarPage from './Similar';
import { ApiErrorResponse } from '@/types/common';

export function CompanyDrawer({ id, onClose }: { id: string; onClose: () => void }) {

    const [tab, setTab] = useState<'overview' | 'similar' | 'location' | 'activity'>('overview');
    const [companyData, setCompanyData] = useState<CompanyData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCompany = async () => {
        setLoading(true);
        setError(null);
        const response = await getCompanyAction(id);
        if (response.error) {
            const errBody = response.error as ApiErrorResponse;
            setError(errBody.detail)
        } else {
            setCompanyData(response.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (id) {
            fetchCompany();
        }
    }, [id]);

    const Field = ({ label, value, mono }: { label: string; value: string | number | null | undefined; mono?: boolean }) => (
        <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className={cn('text-sm font-medium text-right', mono && 'font-mono')}>{value || '—'}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-card border-l border-border overflow-auto animate-slide-in-right">
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
                                onClick={() => fetchCompany()}
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
                                <Field label="Legal Name" value={companyData?.company_name} />
                                <Field label="NAICS" value={`${companyData?.naics_code || '—'}`} mono />
                                <Field label="SIC" value={`${companyData?.sic_code || '—'}`} mono />
                                <Field label="Employees" value={companyData?.employee_size || '—'} />
                                <Field label="Revenue" value={companyData?.annual_revenue ? `$${companyData.annual_revenue?.toLocaleString() || '—'}` : '—'} />
                                <Field label="Founded" value={companyData?.year_founded} />
                                <Field label="Ownership" value={companyData?.ownership_type || 'Not specified'} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Contact</h3>
                                <Field label="Phone" value={companyData?.phone} />
                                <Field label="Email" value={companyData?.email} />
                                <Field label="Website" value={companyData?.website} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Location</h3>
                                <Field label="City" value={companyData?.city} />
                                <Field label="State" value={companyData?.state} />
                                <Field label="Zipcode" value={companyData?.zip_code} mono />
                                <Field label="County" value={companyData?.county} />
                            </div>
                        </div>
                    )}
                    {tab === 'similar' && (
                        <SimilarPage companyId={id} />
                    )}
                    {tab === 'location' && (
                        <div className="space-y-4">
                            <p className="text-sm">{companyData?.city}, {companyData?.state} {companyData?.zip_code}</p>
                            <p className="text-sm text-muted-foreground">{companyData?.county}</p>
                            <button onClick={() => { navigator.clipboard.writeText(`${companyData?.city}, ${companyData?.state} ${companyData?.zip_code}`); toast.success('Address copied'); }}
                                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
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