'use client'

import { Loader2 } from 'lucide-react';
import { ChoiceScreenLayout } from '@/components/auth/ChoiceScreenLayout';
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
    /** Heading above the cards. Registration keeps the default; the in-app
     * plan screen swaps in "Upgrade"/"Change" wording. */
    title?: string;
    /** The plan the signed-in user is already on ('FREE' | 'STANDARD' |
     * 'PREMIUM'). Its card shows a "Current Plan" badge instead of a button,
     * and the rest read "Upgrade to"/"Change to" against it. Omitted during
     * registration, where the user is on no plan yet. */
    currentRole?: string | null;
    /** Where "Back" goes: the previous registration step during sign-up, the
     * previous route on the in-app plan screen. Omitted hides the link. */
    onBack?: () => void;
}

export default function OnboardingPage({
    onTierSelect,
    onSubmit,
    loading,
    successPlanLabel,
    onClosePaymentPopup,
    title = 'Choose Your Plan',
    currentRole = null,
    onBack,
}: OnboardingPageProps) {

    const [submittingTier, setSubmittingTier] = useState<string | null>(null);
    const currentIndex = currentRole
        ? tiers.findIndex(t => t.role.toUpperCase() === currentRole.toUpperCase())
        : -1;

    const handleSelectPlan = async (role: string) => {
        setSubmittingTier(role);
        await onTierSelect(role);
        onSubmit();
    };

    return (
        <>
            <ChoiceScreenLayout title={title} onBack={onBack}>
                        {tiers.map((tier, index) => {
                            const isSubmittingThis = loading && submittingTier === tier.role;
                            const isCurrent = currentIndex >= 0 && index === currentIndex;
                            const ctaLabel = currentIndex < 0
                                ? `Start ${tier.label}`
                                : index > currentIndex
                                    ? `Upgrade to ${tier.label}`
                                    : `Change to ${tier.label}`;
                            return (
                                <div
                                    key={tier.role}
                                    className={cn(
                                        'flex w-full max-w-[320px] flex-col items-center gap-10 rounded-[1.5rem] border p-6 text-left',
                                        tier.highlighted
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-primary bg-card text-card-foreground',
                                        isCurrent && 'ring-2 ring-primary ring-offset-4 ring-offset-background'
                                    )}
                                >
                                    {isCurrent && (
                                        <span className={cn(
                                            '-mb-6 self-start rounded-full px-3 py-1 text-xs font-medium',
                                            tier.highlighted ? 'bg-background text-primary' : 'bg-primary text-primary-foreground'
                                        )}>
                                            Current Plan
                                        </span>
                                    )}
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
                                    {/* The plan already held needs no call to action — the
                                        badge above says where the user stands. */}
                                    {!isCurrent && (
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
                                            {isSubmittingThis ? <Loader2 className="h-5 w-5 animate-spin" /> : ctaLabel}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
            </ChoiceScreenLayout>

            <PlanPaymentDialog successPlanLabel={successPlanLabel} onClosePaymentPopup={onClosePaymentPopup} />
        </>
    );
}

function PlanPaymentDialog({ successPlanLabel, onClosePaymentPopup }: Pick<OnboardingPageProps, 'successPlanLabel' | 'onClosePaymentPopup'>) {
    return (
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
    );
}
