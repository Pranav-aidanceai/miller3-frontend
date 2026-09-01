'use client';

import { Ban, Clock, ShieldAlert, UserCog, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SessionEndReason } from '@/lib/session';

export type SessionNoticeReason = SessionEndReason | 'rejected' | 'pending';

interface CopyEntry {
    icon: LucideIcon;
    tone: 'destructive' | 'primary';
    title: string;
    body: string;
    /** Secondary line shown only in the `page` variant, below the body. */
    note?: string;
}

const REASON_COPY: Record<SessionNoticeReason, CopyEntry> = {
    deactivated: {
        icon: ShieldAlert,
        tone: 'destructive',
        title: "You're being logged out",
        body: "Your account has been deactivated and you'll be signed out shortly. Please contact your admin for more information.",
    },
    'role-changed': {
        icon: UserCog,
        tone: 'destructive',
        title: 'Your account tier has changed',
        body: 'Your account tier has been changed. Redirecting you to the login page. For more information, please contact your admin.',
    },
    rejected: {
        icon: Ban,
        tone: 'destructive',
        title: 'Account Rejected',
        body: 'Your account access has been rejected by an administrator. If you believe this was a mistake, please reach out to us for assistance.',
        note: 'Contact the admin for more information.',
    },
    pending: {
        icon: Clock,
        tone: 'primary',
        title: 'Approval Pending',
        body: "Your account is pending admin approval. You'll be able to sign in once an administrator has reviewed and approved your access.",
        note: 'Contact your admin for more information.',
    },
};

// `deactivated` at login time (an account disabled before the user ever
// gets a session) reuses the same reason/copy as the mid-session one, but
// wants the fuller "page" presentation — the copy already reads fine
// either way, so no separate entry is needed.

type SessionEndedNoticeProps =
    | {
        variant: 'modal';
        reason: SessionEndReason;
    }
    | {
        variant: 'page';
        reason: SessionNoticeReason;
        onClose: () => void;
        adminEmail?: string;
    };

/**
 * Single presentational component for every "you can't use the app right
 * now" state: the mid-session forced-logout overlay (SessionGuard, driven
 * by the api/client.ts interceptor) and the login-time
 * deactivated/rejected/pending screens (src/app/auth/*).
 */
export function SessionEndedNotice(props: SessionEndedNoticeProps) {
    const copy = REASON_COPY[props.reason];
    const Icon = copy.icon;
    const toneClasses =
        copy.tone === 'destructive'
            ? 'bg-destructive/10 text-destructive'
            : 'bg-primary/10 text-primary';

    if (props.variant === 'modal') {
        return (
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-background p-6 shadow-2xl">
                    <div className="flex items-start gap-3">
                        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', toneClasses)}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">{copy.title}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const { onClose, adminEmail = 'info@miler3group.com' } = props;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="relative flex w-full max-w-md flex-col items-center rounded-lg border border-input bg-background px-6 py-10 text-center">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Close"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className={cn('flex h-16 w-16 items-center justify-center rounded-full', toneClasses)}>
                    <Icon className="h-8 w-8" />
                </div>

                <h2 className="mt-5 text-xl font-semibold">{copy.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
                {copy.note && <p className="mt-4 text-xs text-muted-foreground">{copy.note}</p>}

                <Button asChild className="mt-6 w-full">
                    <a href={`mailto:${adminEmail}`}>Contact Admin</a>
                </Button>
            </div>
        </div>
    );
}
