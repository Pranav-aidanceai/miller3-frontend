'use client'

import { cn } from '@/lib/utils';
import { useFormik } from 'formik';
import Link from 'next/link';
import { useState } from 'react';
import * as yup from 'yup';

export default function ForgotPasswordPage() {

  const [sent, setSent] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: ''
    },
    validationSchema: yup.object({
      email: yup.string().email('Invalid email address').required('Email is required')
    }),
    onSubmit: (values) => {
      console.log("payload", values)
      setSent(true);
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold"><span className="text-gradient">Miller3</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">Reset your password</p>
        {sent ? (
          <div className="mt-8 rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-sm">If an account exists for <strong>{formik.values.email}</strong>, you will receive a reset link.</p>
            <Link href="/auth" className="mt-4 inline-block text-sm text-primary hover:underline">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={formik.handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input value={formik.values.email} onChange={formik.handleChange} name="email" type="email" className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="you@company.com" />
              {(formik.touched.email && formik.errors.email) && <p className={cn("text-sm text-destructive", formik.errors.email ? 'visible' : 'invisible')}>{formik.errors.email}</p>}
            </div>
            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!(formik.isValid && formik.dirty)}
            >
              Send Reset Link
            </button>
            <Link href="/auth" className="block text-center text-sm text-muted-foreground hover:text-foreground">Back to login</Link>
          </form>
        )}
      </div>
    </div>
  );
}