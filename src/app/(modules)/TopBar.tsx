import { Moon, Sun, Bell, Command } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

export function TopBar() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();
    const initialized = useRef(false);

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

    //   const limits = currentUser ? getUserLimits(currentUser.id) : ROLE_LIMITS.free;
    //   const used = currentUser?.searchesToday ?? 0;
    //   const pct = Math.min((used / limits.searches) * 100, 100);
    //   const quotaColor = pct >= 95 ? 'text-destructive' : pct >= 80 ? 'text-warning' : 'text-muted-foreground';

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

            <div className="flex items-center gap-3">
                {/* Quota */}
                {/* <div className={cn('flex items-center gap-2 rounded-pill border border-border px-3 py-1 text-xs font-medium', quotaColor)}>
          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', pct >= 95 ? 'bg-destructive' : pct >= 80 ? 'bg-warning' : 'bg-primary')}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span>{limits.searches - used} left</span>
        </div> */}

                {/* Notifications */}
                <button className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Notifications">
                    <Bell className="h-4 w-4" />
                    {/* <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" /> */}
                </button>

                {/* Theme */}
                <button
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