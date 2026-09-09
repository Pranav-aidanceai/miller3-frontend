'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { statesList } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { FilterAutocomplete } from './FilterAutocomplete';
import { FilterInput } from './helper';
import { SearchFilters } from './replayParams';
import { validateFilters } from './filterValidation';

interface FiltersProps {
    /** The filters the current results were fetched with. */
    filters: SearchFilters;
    setFilters: (f: SearchFilters) => void;
    /**
     * Edits waiting to be applied. Owned by the page because the company-name
     * search lives in the top bar but applies through this sidebar's Apply.
     */
    draftFilters: SearchFilters;
    setDraftFilters: (f: SearchFilters) => void;
    setPage: (p: number) => void;
    initialFilters: SearchFilters;
    /** Notifies the page that the user cleared every filter. */
    onClear?: () => void;
}

const DEMOGRAPHICS: { value: string; label: string }[] = [
    { value: 'Minority-Owned', label: 'Minority Owned' },
    { value: 'Women-Owned', label: 'Women Owned' },
    { value: 'Veteran-Owned', label: 'Veteran Owned' },
];

/**
 * The draft fields each section owns. Sections start collapsed, so a collapsed
 * one carries a dot when something inside it is set — otherwise an applied
 * filter would be invisible until the user went looking for it.
 */
const SECTION_FIELDS = {
    industry: ['naicsFilter', 'sicFilter'],
    location: ['cityFilter', 'countyFilter', 'stateFilter', 'msaFilter'],
    employees: ['minEmp', 'maxEmp'],
    revenue: ['minRev', 'maxRev'],
    founded: ['minYear', 'maxYear'],
    ownership: ['demoFilter', 'certificationFilter'],
    quality: ['hasPhone', 'hasEmail', 'hasWebsite'],
} satisfies Record<string, (keyof SearchFilters)[]>;

type SectionId = keyof typeof SECTION_FIELDS;

const isSet = (value: SearchFilters[keyof SearchFilters]) =>
    Array.isArray(value) ? value.length > 0 : !!value;

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="h-4 w-4 shrink-0 cursor-pointer rounded-[5px] border-input accent-primary"
            />
            {label}
        </label>
    );
}

function Section({
    title,
    open,
    active,
    onToggle,
    dataTour,
    children,
}: {
    title: string;
    open: boolean;
    active: boolean;
    onToggle: () => void;
    dataTour?: string;
    children: React.ReactNode;
}) {
    return (
        <div data-tour={dataTour} className="border-b border-border">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center justify-between gap-2 px-6 py-3 text-left text-sm"
            >
                <span className={cn('flex items-center gap-1.5 text-sm font-heading', open ? 'font-semibold' : 'font-normal')}>
                    {title}
                    {active && !open && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </span>
                <ChevronDown
                    className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
                />
            </button>
            {open && <div className="space-y-4 px-6 pb-4">{children}</div>}
        </div>
    );
}

const Filters = ({ setPage, filters, setFilters, draftFilters, setDraftFilters, initialFilters, onClear }: FiltersProps) => {

    // Sections start closed, matching the panel's default state in the design.
    const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set());

    const hasChanges = JSON.stringify(draftFilters) !== JSON.stringify(filters);
    // A bad range would be silently dropped by the backend, so Apply waits.
    const errors = validateFilters(draftFilters);
    const isValid = Object.keys(errors).length === 0;

    const toggleSection = (id: SectionId) =>
        setOpenSections(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const sectionActive = (id: SectionId) => SECTION_FIELDS[id].some(key => isSet(draftFilters[key]));

    const applyFilters = () => {
        if (!isValid) return;
        setFilters(draftFilters);
        setPage(1);
    };

    const clearDraftFilters = () => {
        setDraftFilters(initialFilters);
        setFilters(initialFilters);
        setPage(1);
        onClear?.();
    };

    const patch = (changes: Partial<SearchFilters>) => setDraftFilters({ ...draftFilters, ...changes });

    const toggleDemo = (value: string, checked: boolean) => {
        patch({
            demoFilter: checked
                ? [...draftFilters.demoFilter, value]
                : draftFilters.demoFilter.filter(x => x !== value),
        });
        setPage(1);
    };

    const section = (id: SectionId) => ({
        open: openSections.has(id),
        active: sectionActive(id),
        onToggle: () => toggleSection(id),
    });

    return (
        <aside data-tour="filters-section" className="hidden h-full w-65 shrink-0 overflow-auto border-r border-border lg:block">
            <div className="sticky top-0 z-10 flex h-15 items-center justify-between border-b border-border px-4">
                <h3 className="text-sm font-semibold text-[#5A5A5A] font-heading">Filters</h3>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={clearDraftFilters}
                        className="cursor-pointer text-sm font-heading font-normal text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={applyFilters}
                        disabled={!hasChanges || !isValid}
                        className="cursor-pointer rounded-lg bg-primary px-2 py-1 text-sm font-heading font-normal text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Apply
                    </button>
                </div>
            </div>

            <Section title="Industry Codes" dataTour="industry-filter" {...section('industry')}>
                <FilterAutocomplete label="NAICS Code / Industry" field="naics" value={draftFilters.naicsFilter} onChange={v => patch({ naicsFilter: v })} placeholder="Enter NAICS Code" />
                <FilterAutocomplete label="SIC Code" field="sic" value={draftFilters.sicFilter} onChange={v => patch({ sicFilter: v })} placeholder="Enter SIC Code" />
            </Section>

            <Section title="Location" dataTour="location-filter" {...section('location')}>
                <FilterInput letters label="City" value={draftFilters.cityFilter} onChange={v => patch({ cityFilter: v })} placeholder="Search City" />
                <FilterInput letters label="County" value={draftFilters.countyFilter} onChange={v => patch({ countyFilter: v })} placeholder="Search County" />
                <div>
                    <label className="text-sm text-foreground/80">State</label>
                    {/* A wrapping pill list rather than the design's single select:
                        `stateFilter` is a multi-select, which a one-value dropdown
                        could not express. */}
                    <div className="mt-2 flex max-h-28 flex-wrap gap-1 overflow-auto">
                        {statesList.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => {
                                    patch({
                                        stateFilter: draftFilters.stateFilter.includes(s)
                                            ? draftFilters.stateFilter.filter(x => x !== s)
                                            : [...draftFilters.stateFilter, s],
                                    });
                                    setPage(1);
                                }}
                                className={cn(
                                    'cursor-pointer rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
                                    draftFilters.stateFilter.includes(s)
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border hover:border-primary/40'
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
                <FilterAutocomplete label="Metropolitan Statistical Area" field="msa" value={draftFilters.msaFilter} onChange={v => patch({ msaFilter: v })} placeholder="Search MSA" />
            </Section>

            <Section title="Employee Size" dataTour="size-filter" {...section('employees')}>
                <div className="grid grid-cols-2 gap-3">
                    <FilterInput numeric label="Min" value={draftFilters.minEmp} onChange={v => patch({ minEmp: v })} placeholder="Enter min" />
                    <FilterInput numeric error={errors.maxEmp} label="Max" value={draftFilters.maxEmp} onChange={v => patch({ maxEmp: v })} placeholder="Enter Max" />
                </div>
            </Section>

            <Section title="Revenue" {...section('revenue')}>
                <div className="grid grid-cols-2 gap-3">
                    <FilterInput numeric label="Min" value={draftFilters.minRev} onChange={v => patch({ minRev: v })} placeholder="Enter min" />
                    <FilterInput numeric error={errors.maxRev} label="Max" value={draftFilters.maxRev} onChange={v => patch({ maxRev: v })} placeholder="Enter Max" />
                </div>
            </Section>

            <Section title="Founding Year" {...section('founded')}>
                <div className="grid grid-cols-2 gap-3">
                    <FilterInput numeric maxLength={4} error={errors.minYear} label="Min" value={draftFilters.minYear} onChange={v => patch({ minYear: v })} placeholder="Enter min" />
                    <FilterInput numeric maxLength={4} error={errors.maxYear} label="Max" value={draftFilters.maxYear} onChange={v => patch({ maxYear: v })} placeholder="Enter Max" />
                </div>
            </Section>

            <Section title="Ownership" dataTour="demographics-filter" {...section('ownership')}>
                {DEMOGRAPHICS.map(d => (
                    <CheckRow
                        key={d.value}
                        label={d.label}
                        checked={draftFilters.demoFilter.includes(d.value)}
                        onChange={checked => toggleDemo(d.value, checked)}
                    />
                ))}
                <FilterAutocomplete label="Certification" field="certification" value={draftFilters.certificationFilter} onChange={v => patch({ certificationFilter: v })} placeholder="eg : SBE, HUBZone" />
            </Section>

            <Section title="Data Quality" dataTour="data-quality-filter" {...section('quality')}>
                <CheckRow label="Has Phone" checked={draftFilters.hasPhone} onChange={v => { patch({ hasPhone: v }); setPage(1); }} />
                <CheckRow label="Has email" checked={draftFilters.hasEmail} onChange={v => { patch({ hasEmail: v }); setPage(1); }} />
                <CheckRow label="Has website" checked={draftFilters.hasWebsite} onChange={v => { patch({ hasWebsite: v }); setPage(1); }} />
            </Section>
        </aside>
    );
};

export default Filters;
