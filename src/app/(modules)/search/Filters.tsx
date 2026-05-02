'use client';

import { statesList } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { FilterInput, Toggle } from './helper';

const initialFilters = {
    stateFilter: [] as string[],
    cityFilter: '',
    naicsFilter: '',
    minEmp: '',
    maxEmp: '',
    minRev: '',
    maxRev: '',
    demoFilter: [] as string[],
    hasPhone: false,
    hasEmail: false,
    hasWebsite: false,
};

type Filters = typeof initialFilters;

interface FiltersProps {
    filters: typeof initialFilters;
    setFilters: (f: typeof initialFilters) => void;
    setPage: (p: number) => void;
    initialFilters: typeof initialFilters;
}

const Filters = ({ setPage, filters, setFilters, initialFilters }: FiltersProps) => {

    const [draftFilters, setDraftFilters] = useState(filters);

    const activeFilterCount = Object.values(filters).reduce((count, value) => {
        if (Array.isArray(value)) return count + value.length;
        if (typeof value === 'boolean') return count + (value ? 1 : 0);
        return count + (value ? 1 : 0);
    }, 0);

    const applyFilters = () => {
        setFilters(draftFilters);
        setPage(1);
    };

    const clearDraftFilters = () => {
        setDraftFilters(initialFilters);
        setFilters(initialFilters);
        setPage(1);
    };

    return (
        <aside className="w-80 shrink-0 border-r border-border bg-card overflow-auto hidden lg:block" style={{ height: 'calc(100vh - 3.5rem)' }}>
            <div className="sticky top-0 bg-card flex items-center justify-between border-b p-4 border-border">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">Filters</h3>
                    {activeFilterCount > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{activeFilterCount}</span>}
                </div>
                <div className="flex gap-2">
                    <button onClick={clearDraftFilters} className="text-xs text-primary cursor-pointer hover:underline">Clear</button>
                    <button onClick={applyFilters} disabled={draftFilters === initialFilters} className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">Apply</button>
                </div>
            </div>
            <div className="p-4 space-y-5">
                {/* Location */}
                <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Location</p>
                    <FilterInput label="City" value={draftFilters.cityFilter} onChange={(v) => setDraftFilters({ ...draftFilters, cityFilter: v })} placeholder="e.g. Austin" />
                    <div className="mt-2">
                        <label className="text-xs font-medium text-muted-foreground">State</label>
                        <div className="mt-1 flex flex-wrap gap-1 max-h-24 overflow-auto">
                            {statesList.map(s => (
                                <button key={s} onClick={() => { setDraftFilters({ ...draftFilters, stateFilter: draftFilters.stateFilter.includes(s) ? draftFilters.stateFilter.filter(x => x !== s) : [...draftFilters.stateFilter, s] }); setPage(1); }}
                                    className={cn('rounded-pill px-2 py-0.5 text-xs font-medium transition-colors border', draftFilters.stateFilter.includes(s) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40')}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Industry */}
                <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Industry</p>
                    <FilterInput label="NAICS Code" value={draftFilters.naicsFilter} onChange={(v) => setDraftFilters({ ...draftFilters, naicsFilter: v })} placeholder="e.g. 541" mono />
                </div>
                {/* Size */}
                <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Company Size</p>
                    <div className="grid grid-cols-2 gap-2">
                        <FilterInput label="Min Employees" value={draftFilters.minEmp} onChange={(v) => setDraftFilters({ ...draftFilters, minEmp: v })} placeholder="0" />
                        <FilterInput label="Max Employees" value={draftFilters.maxEmp} onChange={(v) => setDraftFilters({ ...draftFilters, maxEmp: v })} placeholder="10,000+" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <FilterInput label="Min Revenue" value={draftFilters.minRev} onChange={(v) => setDraftFilters({ ...draftFilters, minRev: v })} placeholder="$0" />
                        <FilterInput label="Max Revenue" value={draftFilters.maxRev} onChange={(v) => setDraftFilters({ ...draftFilters, maxRev: v })} placeholder="$1B+" />
                    </div>
                </div>
                {/* Demographics */}
                <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Demographics</p>
                    {['Minority-Owned', 'Women-Owned', 'Veteran-Owned'].map(d => (
                        <label key={d} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                            <input type="checkbox" checked={draftFilters.demoFilter.includes(d)}
                                onChange={e => { setDraftFilters({ ...draftFilters, demoFilter: e.target.checked ? [...draftFilters.demoFilter, d] : draftFilters.demoFilter.filter(x => x !== d) }); setPage(1); }}
                                className="rounded border-border" />
                            {d}
                        </label>
                    ))}
                </div>
                {/* Data Quality */}
                <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Data Quality</p>
                    <Toggle label="Has phone" checked={draftFilters.hasPhone} onChange={v => { setDraftFilters({ ...draftFilters, hasPhone: v }); setPage(1); }} />
                    <Toggle label="Has email" checked={draftFilters.hasEmail} onChange={v => { setDraftFilters({ ...draftFilters, hasEmail: v }); setPage(1); }} />
                    <Toggle label="Has website" checked={draftFilters.hasWebsite} onChange={v => { setDraftFilters({ ...draftFilters, hasWebsite: v }); setPage(1); }} />
                </div>
            </div>
        </aside>
    )
}

export default Filters