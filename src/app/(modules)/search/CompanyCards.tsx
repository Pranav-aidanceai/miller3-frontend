import { Company } from '@/types/search';
import { CardSkeleton, ContactIcons, MaskedCell } from './helper';

interface CompanyCardsProps {
    companies: Company[];
    isLoading: boolean;
    selectedIds: Set<string>;
    notAccessibleFields: string[];
    onToggleSelect: (id: string) => void;
    onCardClick: (company: Company) => void;
}

export default function CompanyCards({
    companies,
    isLoading,
    selectedIds,
    notAccessibleFields,
    onToggleSelect,
    onCardClick,
}: CompanyCardsProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading ? <CardSkeleton /> : companies.length === 0 ? (
                <div className="col-span-full py-16 text-center text-muted-foreground">
                    <p className="text-lg font-medium">No companies match your filters</p>
                </div>
            ) : companies.map(c => (
                <div key={c.id} onClick={() => onCardClick(c)}
                    className="flex flex-col rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md cursor-pointer">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                            {c.company_name.charAt(0)}
                        </div>
                        <div onClick={e => e.stopPropagation()}>
                            <input
                                type="checkbox"
                                checked={selectedIds.has(c.id)}
                                onChange={() => onToggleSelect(c.id)}
                                className="h-4 w-4 cursor-pointer accent-primary"
                            />
                        </div>
                    </div>
                    <p className="mt-3 font-semibold">{c.company_name}</p>
                    <p className="text-xs text-muted-foreground">{c.city}, {c.state}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px]">
                                <MaskedCell
                                    fieldKey="naics_code"
                                    displayValue={c.naics_code}
                                    mono
                                    tooltipPlace="bottom"
                                    notAccessibleFields={notAccessibleFields}
                                />
                            </span>
                            <span className="text-xs text-muted-foreground">
                                <MaskedCell
                                    fieldKey="employee_size"
                                    displayValue={c.employee_size != null ? c.employee_size.toLocaleString() : null}
                                    tooltipPlace="bottom"
                                    notAccessibleFields={notAccessibleFields}
                                />
                            </span>
                            <span className="text-xs text-muted-foreground">
                                <MaskedCell
                                    fieldKey="annual_revenue"
                                    displayValue={c.annual_revenue != null ? `$${c.annual_revenue.toLocaleString()}` : null}
                                    tooltipPlace="bottom"
                                    notAccessibleFields={notAccessibleFields}
                                />
                            </span>
                        </div>
                        <ContactIcons c={c} notAccessibleFields={notAccessibleFields} />
                    </div>
                </div>
            ))}
        </div>
    );
}
