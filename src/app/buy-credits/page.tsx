'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { creditPacks } from '@/lib/constants';
import { ChoiceScreenLayout } from '@/components/auth/ChoiceScreenLayout';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

/**
 * The account menu's "Buy Credits" destination — the plan chooser's screen with
 * credit packs in place of tiers, per the Figma "Buy your Credit Pack"
 * (fileKey nPLWw73lkfNSi2MZX2bIsU, node 2:18114).
 *
 * Top-ups aren't self-serve yet — there is no purchase endpoint — so a pack
 * confirms the choice and points at the administrator, matching how /plan
 * handles a plan change.
 */
export default function BuyCreditsPage() {
    const router = useRouter();
    const [requestedPack, setRequestedPack] = useState<number | null>(null);

    return (
        <>
            <ChoiceScreenLayout title="Buy your Credit Pack" onBack={() => router.back()}>
                {creditPacks.map(pack => (
                    <div
                        key={pack.tier}
                        className={cn(
                            'flex w-full max-w-[300px] flex-col items-center justify-between gap-10 rounded-[1.5rem] border p-6',
                            pack.highlighted
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-primary bg-card text-card-foreground'
                        )}
                    >
                        <div className="flex w-full flex-col items-center gap-4">
                            <p className={cn(
                                'text-lg font-heading font-semibold',
                                // The filled card needs its label lifted off the
                                // teal, so it reads as a pill rather than plain text.
                                pack.highlighted && 'rounded-full bg-background px-4 py-0.5 text-primary'
                            )}>
                                {pack.tier}
                            </p>
                            <p className="flex flex-col items-center gap-1 font-heading leading-none">
                                <span className={cn('text-3xl font-bold', pack.highlighted ? 'text-primary-foreground' : 'text-primary')}>
                                    {pack.credits.toLocaleString()}
                                </span>
                                <span className={cn('text-lg font-normal', pack.highlighted ? 'text-primary-foreground' : 'text-foreground')}>
                                    credits
                                </span>
                            </p>
                            <p className={cn('text-center text-xs', pack.highlighted ? 'text-primary-foreground/85' : 'text-muted-foreground')}>
                                An extra {pack.credits.toLocaleString()} Credit will be added to your
                                profile, The Extra added credits will be in use after your existing
                                plan credits
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setRequestedPack(pack.credits)}
                            className={cn(
                                'flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-medium shadow-sm transition-all cursor-pointer',
                                pack.highlighted
                                    ? 'bg-background text-primary hover:bg-background/90'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            )}
                        >
                            Buy Credit plan
                        </button>
                    </div>
                ))}
            </ChoiceScreenLayout>

            <Dialog open={requestedPack !== null} onOpenChange={(open) => { if (!open) setRequestedPack(null); }}>
                <DialogContent className="gap-6 rounded-2xl p-6 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-heading font-semibold text-foreground">Credit Pack</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                        You&apos;ve selected the{' '}
                        <span className="font-bold text-primary">{requestedPack?.toLocaleString()} credit pack.</span>
                        <br /><br />
                        Credit top-ups aren&apos;t self-serve yet — contact your account
                        administrator to have them added to your profile.
                    </DialogDescription>
                    <DialogFooter className="-mx-6 -mb-6 mt-2 justify-end rounded-b-2xl bg-primary p-4">
                        <Button
                            onClick={() => { setRequestedPack(null); router.back(); }}
                            className="rounded-xl bg-background text-primary hover:bg-background/90"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
