'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  key: string;
  label: string;
  type?: 'select' | 'number' | 'date';
  options?: FilterOption[];
  default: string;
  min?: number;
  max?: number;
  /** When the value equals this, the param is omitted from the request (e.g. an "All" option). */
  omitWhen?: string;
}

interface FilterPopoverProps {
  filters: FilterDef[];
  values: Record<string, string>;
  onApply: (values: Record<string, string>) => void;
}

export default function FilterPopover({ filters, values, onApply }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(values);

  // Reset the draft to the applied values each time the popover opens.
  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(values);
    setOpen(next);
  };

  const activeCount = filters.filter((f) => (values[f.key] ?? f.default) !== f.default).length;

  const apply = () => {
    onApply(draft);
    setOpen(false);
  };

  const clear = () => {
    const defaults = Object.fromEntries(filters.map((f) => [f.key, f.default]));
    setDraft(defaults);
    onApply(defaults);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64">
        <div className="flex flex-col gap-3">
          {filters.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
              {f.type === 'number' || f.type === 'date' ? (
                <input
                  type={f.type}
                  min={f.min}
                  max={f.max}
                  value={draft[f.key] ?? f.default}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              ) : (
                <Select
                  value={draft[f.key] ?? f.default}
                  onValueChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-2.5">
          <button
            type="button"
            onClick={clear}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Clear filters
          </button>
          <button
            type="button"
            onClick={apply}
            className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90 transition-opacity cursor-pointer"
          >
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
