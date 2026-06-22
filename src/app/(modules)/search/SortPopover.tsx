import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpDown, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SortPopoverProps {
    sortBy: string;
    sortOrder: string;
    setSortBy: (value: string) => void;
    setSortOrder: (value: string) => void;
}

export default function SortPopover({ sortBy, sortOrder, setSortBy, setSortOrder }: SortPopoverProps) {
    const [sortOpen, setSortOpen] = useState(false);
    const [pendingSortBy, setPendingSortBy] = useState('');
    const [pendingSortOrder, setPendingSortOrder] = useState('');

    return (
        <Popover open={sortOpen} onOpenChange={(open: boolean) => {
            if (open) { setPendingSortBy(sortBy); setPendingSortOrder(sortOrder); }
            setSortOpen(open);
        }}>
            <PopoverTrigger asChild>
                <button className={cn(
                    'flex items-center gap-1.5 h-10 rounded-md border px-3 text-sm cursor-pointer transition-colors',
                    sortBy ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background hover:bg-accent'
                )}>
                    <ArrowUpDown className="h-4 w-4" />
                    Sort
                    {sortBy && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold">Sort</span>
                    <button onClick={() => setSortOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="px-4 py-3 space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Sort column</label>
                        <Select value={pendingSortBy} onValueChange={setPendingSortBy}>
                            <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="company_name">Name</SelectItem>
                                <SelectItem value="annual_revenue">Revenue</SelectItem>
                                <SelectItem value="employee_size">Employees</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Sort order</label>
                        <Select value={pendingSortOrder} onValueChange={setPendingSortOrder}>
                            <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="Select order" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="asc">Ascending</SelectItem>
                                <SelectItem value="desc">Descending</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <button
                        onClick={() => { setPendingSortBy(''); setPendingSortOrder(''); setSortBy(''); setSortOrder(''); setSortOpen(false); }}
                        disabled={!pendingSortBy && !pendingSortOrder && !sortBy}
                        className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Clear filters
                    </button>
                    <button
                        onClick={() => { setSortBy(pendingSortBy); setSortOrder(pendingSortOrder); setSortOpen(false); }}
                        disabled={!pendingSortBy || !pendingSortOrder}
                        className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Apply
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
