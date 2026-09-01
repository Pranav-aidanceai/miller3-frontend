'use client'

import { useFormik } from 'formik';
import Link from 'next/link';
import { useState } from 'react';
import * as Yup from 'yup';
import OnboardingPage from './Onboarding';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Check } from 'lucide-react';
import { registerAction } from '../authServices';
import { ApiError } from '@/types/common';
import TermsModal from './TermsOfUse';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {

    const [error, setError] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [onboarding, setOnboarding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0);
    const [showTerms, setShowTerms] = useState(false)
    const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

    const formik = useFormik({
        initialValues: {
            name: '',
            email: '',
            password: '',
            confirm: '',
            role: 'Free',
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
        onSubmit: async (values) => {
            try {
                formik.setErrors({});
                setError('');
                setServerErrors({});
                setLoading(true);
                const { data, errors } = await registerAction(values.name, values.email, values.password, values.confirm, values.role, values.touAccepted);
                setLoading(false);
                if (errors || !data) {
                    setOnboarding(false);
                    const fieldErrors: Record<string, string> = {};
                    errors?.forEach((err: ApiError) => {
                        if (err.field) {
                            fieldErrors[err.field] = err.message;
                        } else {
                            setError(prev => prev + err.message)
                        }
                    })
                    setServerErrors(fieldErrors);
                    formik.resetForm({
                        values: {
                            name: values.name,
                            email: values.email,
                            password: '',
                            confirm: '',
                            role: 'Free',
                            touAccepted: false
                        }
                    });
                    return;
                }
                if (data.status === "APPROVAL_PENDING") {
                    setStep(2);
                } else {
                    setStep(3);
                }
            } catch (error: unknown) {
                setError(error instanceof Error ? error.message : 'An unexpected error occurred');
            }
        }
    })

    return (
        <>
            {onboarding ?
                <OnboardingPage
                    selectedTier={formik.values.role}
                    onTierSelect={(role) => formik.setFieldValue('role', role)}
                    onSubmit={formik.handleSubmit}
                    step={step}
                    setStep={setStep}
                    loading={loading}
                /> :
                <AuthSplitLayout heroSrc="/auth/hero.png" heroAlt="A tradesperson at work in their workshop">
                    <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">Sign Up</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Create your account</p>
                    <form
                        onSubmit={(e) => {
                            // The tier/role is chosen on the next (onboarding) screen, so this
                            // form's own submit only advances the wizard — the actual
                            // registerAction call happens from OnboardingPage's step-1
                            // "Continue" button (wired to formik.handleSubmit via `onSubmit`
                            // below). preventDefault stops the browser's native form
                            // submission (a full navigation) since nothing here is meant to.
                            e.preventDefault();
                            setOnboarding(true);
                        }}
                        className="mt-8 space-y-6"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                value={formik.values.name}
                                onChange={(e) => {
                                    formik.handleChange(e);
                                    setServerErrors(prev => ({ ...prev, name: '' }));
                                }}
                                onBlur={formik.handleBlur}
                                name="name"
                                className="h-12 rounded-xl px-4 text-base"
                                placeholder="Enter your name"
                            />
                            {(serverErrors.name || (formik.touched.name && formik.errors.name)) && <p className="text-sm text-destructive">{serverErrors.name || formik.errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                value={formik.values.email}
                                onChange={(e) => {
                                    formik.handleChange(e);
                                    setServerErrors(prev => ({ ...prev, email: '' }));
                                }}
                                onBlur={formik.handleBlur}
                                name="email"
                                type="email"
                                className="h-12 rounded-xl px-4 text-base"
                                placeholder="Enter your email"
                            />
                            {(serverErrors.email || (formik.touched.email && formik.errors.email)) && <p className="text-sm text-destructive">{serverErrors.email || formik.errors.email}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name='password'
                                    type={showPw ? 'text' : 'password'}
                                    value={formik.values.password}
                                    onChange={(e) => {
                                        formik.handleChange(e);
                                        setServerErrors(prev => ({ ...prev, password: '' }));
                                    }}
                                    onBlur={formik.handleBlur}
                                    className="h-12 rounded-xl px-4 pr-11 text-base"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                    aria-label={showPw ? 'Hide password' : 'Show password'}
                                >
                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {(serverErrors.password || (formik.touched.password && formik.errors.password)) && <p className="text-sm text-destructive">{serverErrors.password || formik.errors.password}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirm"
                                    value={formik.values.confirm}
                                    onChange={(e) => {
                                        formik.handleChange(e);
                                        setServerErrors(prev => ({ ...prev, confirm: '' }));
                                    }}
                                    onBlur={formik.handleBlur}
                                    name="confirm"
                                    type="password"
                                    placeholder="Confirm your password"
                                    className="h-12 rounded-xl px-4 pr-11 text-base"
                                />
                                {formik.values.confirm && formik.values.password === formik.values.confirm && (
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-success">
                                        <Check className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                            {(serverErrors.confirm || (formik.touched.confirm && formik.errors.confirm)) && <p className="text-sm text-destructive">{serverErrors.confirm || formik.errors.confirm}</p>}
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={formik.values.touAccepted} onChange={() => setShowTerms(true)} name="touAccepted" className="rounded border-border cursor-pointer" />
                            I accept the <button type="button" onClick={() => setShowTerms(true)} className="text-primary hover:underline">Terms of Use</button>
                        </label>
                        {error && <p className={cn("text-sm text-destructive", error ? 'visible' : 'invisible')}>{error}</p>}
                        <Button type="submit" disabled={!(formik.isValid && formik.dirty)} className="h-12 w-full rounded-xl text-base">
                            Continue
                        </Button>
                    </form>
                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Already have an account? <Link href="/" className="text-primary hover:underline">Sign in</Link>
                    </p>
                </AuthSplitLayout>
            }

            {showTerms && (
                <TermsModal
                    onAccept={() => {
                        formik.setFieldValue('touAccepted', true)
                        setShowTerms(false)
                    }}
                    onClose={() => setShowTerms(false)}
                />
            )}
        </>
    );
}