import { Moon, Sun, Bell, Command } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@/store/hooks';

function CreditBar({ label, remaining, total }: { label: string; remaining: number; total: number }) {
    const [labelWidth, setLabelWidth] = useState(0);
    const labelRef = useRef<HTMLDivElement>(null);
    
    const pct = total > 0 ? Math.min((remaining / total) * 100, 100) : 0;
    const barColor = pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-400' : 'bg-red-500';
    const textColor = pct > 60 ? 'text-green-500' : pct > 30 ? 'text-yellow-400' : 'text-red-500';
    const borderColor = pct > 60 ? 'border-green-500/30' : pct > 30 ? 'border-yellow-400/30' : 'border-red-500/30';

    useEffect(() => {
        if (labelRef.current) {
            setLabelWidth(labelRef.current.offsetWidth);
        }
    }, [label]);

    return (
        <div className={`rounded-md border ${borderColor} bg-background px-3 py-1.5 text-xs group relative cursor-default select-none flex items-center gap-3`}>
            <div className="flex flex-col gap-1">
                <div ref={labelRef} className="text-muted-foreground font-medium">{label}</div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden" style={{ width: `${labelWidth}px` }}>
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
            <div className={`text-sm font-semibold tabular-nums ${textColor}`}>
                {remaining}
            </div>
        </div>
    );
}

export function TopBar() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();
    const initialized = useRef(false);
    const credits_left = useAppSelector(state => state.auth.credits_left);
    const roleDetails = useAppSelector(state => state.auth.roleDetails);

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
            <div className="flex items-center gap-4 invisible">
                <button
                    className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                    <Command className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Search...</span>
                    <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] font-mono sm:inline">⌘K</kbd>
                </button>
            </div>

            <div className="flex items-center gap-2">
                <div data-tour="credits" className="flex items-center gap-2">
                    <CreditBar
                        label="AI Search credits"
                        remaining={credits_left?.ai_search ?? 0}
                        total={roleDetails?.ai_search_credits_monthly ?? 50}
                    />
                    <CreditBar
                        label="Enrichment credits"
                        remaining={credits_left?.enrichment ?? 0}
                        total={roleDetails?.enrichment_credits_monthly ?? 100}
                    />
                    <CreditBar
                        label="Export credits"
                        remaining={credits_left?.export ?? 0}
                        total={roleDetails?.export_credits_monthly ?? 3000}
                    />
                </div>

                {/* Notifications */}
                <button className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Notifications">
                    <Bell className="h-4 w-4" />
                </button>

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
