'use client';

import { Check } from 'lucide-react';
import { tiers } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hooks';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

/** Same three tiers the registration flow offers (see
 *  src/app/auth/register/Onboarding.tsx), rendered read-only here so an
 *  existing user can see what they're on and what the other plans include.
 *  Switching plans isn't self-serve yet — the sales contact below stands in
 *  for it, so no tier card acts as a submit button. */
export function MyPlanDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const user = useAppSelector((state) => state.auth.user);

    // `tiers` keys plans as 'Free' | 'Standard' | 'Premium'; the API sends the
    // role uppercased, and admins match no tier at all.
    const currentTier = user?.role?.toUpperCase() ?? null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-6 rounded-2xl p-6 sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="font-heading text-2xl font-semibold text-primary">
                        My Plan
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        {currentTier === 'ADMIN'
                            ? 'Admin accounts are not billed against a plan.'
                            : 'Your current plan is highlighted below.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
                    {tiers.map((tier) => {
                        const isCurrent = tier.role.toUpperCase() === currentTier;
                        return (
                            <div
                                key={tier.role}
                                className={cn(
                                    'flex flex-1 flex-col gap-5 rounded-[1.25rem] border p-5 text-left',
                                    isCurrent
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-card text-card-foreground'
                                )}
                            >
                                <div className="flex flex-col items-center gap-1 text-center">
                                    <p className="font-heading text-base font-semibold">{tier.label}</p>
                                    <p
                                        className={cn(
                                            'font-heading text-2xl font-bold',
                                            isCurrent ? 'text-primary-foreground' : 'text-primary'
                                        )}
                                    >
                                        {tier.price}
                                    </p>
                                </div>

                                <ul className="flex flex-col gap-2.5">
                                    {[tier.desc1, tier.desc2, tier.desc3].map((desc) => (
                                        <li key={desc} className="flex items-start gap-2.5 text-sm">
                                            <span
                                                className={cn(
                                                    'mt-1.5 size-1.5 shrink-0 rounded-full',
                                                    isCurrent ? 'bg-primary-foreground' : 'bg-primary'
                                                )}
                                            />
                                            {desc}
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-auto pt-1">
                                    {isCurrent ? (
                                        <p className="flex items-center justify-center gap-1.5 rounded-xl bg-background/15 py-2 text-sm font-medium">
                                            <Check className="h-4 w-4" />
                                            Current plan
                                        </p>
                                    ) : (
                                        <p className="text-center text-xs text-muted-foreground">
                                            {tier.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <p className="text-center text-xs text-muted-foreground">
                    To change your plan, contact your account administrator.
                </p>
            </DialogContent>
        </Dialog>
    );
}
