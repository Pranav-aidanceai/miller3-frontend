'use client'

import { useFormik } from 'formik';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import * as Yup from 'yup';
import OnboardingPage from './Onboarding';
import { cn } from '@/lib/utils';

export default function RegisterPage() {

    const [error, setError] = useState('');
    const [onboarding, setOnboarding] = useState(false);

    const formik = useFormik({
        initialValues: {
            name: '',
            email: '',
            password: '',
            confirm: '',
            touAccepted: false
        },
        validationSchema: Yup.object({
            name: Yup.string().min(2, 'Name must be at least 2 characters').required('Full name is required'),
            email: Yup.string().email('Invalid email address').required('Email is required'),
            password: Yup.string()
                .min(8, 'Password must be at least 8 characters')
                .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
                .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
                .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one symbol')
                .required('Password is required'),
            confirm: Yup.string().oneOf([Yup.ref('password')], 'Passwords must match').required('Please confirm your password'),
            touAccepted: Yup.boolean().oneOf([true], 'You must accept the Terms of Use')
        }),
        onSubmit: (values) => {
            try {
                console.log("payload", values)
                toast.success('Account created successfully!');
                formik.resetForm();
                setOnboarding(true);
            } catch (error: unknown) {
                setError(error instanceof Error ? error.message : 'An unexpected error occurred');
            }
        }
    })

    const hasLower = /[a-z]/.test(formik.values.password);
    const hasUpper = /[A-Z]/.test(formik.values.password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formik.values.password);
    const hasLength = formik.values.password.length >= 8;

    const strength = (hasLower && hasUpper && hasSymbol && hasLength) ? 3 : (hasLength && (hasLower || hasUpper) && hasSymbol) ? 2 : (hasLength && (hasLower || hasUpper)) ? 1 : 0;
    const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][strength];
    const strengthColor = ['bg-muted', 'bg-destructive', 'bg-warning', 'bg-success'][strength];

    return (
        <>
            {onboarding ? <OnboardingPage /> :
                <div className="flex min-h-screen items-center justify-center p-6">
                    <div className="w-full max-w-md">
                        <h1 className="text-2xl font-bold"><span className="text-gradient">Miller3</span></h1>
                        <p className="mt-1 text-sm text-muted-foreground">Create your account</p>
                        <form onSubmit={formik.handleSubmit} className="mt-8 space-y-4">
                            <div>
                                <label className="text-sm font-medium">Full Name</label>
                                <input value={formik.values.name} onChange={formik.handleChange} name="name" className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Jane Doe" />
                                {(formik.touched.name && formik.errors.name) && <p className={cn("text-sm text-destructive", formik.errors.name ? 'visible' : 'invisible')}>{formik.errors.name}</p>}
                            </div>
                            <div>
                                <label className="text-sm font-medium">Email</label>
                                <input value={formik.values.email} onChange={formik.handleChange} name="email" type="email" className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="you@company.com" />
                                {(formik.touched.email && formik.errors.email) && <p className={cn("text-sm text-destructive", formik.errors.email ? 'visible' : 'invisible')}>{formik.errors.email}</p>}
                            </div>
                            <div>
                                <label className="text-sm font-medium">Password</label>
                                <input value={formik.values.password} onChange={formik.handleChange} name="password" type="password" className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                                {(formik.touched.password && formik.errors.password) && <p className={cn("text-sm text-destructive", formik.errors.password ? 'visible' : 'invisible')}>{formik.errors.password}</p>}
                                {formik.values.password && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="flex flex-1 gap-1">
                                            {[1, 2, 3].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? strengthColor : 'bg-muted'}`} />)}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{strengthLabel}</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium">Confirm Password</label>
                                <input value={formik.values.confirm} onChange={formik.handleChange} name="confirm" type="password" className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                                {(formik.touched.confirm && formik.errors.confirm) && <p className={cn("text-sm text-destructive", formik.errors.confirm ? 'visible' : 'invisible')}>{formik.errors.confirm}</p>}
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={formik.values.touAccepted} onChange={formik.handleChange} name="touAccepted" className="rounded border-border cursor-pointer" />
                                I accept the <button type="button" className="text-primary hover:underline">Terms of Use</button>
                            </label>
                            {error && <p className={cn("text-sm text-destructive", error ? 'visible' : 'invisible')}>{error}</p>}
                            <button type="submit" disabled={!(formik.isValid && formik.dirty)} className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                Create Account
                            </button>
                        </form>
                        <p className="mt-6 text-center text-sm text-muted-foreground">
                            Already have an account? <Link href="/auth" className="text-primary hover:underline">Sign in</Link>
                        </p>
                    </div>
                </div>
            }
        </>
    );
}