'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useFormik } from 'formik';
import { useRouter } from 'next/navigation';
import * as Yup from 'yup';
import { loginAction } from '@/app/auth/authServices';
import { useAppDispatch } from '@/store/hooks';
import { logout, setCredentials } from '@/store/slices/authSlice';
import { clearLowCreditsBannerDismissal } from '@/lib/session';
import { ApiError } from '@/types/common';
import TermsModal from './auth/register/TermsOfUse';
import ApprovalPending from './auth/ApprovalPending';
import AccountRejected from './auth/AccountRejected';
import AccountDeactivated from './auth/AccountDeactivated';
import apiClient from '@/lib/api/client';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginForm() {

  const router = useRouter();
  const dispatch = useAppDispatch()
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showTouModal, setShowTouModal] = useState<boolean>(false);
  const [showApproval, setShowApproval] = useState<boolean>(false);
  const [showRejected, setShowRejected] = useState<boolean>(false);
  const [showDeactivated, setShowDeactivated] = useState<boolean>(false);
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
      setServerErrors({});
      setLoading(true);
      const { data, errors } = await loginAction(values.email, values.password);
      setLoading(false);
      if (errors || !data) {
        const fieldErrors: Record<string, string> = {};
        errors?.forEach((err: ApiError) => {
          if (err?.code === "ACCOUNT_PENDING") {
            setShowApproval(true);
            return;
          }

          if (err?.code === "ACCOUNT_REJECTED") {
            setShowRejected(true);
            return;
          }

          if (err?.code === "ACCOUNT_INACTIVE") {
            setShowDeactivated(true);
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
      // Every login gets the low-credit banner back, even if the previous
      // session on this tab closed it.
      clearLowCreditsBannerDismissal();
      if (data?.user_details?.tou_accepted === false) {
        setShowTouModal(true);
        return;
      }
      router.push('/search');
    }
  })

  const handleTouAccept = async () => {
    try {
      await apiClient.post('/auth/user-agreement', {});
      setShowTouModal(false);
      router.push('/search');
    } catch (error) {
      console.error('Error accepting Terms of Use:', error);
      setError('Failed to accept the Terms of Use. Please try again.');
    }
  }

  return (
    <>
      <AuthSplitLayout heroSrc="/auth/hero.png" heroAlt="A tradesperson at work in their workshop">
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">Sign In</h1>
        <p className="mt-2 text-sm text-muted-foreground">Find any vendor. Enrich any record.</p>

        <form onSubmit={formik.handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formik.values.email}
              onChange={(e) => {
                formik.handleChange(e);
                setServerErrors(prev => ({ ...prev, email: '' }));
              }}
              onBlur={formik.handleBlur}
              className="h-12 rounded-xl px-4 text-base"
              placeholder="Example@email.com"
            />
            {(serverErrors.email || (formik.touched.email && formik.errors.email)) && (
              <p className="text-sm text-destructive">{serverErrors.email || formik.errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
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
                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {(serverErrors.password || (formik.touched.password && formik.errors.password)) && (
              <p className="text-sm text-destructive">{serverErrors.password || formik.errors.password}</p>
            )}
          </div>
          <div className="flex items-center justify-end">
            <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
          </div>
          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base"
            disabled={!(formik.isValid && formik.dirty) || loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account? <Link href="/auth/register" className="text-primary hover:underline">Sign up</Link>
        </p>
      </AuthSplitLayout>
      {showTouModal &&
        <TermsModal
          onAccept={() => handleTouAccept()}
          onClose={async () => {
            const { data } = await apiClient.post('/delete-cookie');
            if (data?.success) {
              dispatch(logout());
              setShowTouModal(false);
            }
          }}
        />}
      {showApproval && <ApprovalPending onClose={() => setShowApproval(false)} />}
      {showRejected && <AccountRejected onClose={() => setShowRejected(false)} />}
      {showDeactivated && <AccountDeactivated onClose={() => setShowDeactivated(false)} />}
    </>
  );
}
