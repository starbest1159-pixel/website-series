import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { loginWithPassword, registerAccount } from '../services/seriesApi';
import { UserSession } from '../types/series';
import { validateAuthForm } from '../utils/catalogLogic';
import { ResilientImage } from './ResilientImage';

interface LoginGateViewProps {
  onAuthenticated: (user: UserSession) => void;
}

export function LoginGateView({
  onAuthenticated,
}: LoginGateViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');

    const result = validateAuthForm({
      mode,
      displayName,
      email,
      password,
      confirmPassword,
    });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const user =
        mode === 'register'
          ? await registerAccount({
              name: displayName.trim(),
              email: email.trim(),
              password,
            })
          : await loginWithPassword({
              email: email.trim(),
              password,
            });
      onAuthenticated(user);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="login-gate-view"
      className="relative min-h-screen flex flex-col justify-between overflow-x-clip bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
    >
      {/* Subtle studio top ambient tint */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute top-0 left-0 right-0 z-0 w-full h-[220px] sm:h-[300px] overflow-hidden"
      >
        <div className="w-full h-full bg-gradient-to-b from-rose-100/70 via-rose-50/35 to-transparent dark:from-rose-950/35 dark:via-slate-950/40 dark:to-transparent" />
      </div>

      {/* Main Centered Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-3.5 py-6 sm:px-6 sm:py-10">
        <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-900/12 dark:shadow-black/50 border border-slate-200/90 dark:border-slate-800 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Brand Panel (Desktop) — High-Contrast Cinema Stage */}
          <div className="hidden md:flex md:col-span-5 flex-col items-center justify-between p-7 bg-gradient-to-b from-[#1E0818] via-[#2C0B23] to-[#140510] text-center relative overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,30,110,0.28) 0%, rgba(255,30,110,0) 70%)',
              }}
            />
            <div className="relative z-10 space-y-2.5 pt-1 flex flex-col items-center">
              <img
                src="/assets/bannlai/brand-logo-transparent.png"
                alt="Bannlai Series"
                className="w-52 h-auto object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,0.65)]"
              />
              <h1 className="font-display text-base font-extrabold text-white tracking-wide">
                เฉพาะสมาชิกเท่านั้น
              </h1>
              <p className="text-xs text-rose-100/80 leading-relaxed">
                เข้าสู่ระบบเพื่อรับชมคลังซีรีส์จีนพากย์ไทยอัปเดตล่าสุดครบทุกตอน
              </p>
            </div>

            <ResilientImage
              src="/assets/bannlai/05-chibi-mascot-with-cat.png"
              alt="มาสคอต Bannlai Series"
              className="relative z-10 w-40 h-40 rounded-3xl object-cover shadow-xl border-2 border-white/20 my-4 bg-white"
            />

            <p className="relative z-10 text-xs font-semibold text-rose-200/90 tracking-wide">
              พากย์ไทยเท่านั้น · คมชัดระดับ HD
            </p>
          </div>

          {/* Right Form Panel */}
          <div className="md:col-span-7 p-5 sm:p-8 space-y-4 sm:space-y-5">
            {/* Mobile Brand Header */}
            <div className="flex md:hidden flex-col items-center text-center space-y-2">
              <div className="px-5 py-3 rounded-2xl bg-gradient-to-b from-[#1E0818] to-[#2B0B22] shadow-md">
                <img
                  src="/assets/bannlai/brand-logo-transparent.png"
                  alt="Bannlai Series"
                  className="h-16 w-auto object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
                />
              </div>
              <h1 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
                เข้าสู่ระบบเพื่อเข้าใช้งาน
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                คลังซีรีส์พากย์ไทยอัปเดตล่าสุด สำหรับสมาชิกเท่านั้น
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-[#C9004E] dark:text-rose-300">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>ระบบสมาชิก Bannlai Series · พากย์ไทยเท่านั้น</span>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                  setServerError('');
                }}
                className={`h-10 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-[#FF1E6E] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrors({});
                  setServerError('');
                }}
                className={`h-10 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-[#FF1E6E] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                สมัครสมาชิก
              </button>
            </div>

            {serverError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300"
              >
                {serverError}
              </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5" noValidate>
              {mode === 'register' && (
                <div>
                  <label htmlFor="gate-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อผู้ใช้
                  </label>
                  <div className="relative">
                    <User
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      id="gate-name"
                      type="text"
                      autoComplete="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="กรอกชื่อผู้ใช้ของคุณ"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF1E6E]"
                    />
                  </div>
                  {errors.displayName && (
                    <p className="text-xs text-rose-600 mt-1">{errors.displayName}</p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="gate-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  อีเมล
                </label>
                <div className="relative">
                  <Mail
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="gate-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF1E6E]"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-600 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="gate-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="gate-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF1E6E]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-rose-600 mt-1">{errors.password}</p>
                )}
              </div>

              {mode === 'register' && (
                <div>
                  <label htmlFor="gate-confirm-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ยืนยันรหัสผ่าน
                  </label>
                  <div className="relative">
                    <Lock
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      id="gate-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF1E6E]"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-rose-600 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#E6005C] hover:brightness-110 disabled:opacity-70 text-white text-sm font-bold shadow-md shadow-rose-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                <span>{mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกและเข้าใช้งาน'}</span>
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
              {mode === 'login' ? 'ยังไม่มีบัญชีสมาชิก? ' : 'มีบัญชีสมาชิกอยู่แล้ว? '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setErrors({});
                  setServerError('');
                }}
                className="font-bold text-[#FF1E6E] hover:underline cursor-pointer"
              >
                {mode === 'login' ? 'สมัครสมาชิกเลย' : 'เข้าสู่ระบบ'}
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 py-4">
        <p className="text-center text-xs font-medium text-slate-600 dark:text-slate-400">
          Bannlai Series · ดูฟรี ครบทุกความบันเทิง
        </p>
      </footer>
    </div>
  );
}
