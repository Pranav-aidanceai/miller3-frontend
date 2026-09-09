import Image from 'next/image';
import Link from 'next/link';

interface AuthSplitLayoutProps {
    children: React.ReactNode;
    heroSrc?: string;
    heroAlt?: string;
}


export function AuthSplitLayout({ children, heroSrc, heroAlt }: AuthSplitLayoutProps) {
    return (
        <div 
            className="relative flex min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat mix-blend-multiply"
            style={{ backgroundImage: "url('/auth/auth-page-bg.png')" }}
        >
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
