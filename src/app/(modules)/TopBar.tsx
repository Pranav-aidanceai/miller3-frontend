import { Moon, Sun, Command, Sparkles, Zap, Download } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { SidebarTrigger } from '@/components/ui/sidebar';

// Export is billed per block of companies rather than per company; the block
// size is fixed by the backend's pricing, not configurable per environment.
const EXPORT_BLOCK_SIZE = 50;

/** What each action costs, for the breakdown shown on hovering the bar. */
const CREDIT_COSTS = [
    {
        icon: Sparkles,
        label: 'AI Search',
        cost: Number(process.env.NEXT_PUBLIC_AI_SEARCH_CREDIT_DEDUCTION) || 5,
        per: 'search',
    },
    {
        icon: Zap,
        label: 'Enrichment',
        cost: Number(process.env.NEXT_PUBLIC_ENRICHMENT_CREDIT_DEDUCTION) || 3,
        per: 'company',
    },
    {
        icon: Download,
        label: 'Export',
        cost: Number(process.env.NEXT_PUBLIC_EXPORT_CREDIT_DEDUCTION) || 1,
        per: `${EXPORT_BLOCK_SIZE} companies`,
    },
];

// Single unified balance shared by AI search, enrichment and export.
// `limit < 0` means unlimited (admin) — shown as a green infinity symbol
// instead of a percentage bar.
function CreditBar({ remaining, limit }: { remaining: number; limit: number }) {
    const unlimited = limit < 0;
    const pct = !unlimited && limit > 0 ? Math.min((remaining / limit) * 100, 100) : 0;

    const barColor = unlimited ? 'bg-green-500' : pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-400' : 'bg-red-500';
    const textColor = unlimited ? 'text-green-500' : pct > 60 ? 'text-green-500' : pct > 30 ? 'text-yellow-400' : 'text-red-500';
    const borderColor = unlimited ? 'border-green-500/30' : pct > 60 ? 'border-green-500/30' : pct > 30 ? 'border-yellow-400/30' : 'border-red-500/30';

    return (
        <div className={`rounded-md border ${borderColor} bg-background px-3 py-1.5 text-xs group relative cursor-default select-none flex items-center gap-3`}>
            <div className="flex flex-col gap-1">
                <div className="text-muted-foreground font-medium">Credits</div>
                <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: unlimited ? '100%' : `${pct}%` }}
                    />
                </div>
            </div>
            <div className={`text-sm font-semibold tabular-nums ${textColor}`}>
                {unlimited ? '∞' : remaining}
            </div>

            {/* Cost breakdown, on hover. Purely informational, so it never takes
                the pointer — that also keeps it from flickering at the edges. */}
            <div
                role="tooltip"
                className="pointer-events-none invisible absolute right-0 top-full z-50 mt-2 w-60 rounded-lg border border-border bg-popover p-3 text-popover-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
            >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Credit usage
                </p>
                <ul className="mt-2 space-y-2">
                    {CREDIT_COSTS.map(({ icon: Icon, label, cost, per }) => (
                        <li key={label} className="flex items-start gap-2">
                            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                                <p className="text-xs font-medium leading-tight">{label}</p>
                                <p className="text-[11px] leading-tight text-muted-foreground">
                                    {cost} {cost === 1 ? 'credit' : 'credits'} per {per}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
                {unlimited && (
                    <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
                        Your account has unlimited credits.
                    </p>
                )}
            </div>
        </div>
    );
}

export function TopBar() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();
    const initialized = useRef(false);
    const credits_left = useAppSelector(state => state.auth.credits_left);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;
        setMounted(true);
        const storedTheme = localStorage.getItem('theme');
        if (!storedTheme) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const systemTheme = prefersDark ? 'dark' : 'light';
            setTheme(systemTheme);
        }
    }, [setTheme]);

    return (
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:px-6">
            <div className="flex items-center gap-4">
                {/* The desktop trigger lives in AppSidebar's own header; on
                    mobile the sidebar renders as an off-canvas sheet, so it
                    needs a trigger here instead. */}
                <SidebarTrigger className="md:hidden" />
                <div className="hidden items-center gap-4 invisible md:flex">
                    <button
                        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                        <Command className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Search...</span>
                        <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] font-mono sm:inline">⌘K</kbd>
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div data-tour="credits" className="flex items-center gap-2">
                    <CreditBar
                        remaining={credits_left?.total ?? 0}
                        limit={credits_left?.limit ?? 0}
                    />
                </div>

                {/* Notifications */}
                {/* <button className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Notifications">
                    <Bell className="h-4 w-4" />
                </button> */}

                {/* Theme */}
                <button
                    data-tour="theme-toggle"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    aria-label="Toggle theme"
                    disabled={!mounted}
                >
                    {!mounted ? <Moon className="h-4 w-4" /> : theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
            </div>
        </header>
    );
}
