'use client'

import { Sparkles, ArrowRight, Check, CircleCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { tiers } from '@/lib/constants';

interface OnboardingPageProps {
    onTierSelect: (role: string) => void;
    selectedTier: string;
    onSubmit: () => void;
    step: number;
    setStep: (step: number) => void;
    loading: boolean;
}

export default function OnboardingPage({ onTierSelect, selectedTier, onSubmit, step, setStep, loading }: OnboardingPageProps) {
    const router = useRouter();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
            {step === 0 && (
                <div className="animate-fade-in text-center max-w-lg">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold">Welcome to <span className="text-gradient">Miller3</span></h1>
                    <p className="mt-3 text-muted-foreground">Let&apos;s find your first vendor in under 60 seconds.</p>
                    <button onClick={() => setStep(1)} className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer">
                        Get Started <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {step === 1 && (
                <div className="animate-fade-in w-full max-w-4xl text-center">
                    <h2 className="text-4xl font-bold">Choose Your Plan</h2>
                    <div className="mt-10 flex gap-6">
                        {tiers.map(tier => (
                            <div
                                key={tier.role}
                                onClick={() => {
                                    onTierSelect(tier.role);
                                }}
                                className={cn('w-full rounded-lg border transition-all cursor-pointer', selectedTier === tier.role ? tier.active : tier.color)}
                            >
                                <div className='flex justify-end px-3 pt-2'>
                                    <CircleCheck className={cn('h-5 w-5 text-success', selectedTier === tier.role ? 'visible' : 'invisible')} />
                                </div>
                                <div className='py-3 px-6 flex flex-col items-start gap-4'>
                                    <tier.icon className="h-20 w-20" />
                                    <p className="text-xl font-bold">{tier.label}</p>
                                </div>
                                <div className='border-t p-6 flex flex-col items-start gap-2'>
                                    <div className='flex items-center gap-2'>
                                        <Check className="h-4 w-4 text-success" />
                                        <p className="text-sm text-muted-foreground">{tier.desc1}</p>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                        <Check className="h-4 w-4 text-success" />
                                        <p className="text-sm text-muted-foreground">{tier.desc2}</p>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                        <Check className="h-4 w-4 text-success" />
                                        <p className="text-sm text-muted-foreground">{tier.desc3}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => onSubmit()} disabled={loading} className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
                        {loading ? (
                            <span className="flex items-center justify-center gap-2 w-20">
                                <svg className="h-5 w-5 animate-spin text-foreground" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                                </svg>
                            </span>
                        ) : (
                            <>Continue <ArrowRight className="h-4 w-4" /></>
                        )}
                    </button>
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
