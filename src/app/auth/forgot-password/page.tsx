'use client'

import { useFormik } from 'formik';
import { useEffect, useState, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ClipboardEvent as ReactClipboardEvent } from 'react';
import * as yup from 'yup';
import { resetPasswordAction } from '../authServices';
import { ApiError } from '@/types/common';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { getErrorMessage } from '@/lib/apiError';
import { Eye, EyeOff, Check } from 'lucide-react';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

type Step = 'email' | 'otp' | 'password' | 'done';

function OtpInput({ value, onChange, disabled }: { value: string; onChange: (otp: string) => void; disabled?: boolean }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const boxes = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '');

  const focusBox = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))];
    el?.focus();
    el?.select();
  };

  const commit = (next: string[]) => onChange(next.join(''));

  const handleChange = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;
    const next = [...boxes];
    let idx = i;
    for (const d of digits) {
      if (idx >= OTP_LENGTH) break;
      next[idx] = d;
      idx++;
    }
    commit(next);
    focusBox(idx);
  };

  const handleKeyDown = (i: number, e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...boxes];
      if (next[i]) {
        next[i] = '';
        commit(next);
      } else if (i > 0) {
        next[i - 1] = '';
        commit(next);
        focusBox(i - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  const handlePaste = (e: ReactClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!digits) return;
    const next = Array.from({ length: OTP_LENGTH }, (_, k) => digits[k] ?? '');
    commit(next);
    focusBox(digits.length);
  };

  return (
    <div className="mt-1 flex gap-2">
      {boxes.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          data-testid={`otp-box-${i}`}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          className="h-14 w-full rounded-xl border border-input bg-background text-center text-lg font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        />
      ))}
    </div>
  );
}

export default function ForgotPasswordPage() {

  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Counts down once per second while a resend cooldown is active, regardless
  // of which step is showing (it only ever matters while on the OTP step).
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const emailFormik = useFormik({
    initialValues: { email: '' },
    validationSchema: yup.object({
      email: yup.string().email('Invalid email address').required('Email is required')
    }),
    onSubmit: async (values) => {
      setError('');
      setLoading(true);
      const { data, errors } = await resetPasswordAction(values.email);
      setLoading(false);
      if (errors || !data) {
        setError(errors?.map((err: ApiError) => err.message).join(' ') || 'Failed to send reset code');
        return;
      }
      setStep('otp');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    }
  });

  const handleResendCode = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError('');
    const { errors } = await resetPasswordAction(emailFormik.values.email);
    setResending(false);
    if (errors) {
      setError(errors.map((err: ApiError) => err.message).join(' ') || 'Failed to resend code');
      return;
    }
    otpFormik.resetForm();
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const otpFormik = useFormik({
    initialValues: { otp: '' },
    validationSchema: yup.object({
      otp: yup.string().matches(/^\d{6}$/, 'Enter the 6-digit code from your email').required('OTP is required')
    }),
    onSubmit: async (values) => {
      setError('');
      setLoading(true);
      try {
        await apiClient.post('/auth/verify-otp', {
          email: emailFormik.values.email,
          otp: values.otp.trim(),
        });
        setStep('password');
      } catch (err) {
        setError(getErrorMessage(err, 'Invalid or expired code'));
      } finally {
        setLoading(false);
      }
    }
  });

  const passwordFormik = useFormik({
    initialValues: { password: '', confirm: '' },
    validationSchema: yup.object({
      password: yup.string()
        .min(8, 'Password must be at least 8 characters')
        .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
        .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one symbol')
        .required('Password is required'),
      confirm: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Please confirm your password')
    }),
    onSubmit: async (values) => {
      setError('');
      setLoading(true);
      try {
        await apiClient.post('/auth/confirm-password', {
          email: emailFormik.values.email,
          new_password: values.password,
        });
        setStep('done');
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to reset password'));
      } finally {
        setLoading(false);
      }
    }
  });

  const heading: Record<Step, string> = {
    email: 'Reset Password',
    otp: 'Verify Code',
    password: 'New Password',
    done: 'All Set',
  };
  const subtitle: Record<Step, string> = {
    email: 'Reset your password',
    otp: `Enter the code sent to ${emailFormik.values.email}`,
    password: 'Choose a new password',
    done: 'Password updated'
  };

  return (
    <AuthSplitLayout heroSrc="/auth/hero.png" heroAlt="A tradesperson at work in their workshop">
      <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">{heading[step]}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle[step]}</p>

      {/* Step 1 — email */}
      {step === 'email' && (
        <form onSubmit={emailFormik.handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              data-testid="email-input"
              value={emailFormik.values.email}
              onChange={emailFormik.handleChange}
              onBlur={emailFormik.handleBlur}
              name="email"
              type="email"
              className="h-12 rounded-xl px-4 text-base"
              placeholder="Enter your email"
            />
            {(emailFormik.touched.email && emailFormik.errors.email) && <p className="text-sm text-destructive">{emailFormik.errors.email}</p>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base"
            disabled={!(emailFormik.isValid && emailFormik.dirty) || loading}
          >
            {loading ? 'Sending...' : 'Send Reset Code'}
          </Button>
          <button
            type="button"
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => router.push('/')}
            disabled={loading}
          >
            Back to login
          </button>
        </form>
      )}

      {/* Step 2 — OTP */}
      {step === 'otp' && (
        <form onSubmit={otpFormik.handleSubmit} className="mt-8 space-y-6">
          <div>
            <OtpInput
              value={otpFormik.values.otp}
              onChange={(otp) => { setError(''); otpFormik.setFieldValue('otp', otp); }}
              disabled={loading}
            />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Didn&apos;t get a code?{' '}
            {resendCooldown > 0 ? (
              <span>Resend in {resendCooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="cursor-pointer text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </button>
            )}
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base"
            disabled={!(otpFormik.isValid && otpFormik.dirty) || loading}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>
          <button
            type="button"
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => { setError(''); otpFormik.resetForm(); setResendCooldown(0); setStep('email'); }}
            disabled={loading}
          >
            Use a different email
          </button>
        </form>
      )}

      {/* Step 3 — new password */}
      {step === 'password' && (
        <form onSubmit={passwordFormik.handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                name="password"
                type={showPw ? 'text' : 'password'}
                value={passwordFormik.values.password}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                className="h-12 rounded-xl px-4 pr-11 text-base"
                placeholder="At least 8 characters"
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
            {(passwordFormik.touched.password && passwordFormik.errors.password) && <p className="text-sm text-destructive">{passwordFormik.errors.password}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                name="confirm"
                type="password"
                value={passwordFormik.values.confirm}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                className="h-12 rounded-xl px-4 text-base"
                placeholder="Confirm your new password"
              />
              {passwordFormik.values.confirm && passwordFormik.values.password === passwordFormik.values.confirm && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-success">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>
            {(passwordFormik.touched.confirm && passwordFormik.errors.confirm) && <p className="text-sm text-destructive">{passwordFormik.errors.confirm}</p>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base"
            disabled={!(passwordFormik.isValid && passwordFormik.dirty) || loading}
          >
            {loading ? 'Updating...' : 'Reset Password'}
          </Button>
        </form>
      )}

      {/* Step 4 — done */}
      {step === 'done' && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm">Your password has been reset successfully.</p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-4 inline-block text-sm text-primary hover:underline cursor-pointer"
          >
            Back to login
          </button>
        </div>
      )}
    </AuthSplitLayout>
  );
}
