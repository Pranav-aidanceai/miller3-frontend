import { cn } from "@/lib/utils";
import { Company } from "@/types/search";
import { Globe, Info, Mail, Phone } from "lucide-react";
import { Tooltip } from "react-tooltip";

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

export const MaskedCell = ({
    fieldKey,
    displayValue,
    mono = false,
    align = 'left',
    fallback = 'NA',
    tooltipPlace = 'top',
    notAccessibleFields
}: {
    fieldKey: string;
    displayValue: string | number | null | undefined;
    mono?: boolean;
    align?: 'left' | 'right' | 'center';
    fallback?: string;
    tooltipPlace?: 'top' | 'bottom' | 'left' | 'right';
    notAccessibleFields: string[];
}) => {
    const isLocked = notAccessibleFields.includes(fieldKey);
    const tooltipId = `upgrade-tip-${fieldKey}`;
    const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

    if (isLocked) {
        return (
            <span className={cn('flex items-center gap-1', alignClass)}>
                <span className={cn('tracking-widest text-muted-foreground/50 select-none', mono && 'font-mono')}>
                    ••••
                </span>
                <span
                    data-tooltip-id={tooltipId}
                    data-tooltip-content="Please upgrade to see this field"
                    className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    aria-label="Upgrade to view this field"
                >
                    <Info className="h-3 w-3" />
                </span>
                <Tooltip
                    id={tooltipId}
                    place={tooltipPlace}
                    className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
                />
            </span>
        );
    }

    return (
        <span className={cn(mono && 'font-mono')}>
            {displayValue ?? fallback}
        </span>
    );
};

export const ContactIcons = ({ c, notAccessibleFields }: { c: Company; notAccessibleFields: string[] }) => {
    const getState = (hasData: string | null, fieldKey: string): 'green' | 'yellow' | 'red' => {
        if (notAccessibleFields.includes(fieldKey)) return 'yellow';
        if (!hasData) return 'red';
        return 'green';
    };

    const colorMap = {
        green: 'text-emerald-500',
        yellow: 'text-amber-400',
        red: 'text-rose-500',
    };

    const titleMap = {
        phone: {
            green: 'Mobile number available',
            yellow: 'Please upgrade to access mobile number',
            red: 'No mobile number available',
        },
        email: {
            green: 'Email available',
            yellow: 'Please upgrade to access email',
            red: 'No email available',
        },
        website: {
            green: 'Website available',
            yellow: 'Please upgrade to access website',
            red: 'No website available',
        },
    };

    const phoneState = getState(c.phone, 'phone');
    const emailState = getState(c.email, 'email');
    const websiteState = getState(c.website, 'website');

    // Unique tooltip ids per row to avoid conflicts when multiple rows render
    const phoneTooltipId = `contact-phone-${c.id}`;
    const emailTooltipId = `contact-email-${c.id}`;
    const websiteTooltipId = `contact-website-${c.id}`;

    return (
        <div className="flex items-center gap-1.5">
            {/* Phone */}
            <span data-tooltip-id={phoneTooltipId} className="inline-flex cursor-default">
                <Phone className={cn('h-3.5 w-3.5', colorMap[phoneState])} strokeWidth={2} />
            </span>
            <Tooltip
                id={phoneTooltipId}
                place="top"
                content={titleMap.phone[phoneState]}
                className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
            />

            {/* Email */}
            <span data-tooltip-id={emailTooltipId} className="inline-flex cursor-default">
                <Mail className={cn('h-3.5 w-3.5', colorMap[emailState])} strokeWidth={2} />
            </span>
            <Tooltip
                id={emailTooltipId}
                place="top"
                content={titleMap.email[emailState]}
                className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
            />

            {/* Website / Globe */}
            <span data-tooltip-id={websiteTooltipId} className="inline-flex cursor-default">
                <Globe className={cn('h-3.5 w-3.5', colorMap[websiteState])} strokeWidth={2} />
            </span>
            <Tooltip
                id={websiteTooltipId}
                place="top"
                content={titleMap.website[websiteState]}
                className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
            />
        </div>
    );
};

export const TableSkeleton = ({ perPage }: { perPage: number }) => (
    <tbody>
        {Array.from({ length: perPage > 10 ? 10 : perPage }).map((_, i) => (
            <tr key={i} className="border-b border-border">
                <td className="px-4 py-3">
                    <div className="h-4 w-40 rounded bg-muted animate-pulse mb-1" />
                    <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                </td>
                <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-muted animate-pulse" /></td>
                <td className="px-4 py-3 text-right"><div className="h-4 w-12 rounded bg-muted animate-pulse ml-auto" /></td>
                <td className="px-4 py-3 text-right"><div className="h-4 w-16 rounded bg-muted animate-pulse ml-auto" /></td>
                <td className="px-4 py-3"><div className="flex justify-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
                    <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
                    <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
                </div></td>
            </tr>
        ))}
    </tbody>
);

export const CardSkeleton = () => (
    <>
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col rounded-lg border border-border bg-card p-4 gap-3">
                <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
                    <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
                        <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
                        <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
                    </div>
                </div>
                <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="flex gap-2">
                    <div className="h-4 w-14 rounded-full bg-muted animate-pulse" />
                    <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-14 rounded bg-muted animate-pulse" />
                </div>
            </div>
        ))}
    </>
);