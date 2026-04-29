'use client';

import { useState } from 'react';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useFormik } from 'formik';
import { useRouter } from 'next/navigation';
import * as Yup from 'yup';
import { useTheme } from "next-themes";
import { demoLoginAction, loginAction } from '@/app/auth/authServices';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { demoAccounts } from '@/lib/constants';
import { ApiError } from '@/types/common';
import { toast } from 'sonner';

export default function LoginPage() {

  const router = useRouter();
  const dispatch = useAppDispatch()
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const { theme, setTheme } = useTheme();

  const fillDemo = async (account: typeof demoAccounts[0]) => {
    setError('');
    formik.setErrors({});
    setLoadingDemo(account.role)
    const { data, errors } = await demoLoginAction(account.role);
    if (errors || !data) {
      toast.error(errors?.[0].message || 'Failed to load demo credentials', {
        duration: 5000,
        position: 'bottom-right',
        className: '!bg-destructive !text-white !border-destructive',
      });
      return;
    }
    const { data: loginData, errors: loginErrors } = await loginAction(data.email, data.password);
    setLoadingDemo(null);
    if (loginErrors || !loginData) {
      toast.error(errors?.[0].message || 'Failed to login to demo account', {
        duration: 5000,
        position: 'bottom-right',
        className: '!bg-destructive !text-white !border-destructive',
      });
      return;
    }
    dispatch(setCredentials(loginData));
    router.push('/search');
  };

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
      const { data, errors } = await loginAction(values.email, values.password);
      setLoading(false);
      if (errors || !data) {
        const fieldErrors: Record<string, string> = {};
        errors?.forEach((err: ApiError) => {
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
      router.push('/search');
    }
  })

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-3xl font-bold tracking-tight flex gap-2">
            <span className="bg-clip-text text-transparent bg-linear-to-r from-primary to-indigo-500">Miller3</span>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colorS cursor-pointer" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
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
              disabled={!(formik.isValid && formik.dirty) || loading || Boolean(loadingDemo)}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or try a demo account</span></div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  onClick={() => fillDemo(acc)}
                  disabled={!!loadingDemo}
                  className={cn('relative flex flex-col items-start rounded-lg border p-3 transition-all cursor-pointer', acc.color)}
                >
                  {/* loading overlay */}
                  {loadingDemo === acc.role && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]">
                      <svg className="h-5 w-5 animate-spin text-foreground" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <acc.icon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{acc.label}</span>
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">{acc.desc}</span>
                </button>
              ))}
            </div>
          </div>

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
  );
}