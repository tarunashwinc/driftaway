"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { ArrowLeft, MapPin, CalendarDays, Wallet, Sparkles, Plane } from "lucide-react";
import Link from "next/link";
import { Input } from "../../../../components/ui/input";
import { api } from "../../../../lib/api";

const schema = z
  .object({
    title: z.string().min(1, "Trip name is required"),
    destination: z.string().min(1, "Destination is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    currency: z.string().length(3, "Select a currency"),
    budgetTotal: z.number().positive("Budget must be positive").optional(),
    aiProvider: z.enum(["claude", "openai", "gemini"]),
  })
  .refine((d) => !d.endDate || !d.startDate || d.endDate >= d.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type FormData = z.infer<typeof schema>;

interface CreateTripResponse {
  success: boolean;
  data: { id: string };
}

const CURRENCIES = [
  "INR", "USD", "EUR", "GBP", "JPY", "SGD", "AED", "THB", "AUD", "CAD",
];

const AI_OPTIONS = [
  {
    value: "openai" as const,
    label: "GPT-4o",
    sublabel: "OpenAI",
    desc: "Best for creative, detailed itinerary ideas",
    emoji: "✨",
    accentColor: "#06D6A0",
  },
  {
    value: "claude" as const,
    label: "Claude",
    sublabel: "Anthropic",
    desc: "Great for thoughtful, in-depth planning",
    emoji: "🤖",
    accentColor: "#FF6B35",
  },
  {
    value: "gemini" as const,
    label: "Gemini",
    sublabel: "Google",
    desc: "Fast and concise trip plans",
    emoji: "⚡",
    accentColor: "#6C63FF",
  },
];

export default function NewTripPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: "INR",
      aiProvider: "openai",
    },
  });

  const selectedProvider = watch("aiProvider");

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const res = await api.post<CreateTripResponse>("/trips", data);
      router.push(`/trips/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trip");
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0EEE9" }}>
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 px-4 pt-12 pb-4 flex items-center gap-3"
        style={{
          backgroundColor: "#F0EEE9",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <Link href="/trips">
          <button
            type="button"
            className="w-9 h-9 rounded-2xl flex items-center justify-center active:scale-[0.93] transition-transform"
            style={{
              backgroundColor: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              WebkitTapHighlightColor: "transparent",
            }}
            aria-label="Back to trips"
          >
            <ArrowLeft size={18} style={{ color: "#1A1A2E" }} />
          </button>
        </Link>
        <div>
          <h1
            className="text-lg font-bold leading-none"
            style={{ fontFamily: "Outfit, sans-serif", color: "#1A1A2E" }}
          >
            Plan a Trip
          </h1>
          <p
            className="text-xs mt-0.5"
            style={{ color: "#9CA3AF", fontFamily: "Space Grotesk, sans-serif" }}
          >
            Fill in the details below
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="px-4 pt-5 pb-10 flex flex-col gap-4 max-w-[480px] mx-auto"
      >
        {/* Section: Trip Details */}
        <div
          className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_16px_rgba(0,0,0,0.08)] overflow-hidden"
        >
          <div
            className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-black/5"
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,107,53,0.12)" }}
            >
              <MapPin size={14} style={{ color: "#FF6B35" }} />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#9CA3AF", fontFamily: "Space Grotesk, sans-serif" }}
            >
              Trip Details
            </span>
          </div>
          <div className="px-4 pb-4 pt-3 flex flex-col gap-4">
            <Input
              label="Trip name"
              placeholder="Summer in Bali 🌴"
              {...register("title")}
              error={errors.title?.message}
            />
            <Input
              label="Destination"
              placeholder="Bali, Indonesia"
              {...register("destination")}
              error={errors.destination?.message}
            />
          </div>
        </div>

        {/* Section: Dates */}
        <div
          className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_16px_rgba(0,0,0,0.08)] overflow-hidden"
        >
          <div
            className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-black/5"
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(6,214,160,0.12)" }}
            >
              <CalendarDays size={14} style={{ color: "#06D6A0" }} />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#9CA3AF", fontFamily: "Space Grotesk, sans-serif" }}
            >
              Dates
            </span>
          </div>
          <div className="px-4 pb-4 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start date"
                type="date"
                {...register("startDate")}
                error={errors.startDate?.message}
              />
              <Input
                label="End date"
                type="date"
                {...register("endDate")}
                error={errors.endDate?.message}
              />
            </div>
          </div>
        </div>

        {/* Section: Budget */}
        <div
          className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_16px_rgba(0,0,0,0.08)] overflow-hidden"
        >
          <div
            className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-black/5"
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(108,99,255,0.12)" }}
            >
              <Wallet size={14} style={{ color: "#6C63FF" }} />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#9CA3AF", fontFamily: "Space Grotesk, sans-serif" }}
            >
              Budget
            </span>
          </div>
          <div className="px-4 pb-4 pt-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Currency select — styled to match inputs */}
              <div className="flex flex-col gap-1">
                <label
                  className="text-sm font-medium"
                  style={{ color: "#1A1A2E", fontFamily: "Space Grotesk, sans-serif" }}
                >
                  Currency
                </label>
                <select
                  {...register("currency")}
                  className="w-full py-3 px-4 rounded-xl border bg-white text-base transition-colors focus:outline-none"
                  style={{
                    borderColor: errors.currency ? "#F87171" : "#E5E7EB",
                    color: "#1A1A2E",
                    fontFamily: "Space Grotesk, sans-serif",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#FF6B35";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(255,107,53,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors.currency
                      ? "#F87171"
                      : "#E5E7EB";
                    e.currentTarget.style.boxShadow =
                      "0 1px 2px rgba(0,0,0,0.04)";
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.currency && (
                  <p
                    className="text-sm"
                    style={{ color: "#EF4444" }}
                  >
                    {errors.currency.message}
                  </p>
                )}
              </div>
              <Input
                label="Total budget"
                type="number"
                placeholder="50000"
                min={0}
                {...register("budgetTotal", { valueAsNumber: true })}
                error={errors.budgetTotal?.message}
              />
            </div>
          </div>
        </div>

        {/* Section: AI Provider */}
        <div
          className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_16px_rgba(0,0,0,0.08)] overflow-hidden"
        >
          <div
            className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-black/5"
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,107,53,0.12)" }}
            >
              <Sparkles size={14} style={{ color: "#FF6B35" }} />
            </div>
            <div>
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#9CA3AF", fontFamily: "Space Grotesk, sans-serif" }}
              >
                AI Planner
              </span>
              <p
                className="text-[11px] mt-0.5"
                style={{ color: "#9CA3AF", fontFamily: "Space Grotesk, sans-serif" }}
              >
                Choose the AI model to generate your itinerary
              </p>
            </div>
          </div>

          <div className="px-4 pb-4 pt-3 flex flex-col gap-2.5">
            {AI_OPTIONS.map((opt) => {
              const isSelected = selectedProvider === opt.value;
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all active:scale-[0.98]"
                  style={{
                    borderColor: isSelected ? "#FF6B35" : "rgba(0,0,0,0.08)",
                    backgroundColor: isSelected
                      ? "rgba(255,107,53,0.05)"
                      : "white",
                    boxShadow: isSelected
                      ? "0 0 0 1.5px #FF6B35, 0 2px_8px rgba(255,107,53,0.12)"
                      : "none",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {/* Hidden radio */}
                  <input
                    type="radio"
                    value={opt.value}
                    {...register("aiProvider")}
                    className="sr-only"
                  />

                  {/* Emoji icon badge */}
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                    style={{
                      backgroundColor: isSelected
                        ? `${opt.accentColor}18`
                        : "rgba(0,0,0,0.04)",
                    }}
                  >
                    {opt.emoji}
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <p
                        className="font-semibold text-sm leading-none"
                        style={{
                          fontFamily: "Outfit, sans-serif",
                          color: "#1A1A2E",
                        }}
                      >
                        {opt.label}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{
                          color: "#9CA3AF",
                          fontFamily: "Space Grotesk, sans-serif",
                        }}
                      >
                        {opt.sublabel}
                      </p>
                    </div>
                    <p
                      className="text-xs mt-0.5 leading-snug"
                      style={{
                        color: "#9CA3AF",
                        fontFamily: "Space Grotesk, sans-serif",
                      }}
                    >
                      {opt.desc}
                    </p>
                  </div>

                  {/* Selected indicator dot */}
                  <div
                    className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                    style={{
                      borderColor: isSelected ? "#FF6B35" : "#D1D5DB",
                      backgroundColor: isSelected ? "#FF6B35" : "transparent",
                    }}
                  >
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="text-sm text-center px-4 py-3 rounded-2xl"
            style={{
              backgroundColor: "rgba(239,68,68,0.08)",
              color: "#EF4444",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-semibold text-base shadow-[0_4px_12px_rgba(255,107,53,0.35)] active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "#FF6B35",
            fontFamily: "Space Grotesk, sans-serif",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Creating trip...
            </>
          ) : (
            <>
              <Plane size={18} strokeWidth={2} />
              Create Trip
            </>
          )}
        </button>
      </form>
    </div>
  );
}
