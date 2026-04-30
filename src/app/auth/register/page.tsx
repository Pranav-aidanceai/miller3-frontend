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

export default function RegisterPage() {

    const [error, setError] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [onboarding, setOnboarding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0);
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
                const { data, errors } = await registerAction(values.name, values.email, values.password, values.confirm, values.role);
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
                if (data.status === 'Approved by admin') {
                    setStep(2);
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
                <div className="flex min-h-screen items-center justify-center p-6">
                    <div className="w-full max-w-md">
                        <h1 className="text-2xl font-bold"><span className="text-gradient">Miller3</span></h1>
                        <p className="mt-1 text-sm text-muted-foreground">Create your account</p>
                        <form onSubmit={() => setOnboarding(true)} className="mt-8 space-y-4">
                            <div>
                                <label className="text-sm font-medium">Full Name</label>
                                <input
                                    value={formik.values.name}
                                    onChange={(e) => {
                                        formik.handleChange(e);
                                        setServerErrors(prev => ({ ...prev, name: '' }));
                                    }}
                                    onBlur={formik.handleBlur}
                                    name="name"
                                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Enter your name"
                                />
                                {(serverErrors.name || (formik.touched.name && formik.errors.name)) && <p className="text-sm text-destructive">{serverErrors.name || formik.errors.name}</p>}
                            </div>
                            <div>
                                <label className="text-sm font-medium">Email</label>
                                <input 
                                value={formik.values.email} onChange={(e) => {
                                    formik.handleChange(e);
                                    setServerErrors(prev => ({ ...prev, email: '' }));
                                }} onBlur={formik.handleBlur} name="email" type="email" className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Enter your email" />
                                {(serverErrors.email || (formik.touched.email && formik.errors.email)) && <p className="text-sm text-destructive">{serverErrors.email || formik.errors.email}</p>}
                            </div>
                            <div>
                                <div className="relative">
                                    <label htmlFor='password' className="text-sm font-medium">Password</label>
                                    <input
                                        id="password"
                                        name='password'
                                        type={showPw ? 'text' : 'password'}
                                        value={formik.values.password}
                                        onChange={(e) => {
                                            formik.handleChange(e);
                                            setServerErrors(prev => ({ ...prev, password: '' }));
                                        }}
                                        onBlur={formik.handleBlur}
                                        className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                                        placeholder="Enter your password"
                                    />
                                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-5/8 text-muted-foreground hover:text-foreground cursor-pointer">
                                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {(serverErrors.password || (formik.touched.password && formik.errors.password)) && <p className="text-sm text-destructive">{serverErrors.password || formik.errors.password}</p>}
                            </div>
                            <div>
                                <label className="text-sm font-medium">Confirm Password</label>
                                <div className="relative">
                                    <input value={formik.values.confirm} onChange={(e) => {
                                        formik.handleChange(e);
                                        setServerErrors(prev => ({ ...prev, confirm: '' }));
                                    }} onBlur={formik.handleBlur} name="confirm" type="password" placeholder="Confirm your password" className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                                    {formik.values.confirm && formik.values.password === formik.values.confirm && (
                                        <div className="absolute right-3 top-3/8 text-green-500">
                                            <Check className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                                {(serverErrors.confirm || (formik.touched.confirm && formik.errors.confirm)) && <p className="text-sm text-destructive">{serverErrors.confirm || formik.errors.confirm}</p>}
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={formik.values.touAccepted} onChange={formik.handleChange} name="touAccepted" className="rounded border-border cursor-pointer" />
                                I accept the <button type="button" className="text-primary hover:underline">Terms of Use</button>
                            </label>
                            {error && <p className={cn("text-sm text-destructive", error ? 'visible' : 'invisible')}>{error}</p>}
                            <button type="submit" disabled={!(formik.isValid && formik.dirty)} className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                Continue
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