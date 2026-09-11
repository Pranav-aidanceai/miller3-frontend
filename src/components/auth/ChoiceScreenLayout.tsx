'use client';

import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';

/**
 * The full-bleed "pick one of these cards" screen: brand mark and Back link
 * top-left, a centred heading, then a row of cards. Shared by the plan chooser
 * (registration and /plan) and the credit packs (/buy-credits), which the Figma
 * draws as the same screen with different cards
 * (fileKey nPLWw73lkfNSi2MZX2bIsU, nodes 2:16873 and 2:18114).
 */
export function ChoiceScreenLayout({
    title,
    onBack,
    children,
}: {
    title: string;
    /** Omitted hides the Back link, rather than leaving a dead control. */
    onBack?: () => void;
    /** The cards themselves — the row that holds them is supplied here. */
    children: React.ReactNode;
}) {
    return (
        <div
            className="h-screen p-6 bg-cover bg-center bg-no-repeat mix-blend-multiply dark:hidden"
            style={{ backgroundImage: "url('/auth/plan-page-bg.png')" }}
        >
            <div className="w-full h-full overflow-hidden flex flex-col justify-center">
                <div className='flex flex-col gap-2'>
                    <div className="z-10 flex items-center gap-3">
                        <Image src="/brand/logomark.svg" alt="" width={28} height={24} />
                        <span className="text-lg font-heading font-semibold text-foreground">VendorLens</span>
                    </div>
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className='flex w-fit items-center cursor-pointer'
                        >
                            <ChevronLeft size={12} />
                            <p className='font-normal text-xs hover:underline'>Back</p>
                        </button>
                    )}
                </div>
                <div className="h-full flex flex-col gap-10 animate-fade-in relative z-10 w-full text-center">
                    <h2 className="font-heading text-4xl font-bold text-primary">{title}</h2>
                    <div className="flex flex-col items-center justify-center gap-6 lg:flex-row lg:items-stretch lg:justify-center">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
