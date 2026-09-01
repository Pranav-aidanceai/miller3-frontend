'use client'

import Image from 'next/image';
import { Sparkles, ArrowRight, Check, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { tiers } from '@/lib/constants';

interface OnboardingPageProps {
    /** May return a Promise (formik's setFieldValue does) — awaited before
     * onSubmit fires, so the submit reads the just-selected tier rather
     * than whatever was selected on a previous render. */
    onTierSelect: (role: string) => void | Promise<unknown>;
    onSubmit: () => void;
    step: number;
    setStep: (step: number) => void;
    loading: boolean;
}

export default function OnboardingPage({ onTierSelect, onSubmit, step, setStep, loading }: OnboardingPageProps) {
    const router = useRouter();
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
            {step === 0 && (
                <div className="animate-fade-in text-center max-w-lg">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-heading font-bold">Welcome to <span className="text-gradient">VendorLens</span></h1>
                    <p className="mt-3 text-muted-foreground">Let&apos;s find your first vendor in under 60 seconds.</p>
                    <button onClick={() => setStep(1)} className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer">
                        Get Started <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {step === 1 && (
                <div className="relative w-full overflow-hidden py-12">
                    {/* Decorative background artwork — same assets as the auth
                        screens' AuthSplitLayout, matching the Figma "Select Plan"
                        reference (fileKey pskj0D4uvWBsvAB5Csxyt4, node 422:1576). */}
                    <div className="pointer-events-none absolute -left-[300px] -top-[200px] size-[600px] rotate-45 opacity-60" aria-hidden="true">
                        <Image src="/auth/blob-1.svg" alt="" fill className="object-contain" />
                    </div>
                    <div className="pointer-events-none absolute -right-[220px] -top-[220px] size-[600px] -rotate-45 opacity-60" aria-hidden="true">
                        <Image src="/auth/blob-2.svg" alt="" fill className="object-contain" />
                    </div>
                    <div className="absolute left-0 top-0 z-10 flex items-center gap-3">
                        <Image src="/brand/logomark.svg" alt="" width={28} height={24} />
                        <span className="text-lg font-heading font-semibold text-foreground">VendorLens</span>
                    </div>

                    <div className="animate-fade-in relative z-10 w-full max-w-5xl text-center">
                        <h2 className="font-heading text-4xl font-bold text-primary">Choose Your Plan</h2>
                        <div className="mt-10 flex flex-col items-center gap-6 lg:flex-row lg:items-stretch lg:justify-center">
                            {tiers.map(tier => {
                                const isSubmittingThis = loading && submittingTier === tier.role;
                                return (
                                    <div
                                        key={tier.role}
                                        className={cn(
                                            'flex w-full max-w-[320px] flex-col items-center gap-8 rounded-[1.5rem] border p-6 text-left',
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
                                            <p className={cn('text-center text-sm', tier.highlighted ? 'text-primary-foreground/85' : 'text-muted-foreground')}>
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
            )}

            {step === 2 && (
                <div className="animate-fade-in relative flex w-full max-w-md flex-col items-center rounded-lg border border-input bg-background px-6 py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Clock className="h-8 w-8" />
                    </div>

                    <h2 className="mt-5 text-xl font-semibold">Approval Pending</h2>

                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        Your account is currently under review by an administrator.
                        You&apos;ll be able to sign in once your access has been
                        reviewed and approved.
                    </p>

                    <button
                        onClick={() => router.push('/')}
                        className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] cursor-pointer"
                    >
                        Back to Login <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {step === 3 && (
                <div className="animate-fade-in text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                        <Check className="h-8 w-8 text-success" />
                    </div>
                    <h2 className="text-2xl font-bold">You&apos;re ready!</h2>
                    <p className="mt-2 text-muted-foreground">Start searching for vendors</p>
                    <button onClick={() => router.push('/')} className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer">
                        Login to Start Searching <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Progress dots */}
            <div className="mt-12 flex gap-2">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className={cn('h-2 w-2 rounded-full transition-all', i === step ? 'bg-primary w-6' : 'bg-muted')} />
                ))}
            </div>
        </div>
    );
}
