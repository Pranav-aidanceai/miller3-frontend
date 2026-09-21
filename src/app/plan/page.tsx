'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingPage from '../auth/register/Onboarding';
import { tiers } from '@/lib/constants';
import { useAppSelector } from '@/store/hooks';
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
 * The account menu's "My Plan" destination — the same tier cards the
 * registration flow shows (src/app/auth/register/Onboarding.tsx), re-titled
 * against the plan the user is already on, per the Figma "Plan Selection"
 * section (fileKey nPLWw73lkfNSi2MZX2bIsU, node 2:16873).
 *
 * Switching plans isn't self-serve yet — there is no upgrade endpoint — so
 * picking a card confirms the choice and points at the administrator, the same
 * stand-in the Buy Credits route uses.
 */
export default function PlanPage() {
    const router = useRouter();
    const role = useAppSelector(state => state.auth.role);

    // OnboardingPage reports the tier and the submit separately (formik needs
    // the field set before it reads it), so the choice is parked here in
    // between rather than threaded through a changed prop signature.
    const pendingRole = useRef<string | null>(null);
    const [requestedLabel, setRequestedLabel] = useState<string | null>(null);

    // Premium is the top tier, so there is nothing left to upgrade to; admins
    // aren't billed against a plan at all and get the same neutral wording.
    const isTopTier = role === 'PREMIUM' || role === 'ADMIN';

    return (
        <>
            <OnboardingPage
                title={isTopTier ? 'Change your Plan' : 'Upgrade your Plan'}
                currentRole={role}
                onBack={() => router.back()}
                onTierSelect={(tierRole) => { pendingRole.current = tierRole; }}
                onSubmit={() => {
                    const tier = tiers.find(t => t.role === pendingRole.current);
                    setRequestedLabel(tier?.label ?? `${pendingRole.current} Plan`);
                }}
                loading={false}
                successPlanLabel={null}
                onClosePaymentPopup={() => { }}
            />

            <Dialog open={!!requestedLabel} onOpenChange={(open) => { if (!open) setRequestedLabel(null); }}>
                <DialogContent className="gap-6 rounded-2xl p-6 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-heading font-semibold text-foreground">Plan Change</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                        You&apos;ve selected the <span className="font-bold text-primary">{requestedLabel}.</span>
                        <br /><br />
                        Changing plans isn&apos;t self-serve yet — contact your account
                        administrator to complete the switch.
                    </DialogDescription>
                    <DialogFooter className="-mx-6 -mb-6 mt-2 justify-end rounded-b-2xl bg-primary p-4">
                        <Button
                            onClick={() => { setRequestedLabel(null); router.back(); }}
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
