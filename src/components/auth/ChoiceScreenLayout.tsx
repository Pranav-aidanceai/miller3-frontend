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
            className="min-h-screen p-6 bg-cover bg-center bg-no-repeat mix-blend-multiply dark:hidden"
            style={{ backgroundImage: "url('/auth/plan-page-bg.png')" }}
        >
            {/* The header sits at the top and the rest of the column takes the
                leftover height, so the heading and cards stay optically centred
                however tall the viewport gets. */}
            <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1800px] flex-col">
                <div className='flex shrink-0 flex-col gap-2 2xl:gap-3'>
                    <div className="z-10 flex items-center gap-3">
                        <Image
                            src="/brand/logomark.svg"
                            alt=""
                            width={28}
                            height={24}
                            className="h-6 w-auto 2xl:h-8 min-[1920px]:h-9"
                        />
                        <span className="text-lg font-heading font-semibold text-foreground 2xl:text-2xl min-[1920px]:text-[1.75rem]">VendorLens</span>
                    </div>
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className='flex w-fit items-center gap-0.5 cursor-pointer'
                        >
                            <ChevronLeft className="size-3 2xl:size-4 min-[1920px]:size-5" />
                            <p className='font-normal text-xs hover:underline 2xl:text-sm min-[1920px]:text-base'>Back</p>
                        </button>
                    )}
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-10 py-10 animate-fade-in relative z-10 w-full text-center">
                    <h2 className="font-heading text-4xl font-bold text-primary 2xl:text-5xl min-[1920px]:text-6xl">{title}</h2>
                    <div className="flex w-full flex-col items-center justify-center gap-6 lg:flex-row lg:items-stretch lg:justify-center 2xl:gap-8">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
