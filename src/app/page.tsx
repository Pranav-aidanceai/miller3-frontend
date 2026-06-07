'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useFormik } from 'formik';
import { useRouter } from 'next/navigation';
import * as Yup from 'yup';
import { loginAction } from '@/app/auth/authServices';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { ApiError } from '@/types/common';
import TermsModal from './auth/register/TermsOfUse';
import ApprovalPending from './auth/ApprovalPending';
import axios from 'axios';

export default function LoginPage() {

  const router = useRouter();
  const dispatch = useAppDispatch()
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showTouModal, setShowTouModal] = useState<boolean>(false);
  const [showApproval, setShowApprval] = useState<boolean>(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const formik = useFormik({
    initialValues: {
      email: '',
      password: ''
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Email is required'),
      password: Yup.string().required('Password is required')
    }),
    onSubmit: async (values) => {
      formik.setErrors({});
      setError('');
      setLoading(true);
      setServerErrors({});
      const { data, errors } = await loginAction(values.email, values.password);
      setLoading(false);
      if (errors || !data) {
        const fieldErrors: Record<string, string> = {};
        errors?.forEach((err: ApiError) => {

          if (err?.code === "YOUR_ACCOUNT_IS_PENDING_ADMIN_APPROVAL.") {
            setShowApprval(true);
            return;
          }

          if (err.field) {
            fieldErrors[err.field] = err.message;
          } else {
            setError(prev => prev + err.message)
          }
        })
        setServerErrors(fieldErrors);
        return;
      }
      dispatch(setCredentials(data));
      if (data?.user_details?.tou_accepted === false) {
        setShowTouModal(true);
        return;
      }
      router.push('/search');
    }
  })

  const handleTouAccept = async () => {
    try {
      await axios.post('/api/auth/user-agreement', {});
      setShowTouModal(false);
      router.push('/search');
    } catch (error) {
      setError('Failed to accept the Terms of Use. Please try again.');
    }
  }

  return (
    <>
      <div className="flex min-h-screen">
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20">
          <div className="mx-auto w-full max-w-md">
            <h1 className="text-3xl font-bold tracking-tight flex gap-2">
              <span className="bg-clip-text text-transparent bg-linear-to-r from-primary to-indigo-500">Miller3</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Find any vendor. Enrich any record.</p>

            <form onSubmit={formik.handleSubmit} className={'mt-8 space-y-4'}>
              <div>
                <label className="text-sm font-medium" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={formik.values.email}
                  onChange={(e) => {
                    formik.handleChange(e);
                    setServerErrors(prev => ({ ...prev, email: '' }));
                  }}
                  onBlur={formik.handleBlur}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 placeholder:text-muted-foreground"
                  placeholder="Enter your email"
                />
                {(serverErrors.email || (formik.touched.email && formik.errors.email)) && (
                  <p className="mt-1 text-sm text-destructive">{serverErrors.email || formik.errors.email}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    value={formik.values.password}
                    onChange={(e) => {
                      formik.handleChange(e);
                      setServerErrors(prev => ({ ...prev, password: '' }));
                    }}
                    onBlur={formik.handleBlur}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 placeholder:text-muted-foreground"
                    placeholder="Enter your password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {(serverErrors.password || (formik.touched.password && formik.errors.password)) && (
                  <p className="mt-1 text-sm text-destructive">{serverErrors.password || formik.errors.password}</p>
                )}
              </div>
              <div className="flex items-center justify-end">
                <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
              </div>
              <button
                type="submit"
                className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!(formik.isValid && formik.dirty) || loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account? <Link href="/auth/register" className="text-primary hover:underline">Sign up</Link>
            </p>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 items-center justify-center bg-linear-to-br from-primary/10 via-background to-indigo-500/10 relative overflow-hidden">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />
          <div className="relative z-10 text-center">
            <div className="text-6xl font-bold text-gradient">25M+</div>
            <p className="mt-2 text-lg text-muted-foreground">Companies in our database</p>
            <div className="mt-8 flex gap-4 justify-center">
              {['NAICS Codes', 'Contact Info', 'Revenue Data', 'Demographics'].map(tag => (
                <span key={tag} className="rounded-pill border border-border bg-card px-3 py-1 text-xs font-medium">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showTouModal && <TermsModal onAccept={() => handleTouAccept()} onClose={() => setShowTouModal(false)} />}
      {showApproval && <ApprovalPending onClose={() => {
        setShowApprval(false)
        formik.resetForm();
      }} />}
    </>
  );
}