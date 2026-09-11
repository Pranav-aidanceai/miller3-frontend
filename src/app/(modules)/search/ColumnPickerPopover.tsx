import { Columns3, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DEFAULT_VISIBLE_COLUMNS, MAX_OPTIONAL_COLUMNS, OPTIONAL_COLUMNS } from './tableColumns';

interface ColumnPickerPopoverProps {
    selected: string[];
    onChange: (keys: string[]) => void;
}

export default function ColumnPickerPopover({ selected, onChange }: ColumnPickerPopoverProps) {
    const atMax = selected.length >= MAX_OPTIONAL_COLUMNS;
    const isDefault = selected.length === DEFAULT_VISIBLE_COLUMNS.length
        && DEFAULT_VISIBLE_COLUMNS.every(key => selected.includes(key));

    const toggle = (key: string) => {
        if (selected.includes(key)) onChange(selected.filter(k => k !== key));
        else if (!atMax) onChange([...selected, key]);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-white px-2 text-xs cursor-pointer transition-colors hover:bg-accent">
                    <Columns3 className="h-3.5 w-3.5" />
                    Columns
                </button>
            </PopoverTrigger>
            {/* Radix reports how much room is left between the trigger and the
                viewport edge; capping to it keeps the footer on screen on short
                viewports and lets the list — not the popover — do the scrolling. */}
            <PopoverContent
                className="w-64 max-h-(--radix-popover-content-available-height) overflow-hidden p-0"
                align="end"
                collisionPadding={12}
            >
                <div className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold">Columns</span>
                    <span className="text-xs text-muted-foreground">{selected.length}/{MAX_OPTIONAL_COLUMNS} extra</span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                    <label className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                        Company
                        <input type="checkbox" checked disabled className="h-4 w-4 accent-primary" />
                    </label>
                    {OPTIONAL_COLUMNS.map(col => {
                        const checked = selected.includes(col.key);
                        const disabled = !checked && atMax;
                        return (
                            <label
                                key={col.key}
                                className={cn(
                                    'flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                                    disabled ? 'text-muted-foreground/50 cursor-not-allowed' : 'cursor-pointer hover:bg-accent'
                                )}
                            >
                                {col.label}
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={() => toggle(col.key)}
                                    className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
                                />
                            </label>
                        );
                    })}
                    <label className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                        Contact
                        <input type="checkbox" checked disabled className="h-4 w-4 accent-primary" />
                    </label>
                </div>
                <div className="flex shrink-0 items-center justify-between px-4 py-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">Max {MAX_OPTIONAL_COLUMNS} extra columns</span>
                    <button
                        onClick={() => onChange(DEFAULT_VISIBLE_COLUMNS)}
                        disabled={isDefault}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
