import { Coins } from 'lucide-react';

// Placeholder route behind the account menu's "Buy Credits" item. Credit
// top-ups aren't self-serve yet — this stands in until the purchase flow and
// its backend endpoint exist, so the menu item has somewhere real to land.
export default function BuyCreditsPage() {
    return (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>
            <div className="shrink-0 border-b border-border px-6 py-3">
                <h1 className="font-heading text-sm font-normal">Buy Credits</h1>
            </div>
            <div className="flex flex-1 items-center justify-center px-6">
                <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                        <Coins className="size-6 text-primary" />
                    </span>
                    <p className="font-heading text-base font-semibold">
                        Credit top-ups are coming soon
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Buying additional credits isn&apos;t self-serve yet. To raise your
                        balance in the meantime, contact your account administrator.
                    </p>
                </div>
            </div>
        </div>
    );
}
