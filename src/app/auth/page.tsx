'use client';

import { useState } from 'react';
import { Eye, EyeOff, Crown, User, Gift, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useFormik } from 'formik';
import { useTheme } from "next-themes";

const demoAccounts = [
  { email: 'free@miller3.demo', password: 'free123', role: 'FREE', label: 'Free', icon: Gift, desc: '20 searches/day', color: 'border-border bg-card hover:border-muted-foreground/30' },
  { email: 'standard@miller3.demo', password: 'standard123', role: 'STANDARD', label: 'Standard', icon: User, desc: '100 searches/day', color: 'border-warning/30 bg-warning/5 hover:border-warning/60' },
  { email: 'premium@miller3.demo', password: 'premium123', role: 'PREMIUM', label: 'Premium', icon: Crown, desc: '500 searches/day', color: 'border-primary/30 bg-primary/5 hover:border-primary/60' },
];

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const { theme, setTheme } = useTheme();

  const fillDemo = (account: typeof demoAccounts[0]) => {
    const payload = {
      tier: account.role
    }
    console.log("payload", payload)
    formik.setFieldValue('email', account.email)
    formik.setFieldValue('password', account.password)
    setError('');
  };

  const formik = useFormik({
    initialValues: {
      email: '',
      password: ''
    },
    onSubmit: (values) => {
      console.log("payload", values)
    }
  })

  return (
    <div className="flex min-h-screen">
      {/* Left - Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="bg-clip-text text-transparent bg-linear-to-r from-primary to-indigo-500">Miller3</span>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Toggle theme">
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
                onChange={formik.handleChange}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 placeholder:text-muted-foreground"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 placeholder:text-muted-foreground"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center justify-end">
              <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
            </div>
            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!(formik.isValid && formik.dirty)}
            >
              Sign In
            </button>
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
                  className={cn('flex flex-col items-start rounded-lg border p-3 transition-all cursor-pointer', acc.color)}
                >
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

      {/* Right - Visual */}
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