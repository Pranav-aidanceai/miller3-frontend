'use client'

import { useState } from 'react';
import { Sparkles, ArrowRight, Check, Gift, User, Crown, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const tiers = [
    { role: 'FREE', label: 'Free', icon: Gift, desc1: '10 Normal searches/min', desc2: 'No AI search available', desc3: 'No enrichment available', color: 'border-border bg-card hover:border-muted-foreground/30', active: 'border-border bg-card border-muted-foreground/30' },
    { role: 'STANDARD', label: 'Standard', icon: User, desc1: '30 Normal searches/min', desc2: '10 AI searches/min', desc3: '5 Enrichment requests/min', color: 'border-warning/30 bg-warning/5 hover:border-warning/60', active: 'border-warning/30 bg-warning/5 border-warning/60' },
    { role: 'PREMIUM', label: 'Premium', icon: Crown, desc1: '60 Normal searches/min', desc2: '20 AI searches/min', desc3: '10 Enrichment requests/min', color: 'border-primary/30 bg-primary/5 hover:border-primary/60', active: 'border-primary/30 bg-primary/5 border-primary/60' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [selectedTier, setSelectedTier] = useState<typeof tiers[0] | null>(tiers[0]);

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
                                    setSelectedTier(tier);
                                }}
                                className={cn('w-full rounded-lg border transition-all cursor-pointer', selectedTier?.role === tier.role ? tier.active : tier.color)}
                            >
                                <div className='flex justify-end px-3 pt-2'>
                                    <CircleCheck className={cn('h-5 w-5 text-success', selectedTier?.role === tier.role ? 'visible' : 'invisible')} />
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
                    <button onClick={() => setStep(2)} className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer">
                        Continue <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="animate-fade-in text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                        <Check className="h-8 w-8 text-success" />
                    </div>
                    <h2 className="text-2xl font-bold">You&apos;re ready!</h2>
                    <p className="mt-2 text-muted-foreground">Start searching for vendors</p>
                    <button onClick={() => router.push('/auth')} className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer">
                        Start Searching <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Progress dots */}
            <div className="mt-12 flex gap-2">
                {[0, 1, 2].map(i => (
                    <div key={i} className={cn('h-2 w-2 rounded-full transition-all', i === step ? 'bg-primary w-6' : 'bg-muted')} />
                ))}
            </div>
        </div>
    );
}
