import Image from 'next/image';
import Link from 'next/link';

interface AuthSplitLayoutProps {
    children: React.ReactNode;
    /** Right-hand hero photo. Omit to fall back to a plain decorative panel. */
    heroSrc?: string;
    heroAlt?: string;
}

/**
 * Shared two-column shell for every pre-auth screen (login, register,
 * forgot/reset password): logo top-left, decorative blob artwork behind a
 * left-aligned content column, a hero photo panel on the right (hidden
 * below `lg`). Matches the Figma "Sign up and Log in" reference
 * (fileKey pskj0D4uvWBsvAB5Csxyt4, node 418:658) — the design provides one
 * shared template for both auth directions, toggled by copy only.
 */
export function AuthSplitLayout({ children, heroSrc, heroAlt }: AuthSplitLayoutProps) {
    return (
        <div className="relative flex min-h-screen overflow-hidden bg-background">
            {/* Decorative background artwork — purely ornamental, so it's
                marked aria-hidden rather than given alt text. */}
            <div className="pointer-events-none absolute -left-[418px] top-[180px] size-[860px] rotate-45 opacity-60" aria-hidden="true">
                <Image src="/auth/blob-1.svg" alt="" fill className="object-contain" priority={false} />
            </div>
            <div className="pointer-events-none absolute -right-[290px] -top-[266px] size-[860px] -rotate-45 opacity-60" aria-hidden="true">
                <Image src="/auth/blob-2.svg" alt="" fill className="object-contain" priority={false} />
            </div>

            <Link
                href="/"
                className="absolute left-6 top-6 z-10 flex items-center gap-3 sm:left-10 sm:top-8"
            >
                <Image src="/brand/logomark.svg" alt="" width={32} height={27} />
                <span className="text-xl font-heading font-semibold text-foreground">VendorLens</span>
            </Link>

            <div className="relative z-10 flex w-full flex-1 items-center justify-center overflow-y-auto px-6 py-12 lg:w-1/2 lg:flex-none lg:px-16">
                <div className="w-full max-w-md">{children}</div>
            </div>

            {heroSrc && (
                <div className="relative hidden flex-1 lg:block">
                    <Image
                        src={heroSrc}
                        alt={heroAlt ?? ''}
                        fill
                        sizes="50vw"
                        className="object-cover"
                        priority
                    />
                </div>
            )}
        </div>
    );
}
