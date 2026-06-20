'use client'

import { useFormik } from 'formik';
import { useState, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ClipboardEvent as ReactClipboardEvent } from 'react';
import * as yup from 'yup';
import { resetPasswordAction } from '../authServices';
import { ApiError } from '@/types/common';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Eye, EyeOff, Check } from 'lucide-react';

const OTP_LENGTH = 6;

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
          className="h-16 w-full rounded-md border border-input bg-background text-center text-lg font-medium outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
      ))}
    </div>
  );
}


function extractError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const err = (payload as { error: unknown }).error;
    if (typeof err === 'string') {
      try {
        const parsed = JSON.parse(err);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.detail === 'string') return parsed.detail;
          if (Array.isArray(parsed.errors) && parsed.errors[0]?.message) return parsed.errors[0].message;
        }
      } catch {
        return err;
      }
      return err;
    }
  }
  return fallback;
}

export default function ForgotPasswordPage() {

  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const inputClass = "mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

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
    }
  });

  const otpFormik = useFormik({
    initialValues: { otp: '' },
    validationSchema: yup.object({
      otp: yup.string().matches(/^\d{6}$/, 'Enter the 6-digit code from your email').required('OTP is required')
    }),
    onSubmit: async (values) => {
      setError('');
      setLoading(true);
      try {
        await axios.post('/api/auth/verify-otp', {
          email: emailFormik.values.email,
          otp: values.otp.trim(),
        });
        setStep('password');
      } catch (err) {
        if (axios.isAxiosError(err) && err.response) {
          setError(extractError(err.response.data, 'Invalid or expired code'));
        } else {
          setError('Something went wrong. Please try again.');
        }
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
        await axios.post('/api/auth/confirm-password', {
          email: emailFormik.values.email,
          new_password: values.password,
        });
        setStep('done');
      } catch (err) {
        if (axios.isAxiosError(err) && err.response) {
          setError(extractError(err.response.data, 'Failed to reset password'));
        } else {
          setError('Something went wrong. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }
  });

  const subtitle: Record<Step, string> = {
    email: 'Reset your password',
    otp: `Enter the code sent to ${emailFormik.values.email}`,
    password: 'Choose a new password',
    done: 'Password updated'
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold"><span className="text-gradient">Miller3</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle[step]}</p>

        {/* Step 1 — email */}
        {step === 'email' && (
          <form onSubmit={emailFormik.handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input data-testid='email-input' value={emailFormik.values.email} onChange={emailFormik.handleChange} onBlur={emailFormik.handleBlur} name="email" type="email" className={inputClass} placeholder="Enter your email" />
              {(emailFormik.touched.email && emailFormik.errors.email) && <p className="text-sm text-destructive">{emailFormik.errors.email}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!(emailFormik.isValid && emailFormik.dirty) || loading}
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
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
          <form onSubmit={otpFormik.handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium">Verification Code</label>
              <OtpInput
                value={otpFormik.values.otp}
                onChange={(otp) => { setError(''); otpFormik.setFieldValue('otp', otp); }}
                disabled={loading}
              />
              {(otpFormik.values.otp.length > 0 && otpFormik.values.otp.length < OTP_LENGTH && otpFormik.errors.otp) && <p className="mt-2 text-sm text-destructive">{otpFormik.errors.otp}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!(otpFormik.isValid && otpFormik.dirty) || loading}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button
              type="button"
              className="block w-full text-center text-sm text-muted-foreground hover:text-foreground cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => { setError(''); otpFormik.resetForm(); setStep('email'); }}
              disabled={loading}
            >
              Use a different email
            </button>
          </form>
        )}

        {/* Step 3 — new password */}
        {step === 'password' && (
          <form onSubmit={passwordFormik.handleSubmit} className="mt-8 space-y-4">
            <div>
              <div className="relative">
                <label htmlFor="password" className="text-sm font-medium">New Password</label>
                <input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={passwordFormik.values.password}
                  onChange={passwordFormik.handleChange}
                  onBlur={passwordFormik.handleBlur}
                  className={inputClass}
                  placeholder="Enter your new password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-5/8 text-muted-foreground hover:text-foreground cursor-pointer">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {(passwordFormik.touched.password && passwordFormik.errors.password) && <p className="text-sm text-destructive">{passwordFormik.errors.password}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <input
                  name="confirm"
                  type="password"
                  value={passwordFormik.values.confirm}
                  onChange={passwordFormik.handleChange}
                  onBlur={passwordFormik.handleBlur}
                  className={inputClass}
                  placeholder="Confirm your new password"
                />
                {passwordFormik.values.confirm && passwordFormik.values.password === passwordFormik.values.confirm && (
                  <div className="absolute right-3 top-3/8 text-green-500">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
              {(passwordFormik.touched.confirm && passwordFormik.errors.confirm) && <p className="text-sm text-destructive">{passwordFormik.errors.confirm}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!(passwordFormik.isValid && passwordFormik.dirty) || loading}
            >
              {loading ? 'Updating...' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* Step 4 — done */}
        {step === 'done' && (
          <div className="mt-8 rounded-lg border border-border bg-card p-6 text-center">
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
      </div>
    </div>
  );
}
