import { useState } from 'react';
import { toast } from 'sonner';
import { X, Zap, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateSeedData, type Company } from '@/lib/mock-data';

export function CompanyDrawer({ company, onClose }: { company: Company; onClose: () => void }) {

    const companies = generateSeedData().companies
    const [tab, setTab] = useState<'overview' | 'similar' | 'location' | 'activity'>('overview');
    const [enriching, setEnriching] = useState(false);
    const [enrichStep, setEnrichStep] = useState(0);

    const daysSinceEnrich = Math.floor((Date.now() - new Date(company.last_enriched_at).getTime()) / 86400000);
    const freshnessColor = daysSinceEnrich > 90 ? 'text-destructive' : daysSinceEnrich > 30 ? 'text-warning' : 'text-success';

    const handleEnrich = async () => {
        // if (!checkQuota('enrichments')) { toast.error('Enrichment quota reached'); return; }
        setEnriching(true);
        setEnrichStep(1);
        await new Promise(r => setTimeout(r, 800));
        setEnrichStep(2);
        await new Promise(r => setTimeout(r, 800));
        setEnrichStep(3);
        await new Promise(r => setTimeout(r, 400));

        const updates: Partial<Company> = { last_enriched_at: new Date().toISOString() };
        if (!company.phone) updates.phone = `(${Math.floor(Math.random() * 800) + 200}) ${Math.floor(Math.random() * 800) + 200}-${Math.floor(Math.random() * 9000) + 1000}`;
        if (!company.email) updates.email = `contact@${company.name.toLowerCase().replace(/\s+/g, '')}.com`;
        if (!company.website) updates.website = `https://www.${company.name.toLowerCase().replace(/\s+/g, '')}.com`;
        updates.enrichment_completeness = 100;

        // updateCompany(company.id, updates);
        // incrementUsage('enrichments');
        // addEnrichmentLog({
        //   id: crypto.randomUUID(), userId: currentUser!.id, companyId: company.id, companyName: company.name,
        //   status: 'complete', fieldsUpdated: Object.keys(updates),
        //   oldValues: {}, newValues: updates as Record<string, string>,
        //   source: 'Google Places', timestamp: new Date().toISOString(), cost: 0.003,
        // });
        toast.success('Company enriched successfully');
        setEnriching(false); setEnrichStep(0);
    };

    const similar = companies.filter(c => c.id !== company.id && c.naics_code.slice(0, 3) === company.naics_code.slice(0, 3)).slice(0, 6);

    const Field = ({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) => (
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
                            <h2 className="text-xl font-bold">{company.name}</h2>
                            <p className="text-sm text-muted-foreground">{company.dba ? `DBA: ${company.dba} · ` : ''}{company.city}, {company.state}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-pill bg-muted px-2 py-0.5 text-xs font-mono">{company.naics_code}</span>
                                <span className="rounded-pill bg-muted px-2 py-0.5 text-xs">{company.employees.toLocaleString()} employees</span>
                                <span className="rounded-pill bg-muted px-2 py-0.5 text-xs">Est. {company.year_founded}</span>
                                {company.ownership_type.map(o => (
                                    <span key={o} className="rounded-pill bg-primary/10 text-primary px-2 py-0.5 text-xs">{o}</span>
                                ))}
                            </div>
                            <p className={cn('mt-2 text-xs', freshnessColor)}>
                                Last enriched {daysSinceEnrich}d ago · {company.enrichment_completeness}% complete
                            </p>
                        </div>
                        <button onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button onClick={handleEnrich} disabled={enriching}
                            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98]">
                            <Zap className="h-4 w-4" /> {enriching ? 'Enriching...' : 'Enrich Now'}
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/companies/' + company.id); toast.success('Link copied'); }}
                            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
                            <Copy className="h-4 w-4" /> Copy Link
                        </button>
                    </div>
                    {enriching && (
                        <div className="mt-4 flex gap-4 text-sm">
                            {['Places Lookup', 'Search', 'Web Scrape'].map((step, i) => (
                                <div key={step} className="flex items-center gap-1.5">
                                    {enrichStep > i + 1 ? <Check className="h-4 w-4 text-success" /> : enrichStep === i + 1 ? <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" /> : <div className="h-4 w-4 rounded-full border border-border" />}
                                    <span className={cn(enrichStep > i ? 'text-foreground' : 'text-muted-foreground')}>{step}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="px-6">
                    <div className="flex gap-4">
                        {(['overview', 'similar', 'location', 'activity'] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)} className={cn('border-b-2 pb-2 pt-3 text-sm font-medium transition-colors capitalize',
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
                                <Field label="Legal Name" value={company.name} />
                                <Field label="DBA" value={company.dba} />
                                <Field label="NAICS" value={`${company.naics_code} — ${company.naics_description}`} mono />
                                <Field label="SIC" value={`${company.sic_code} — ${company.sic_description}`} mono />
                                <Field label="Employees" value={company.employees.toLocaleString()} />
                                <Field label="Revenue" value={`$${company.revenue.toLocaleString()}`} />
                                <Field label="Founded" value={company.year_founded} />
                                <Field label="Ownership" value={company.ownership_type.join(', ') || 'Not specified'} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Contact</h3>
                                <Field label="Phone" value={company.phone} />
                                <Field label="Email" value={company.email} />
                                <Field label="Website" value={company.website} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Location</h3>
                                <Field label="Address" value={company.address} />
                                <Field label="City" value={company.city} />
                                <Field label="State" value={company.state} />
                                <Field label="Zipcode" value={company.zipcode} mono />
                                <Field label="County" value={company.county} />
                            </div>
                        </div>
                    )}
                    {tab === 'similar' && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {similar.length === 0 ? (
                                <p className="col-span-full text-center py-8 text-muted-foreground">No similar companies found</p>
                            ) : similar.map(c => (
                                <div key={c.id} className="rounded-lg border border-border p-3">
                                    <p className="font-medium text-sm">{c.name}</p>
                                    <p className="text-xs text-muted-foreground">{c.city}, {c.state}</p>
                                    <p className="text-xs text-muted-foreground mt-1 font-mono">{c.naics_code}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'location' && (
                        <div className="space-y-4">
                            <p className="text-sm">{company.address}, {company.city}, {company.state} {company.zipcode}</p>
                            <p className="text-sm text-muted-foreground">{company.county}, {company.country}</p>
                            <button onClick={() => { navigator.clipboard.writeText(`${company.address}, ${company.city}, ${company.state} ${company.zipcode}`); toast.success('Address copied'); }}
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