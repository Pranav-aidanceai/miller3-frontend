import { cn } from "@/lib/utils";

export const FilterInput = ({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; mono?: boolean }) => (
    <div>
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <input value={value} onChange={e => { onChange(e.target.value) }} placeholder={placeholder}
            className={cn('mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring', mono && 'font-mono')} />
    </div>
);

export const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center justify-between py-1">
        <span className="text-sm">{label}</span>
        <button onClick={() => onChange(!checked)} className={cn('h-5 w-9 rounded-full transition-colors cursor-pointer', checked ? 'bg-primary' : 'bg-muted')}>
            <div className={cn('h-4 w-4 rounded-full bg-primary-foreground transition-transform ml-0.5', checked && 'translate-x-4')} />
        </button>
    </label>
);