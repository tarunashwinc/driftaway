"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, ChevronLeft } from "lucide-react";
import { useAuthStore } from "../../../stores/authStore";
import { api } from "../../../lib/api";

interface SendOtpResponse {
  data: { devOtp?: string };
}
interface VerifyOtpResponse {
  data: {
    accessToken: string;
    user: { id: string; phone: string; name: string; role: string };
    isNewUser: boolean;
  };
}

// Format 10-digit number for display: 98765 43210
function formatDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 5) return d;
  return d.slice(0, 5) + " " + d.slice(5);
}

// Validate Indian mobile: 10 digits, starts with 6-9
function isValidIndianMobile(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [digits, setDigits] = useState(""); // raw 10 digits only
  const [fullPhone, setFullPhone] = useState(""); // +91XXXXXXXXXX sent to API
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus inputs when step changes
  useEffect(() => {
    if (step === "phone") phoneInputRef.current?.focus();
    else otpInputRef.current?.focus();
  }, [step]);

  // Fixed OTP hint (last 6 digits of phone — matches backend dev bypass)
  const fixedOtpHint = fullPhone.replace(/\D/g, "").slice(-6);

  function handlePhoneInput(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip non-digits, cap at 10
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setDigits(raw);
    setError(null);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidIndianMobile(digits)) {
      setError("Enter a valid 10-digit Indian mobile number");
      return;
    }
    const phone = `+91${digits}`;
    setLoading(true);
    setError(null);
    try {
      await api.post<SendOtpResponse>("/auth/otp/send", { phone });
      setFullPhone(phone);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<VerifyOtpResponse>("/auth/otp/verify", {
        phone: fullPhone,
        code: otp,
      });
      setAuth(res.data.user, res.data.accessToken);
      router.replace("/trips");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(val);
    setError(null);
  }

  const isPhoneValid = isValidIndianMobile(digits);

  return (
    <div className="flex flex-col gap-6">
      {/* Logo */}
      <div className="text-center mb-2">
        <div className="w-16 h-16 rounded-3xl bg-[#FF6B35] flex items-center justify-center text-3xl mx-auto mb-4 shadow-[0_8px_24px_rgba(255,107,53,0.4)]">
          ✈️
        </div>
        <h1
          className="text-3xl font-bold text-white tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          DriftAway
        </h1>
        <p className="text-white/50 text-sm mt-1">plan less. live more.</p>
      </div>

      {/* Card */}
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/15 shadow-float">
        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
            <div className="mb-1">
              <h2
                className="text-lg font-bold text-white"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Welcome back
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Enter your mobile number to continue
              </p>
            </div>

            {/* India phone input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                Mobile Number
              </label>

              {/* Input pill with flag prefix */}
              <div
                className={`flex items-center rounded-2xl border transition-all overflow-hidden ${
                  error
                    ? "border-red-400/60 bg-red-900/10"
                    : isPhoneValid
                    ? "border-[#06D6A0]/60 bg-white/10"
                    : "border-white/20 bg-white/10"
                }`}
                style={{ backdropFilter: "blur(8px)" }}
              >
                {/* Flag + dial code — fixed, non-editable */}
                <div className="flex items-center gap-2 px-4 py-3.5 border-r border-white/15 shrink-0">
                  <span className="text-xl leading-none">🇮🇳</span>
                  <span className="text-white font-bold text-base tracking-wide">+91</span>
                </div>

                {/* 10-digit input */}
                <input
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={formatDisplay(digits)}
                  onChange={handlePhoneInput}
                  maxLength={11} // 10 digits + 1 space
                  autoComplete="tel-national"
                  className="flex-1 px-4 py-3.5 bg-transparent text-white placeholder-white/25 focus:outline-none text-lg font-semibold tracking-wide min-w-0"
                />

                {/* Valid indicator */}
                {isPhoneValid && (
                  <div className="pr-4 shrink-0">
                    <div className="w-5 h-5 rounded-full bg-[#06D6A0] flex items-center justify-center">
                      <svg
                        width="10"
                        height="8"
                        viewBox="0 0 10 8"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="#1A1A2E"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-400 px-1">{error}</p>
              )}

              <p className="text-xs text-white/30 px-1">
                India only · SMS OTP will be sent to this number
              </p>
            </div>

            <button
              type="submit"
              disabled={!isPhoneValid || loading}
              className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-base font-bold transition-all active:scale-[0.97] ${
                isPhoneValid && !loading
                  ? "bg-[#FF6B35] text-white shadow-[0_4px_16px_rgba(255,107,53,0.4)]"
                  : "bg-white/10 text-white/30 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4 text-white/70"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Sending OTP…
                </>
              ) : (
                <>
                  Send OTP
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
            <div className="mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#06D6A0]/20 flex items-center justify-center shrink-0">
                  <KeyRound size={18} className="text-[#06D6A0]" />
                </div>
                <div>
                  <h2
                    className="text-lg font-bold text-white"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Enter OTP
                  </h2>
                  <p className="text-xs text-white/50">
                    Sent to{" "}
                    <span className="text-white font-semibold">
                      🇮🇳 +91 {formatDisplay(digits)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Dev OTP hint */}
            {fixedOtpHint && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#06D6A0]/15 border border-[#06D6A0]/25">
                <span className="text-xs text-[#06D6A0]/70 font-medium">Dev OTP</span>
                <span className="text-base font-bold text-[#06D6A0] tracking-[0.2em]">
                  {fixedOtpHint}
                </span>
              </div>
            )}

            {/* OTP input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                6-digit code
              </label>
              <input
                ref={otpInputRef}
                type="tel"
                inputMode="numeric"
                placeholder="• • • • • •"
                value={otp}
                onChange={handleOtpInput}
                maxLength={6}
                autoComplete="one-time-code"
                className="w-full px-4 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#06D6A0]/50 focus:border-[#06D6A0]/50 transition-all text-3xl font-bold tracking-[0.6em] text-center"
              />
              {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={otp.length !== 6 || loading}
              className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-base font-bold transition-all active:scale-[0.97] ${
                otp.length === 6 && !loading
                  ? "bg-[#06D6A0] text-[#1A1A2E] shadow-[0_4px_16px_rgba(6,214,160,0.3)]"
                  : "bg-white/10 text-white/30 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Verifying…
                </>
              ) : (
                <>
                  Verify & Login
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError(null);
              }}
              className="flex items-center justify-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mx-auto"
            >
              <ChevronLeft size={15} />
              Change number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
