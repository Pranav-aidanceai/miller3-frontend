'use client'

import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { tiers } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface OnboardingPageProps {
    /** May return a Promise (formik's setFieldValue does) — awaited before
     * onSubmit fires, so the submit reads the just-selected tier rather
     * than whatever was selected on a previous render. */
    onTierSelect: (role: string) => void | Promise<unknown>;
    onSubmit: () => void;
    loading: boolean;
    /** Label of the plan (e.g. "Premium Plan") whose registration just
     * succeeded — shown in the Plan Payment popup. Null keeps it closed. */
    successPlanLabel: string | null;
    onClosePaymentPopup: () => void;
}

export default function OnboardingPage({ onTierSelect, onSubmit, loading, successPlanLabel, onClosePaymentPopup }: OnboardingPageProps) {
    // Tracks which card's own button was clicked, so only that one shows a
    // spinner while `loading` is true — the other two just get disabled.
    const [submittingTier, setSubmittingTier] = useState<string | null>(null);

    const handleSelectPlan = async (role: string) => {
        setSubmittingTier(role);
        await onTierSelect(role);
        onSubmit();
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
            <div className="relative w-full overflow-hidden py-12">
                <div className="absolute left-0 top-0 z-10 flex items-center gap-3">
                    <Image src="/brand/logomark.svg" alt="" width={28} height={24} />
                    <span className="text-lg font-heading font-semibold text-foreground">VendorLens</span>
                </div>
                <div className="animate-fade-in relative z-10 w-full text-center">
                    <h2 className="font-heading text-4xl font-bold text-primary">Choose Your Plan</h2>
                    <div className="mt-10 flex flex-col items-center justify-center gap-6 lg:flex-row lg:items-stretch lg:justify-center">
                        {tiers.map(tier => {
                            const isSubmittingThis = loading && submittingTier === tier.role;
                            return (
                                <div
                                    key={tier.role}
                                    className={cn(
                                        'flex w-full max-w-[320px] flex-col items-center gap-10 rounded-[1.5rem] border p-6 text-left',
                                        tier.highlighted
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-primary bg-card text-card-foreground'
                                    )}
                                >
                                    <div className="flex w-full flex-col items-center gap-4">
                                        <div className="flex w-full flex-col items-center gap-1 text-center">
                                            <p className="text-lg font-heading font-semibold">{tier.label}</p>
                                            <p className={cn('text-2xl font-heading font-bold', tier.highlighted ? 'text-primary-foreground' : 'text-primary')}>{tier.price}</p>
                                        </div>
                                        <p className={cn('text-center text-xs', tier.highlighted ? 'text-primary-foreground/85' : 'text-muted-foreground')}>
                                            {tier.description}
                                        </p>
                                        <ul className="flex w-full flex-col items-start gap-2.5">
                                            {[tier.desc1, tier.desc2, tier.desc3].map((desc) => (
                                                <li key={desc} className="flex items-center gap-2.5 text-sm">
                                                    <span className={cn('size-1.5 shrink-0 rounded-full', tier.highlighted ? 'bg-primary-foreground' : 'bg-primary')} />
                                                    {desc}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <button
                                        onClick={() => handleSelectPlan(tier.role)}
                                        disabled={loading}
                                        className={cn(
                                            'flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-medium shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-70',
                                            tier.highlighted
                                                ? 'bg-background text-primary hover:bg-background/90'
                                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                        )}
                                    >
                                        {isSubmittingThis ? <Loader2 className="h-5 w-5 animate-spin" /> : `Start ${tier.label}`}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Plan Payment popup — matches the Figma "Select Plan" reference's
                confirmation overlay (fileKey pskj0D4uvWBsvAB5Csxyt4, node
                430:1822), shown once registration succeeds for the chosen tier. */}
            <Dialog open={!!successPlanLabel} onOpenChange={(open) => { if (!open) onClosePaymentPopup(); }}>
                <DialogContent className="gap-6 rounded-2xl p-6 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-heading font-semibold text-foreground">Plan Payment</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                        Thank you for selecting the <span className="font-bold text-primary">{successPlanLabel}.</span>
                        <br />
                        An email has been sent to you with the payment link.
                        <br /><br />
                        Once the payment is done the admin will approve your account for use.
                    </DialogDescription>
                    <DialogFooter className="-mx-6 -mb-6 mt-2 justify-end rounded-b-2xl bg-primary p-4">
                        <Button
                            onClick={onClosePaymentPopup}
                            className="rounded-xl bg-background text-primary hover:bg-background/90"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
