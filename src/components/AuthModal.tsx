import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, User, X } from 'lucide-react';
import { loginWithPassword, registerAccount } from '../services/seriesApi';
import { UserSession } from '../types/series';
import { validateAuthForm } from '../utils/catalogLogic';
import { ResilientImage } from './ResilientImage';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: UserSession) => void;
}

export function AuthModal({
  isOpen,
  initialMode,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [noticeMessage, setNoticeMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNoticeMessage('');
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
      onSuccess(user);
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-rose-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12">
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดหน้าต่างเข้าสู่ระบบ"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Left Mascot Visual Panel — High-Contrast Cinema Stage */}
        <div className="hidden md:flex md:col-span-5 flex-col items-center justify-between p-6 bg-gradient-to-b from-[#1E0818] via-[#2C0B23] to-[#140510] text-center">
          <div className="space-y-2.5 pt-2 flex flex-col items-center">
            <img
              src="/assets/bannlai/brand-logo-transparent.png"
              alt="Bannlai Series"
              className="w-48 h-auto object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,0.65)]"
            />
            <p className="text-sm font-bold text-white">
              เข้าสู่ระบบเพื่อรับชมแบบเต็มรูปแบบ
            </p>
          </div>

          <ResilientImage
            src="/assets/bannlai/05-chibi-mascot-with-cat.png"
            alt="มาสคอต Bannlai Series"
            className="w-44 h-44 rounded-3xl object-cover shadow-xl border-2 border-white/20 my-4 bg-white"
          />

          <p className="text-xs font-medium text-rose-200/90">
            ดูฟรี ครบทุกความบันเทิง · พากย์ไทยคมชัด 1080p
          </p>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-6 sm:p-8 space-y-5">
          <h2 id="auth-modal-title" className="sr-only">
            {mode === 'login' ? 'เข้าสู่ระบบ Bannlai Series' : 'สมัครสมาชิก Bannlai Series'}
          </h2>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrors({});
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

          {noticeMessage && (
            <div
              role="status"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs font-medium text-[#FF1E6E]"
            >
              {noticeMessage}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5" noValidate>
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="sr-only">
                  ชื่อผู้ใช้
                </label>
                <div className="relative">
                  <User
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="ชื่อผู้ใช้ของคุณ"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF1E6E]"
                  />
                </div>
                {errors.displayName && (
                  <p className="text-xs text-rose-600 mt-1">{errors.displayName}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="sr-only">
                อีเมลของคุณ
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="อีเมลของคุณ"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF1E6E]"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-600 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="auth-password" className="sr-only">
                รหัสผ่านของคุณ
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่านของคุณ"
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
                <label htmlFor="auth-confirm-password" className="sr-only">
                  ยืนยันรหัสผ่าน
                </label>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? 'text' : 'password'}
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

            {mode === 'login' && (
              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-[#FF1E6E] rounded"
                  />
                  <span>จดจำฉันไว้</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setNoticeMessage(
                      'กรอกอีเมลของคุณและรหัสผ่านอย่างน้อย 6 ตัวอักษรเพื่อเข้าสู่ระบบ'
                    )
                  }
                  className="text-[#FF1E6E] font-semibold hover:underline cursor-pointer"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#E6005C] hover:brightness-110 disabled:opacity-70 text-white text-sm font-bold shadow-md shadow-rose-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>{mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกเลย'}</span>
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            {mode === 'login' ? 'ยังไม่มีบัญชี? ' : 'มีบัญชีอยู่แล้ว? '}
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
    </div>
  );
}
