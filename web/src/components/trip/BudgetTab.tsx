"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../lib/api";
import { Spinner } from "../ui/spinner";
import { Input } from "../ui/input";

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  paidBy?: string | null;
  date: string;
}

interface BudgetSummary {
  totalBudget?: number | null;
  totalSpent: number;
  currency: string;
  byCategory: Array<{ category: string; total: number; count: number }>;
  expenses: Expense[];
}

interface BudgetResponse {
  success: boolean;
  data: BudgetSummary;
}

interface AddExpenseResponse {
  success: boolean;
  data: Expense;
}

const EXPENSE_CATEGORIES = [
  "accommodation",
  "food",
  "transport",
  "activities",
  "shopping",
  "health",
  "documents",
  "other",
];

const CAT_EMOJI: Record<string, string> = {
  accommodation: "🏨",
  food:          "🍽️",
  transport:     "🚌",
  activities:    "🎯",
  shopping:      "🛍️",
  health:        "💊",
  documents:     "📄",
  other:         "💸",
};

const CAT_COLOR: Record<string, string> = {
  accommodation: "#06D6A0",
  food:          "#FF6B35",
  transport:     "#3B82F6",
  activities:    "#8B5CF6",
  shopping:      "#EC4899",
  health:        "#EF4444",
  documents:     "#6366F1",
  other:         "#9CA3AF",
};

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount:      z.number().positive("Amount must be positive"),
  category:    z.string().min(1),
  date:        z.string().min(1, "Date is required"),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style:              "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatCategory(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function formatExpenseDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en", {
    month: "short",
    day:   "numeric",
  });
}

function AddExpenseModal({
  tripId,
  currency,
  onClose,
}: {
  tripId: string;
  currency: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: "other",
      date:     new Date().toISOString().split("T")[0],
    },
  });

  const { mutateAsync } = useMutation({
    mutationFn: (data: ExpenseForm & { currency: string }) =>
      api.post<AddExpenseResponse>(`/trips/${tripId}/budget`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["trips", tripId, "budget-summary"],
      });
    },
  });

  async function onSubmit(formData: ExpenseForm) {
    setError(null);
    try {
      await mutateAsync({ ...formData, currency });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-6 shadow-2xl">
        {/* Handle */}
        <div className="w-10 h-1 bg-[#E5E7EB] rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-[#1A1A2E]">Add Expense</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F0EEE9] flex items-center justify-center text-[#6B7280] hover:text-[#1A1A2E] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Description"
            placeholder="Hotel night, dinner, taxi…"
            {...register("description")}
            error={errors.description?.message}
          />
          <Input
            label={`Amount (${currency})`}
            type="number"
            placeholder="0"
            min={0}
            step="0.01"
            {...register("amount", { valueAsNumber: true })}
            error={errors.amount?.message}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#1A1A2E]">
              Category
            </label>
            <select
              {...register("category")}
              className="w-full rounded-2xl border border-black/8 py-3.5 px-4 bg-white text-[#1A1A2E] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CAT_EMOJI[cat]} {formatCategory(cat)}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Date"
            type="date"
            {...register("date")}
            error={errors.date?.message}
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C5A] text-white text-sm font-bold shadow-[0_4px_14px_rgba(255,107,53,0.35)] disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {isSubmitting ? "Adding…" : "Add Expense"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function BudgetTab({ tripId }: { tripId: string }) {
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["trips", tripId, "budget-summary"],
    queryFn: () =>
      api.get<BudgetResponse>(`/trips/${tripId}/budget-summary`),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-14">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-10">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-[#9CA3AF] text-sm">Failed to load budget</p>
      </div>
    );
  }

  const budget  = data?.data;
  const currency = budget?.currency ?? "USD";
  const spent   = budget?.totalSpent ?? 0;
  const total   = budget?.totalBudget ?? 0;
  const pct     = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
  const remaining = total > 0 ? total - spent : 0;
  const overBudget = total > 0 && spent > total;

  // Progress bar color
  const barColor =
    overBudget      ? "#EF4444" :
    pct > 75        ? "#FF6B35" :
    pct > 50        ? "#FBBF24" :
                      "#06D6A0";

  return (
    <div className="flex flex-col gap-3">
      {/* ── Budget overview card ─────────────────── */}
      <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-5">
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-4">
          Budget Overview
        </p>

        {/* Amounts row */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-3xl font-bold text-[#1A1A2E]">
              {formatCurrency(spent, currency)}
            </p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">spent</p>
          </div>

          {total > 0 && (
            <div className="text-right">
              <p className="text-xl font-semibold text-[#9CA3AF]">
                {formatCurrency(total, currency)}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">total budget</p>
            </div>
          )}
        </div>

        {/* Thick progress bar */}
        {total > 0 && (
          <>
            <div className="h-3 bg-[#F0EEE9] rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-semibold ${
                  overBudget ? "text-red-500" : "text-[#9CA3AF]"
                }`}
              >
                {overBudget
                  ? `${formatCurrency(Math.abs(remaining), currency)} over budget`
                  : `${Math.round(pct)}% used`}
              </span>
              {!overBudget && (
                <span className="text-xs font-semibold text-[#06D6A0]">
                  {formatCurrency(remaining, currency)} left
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── By-category breakdown ────────────────── */}
      {(budget?.byCategory ?? []).length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-5">
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-4">
            By Category
          </p>
          <div className="flex flex-col gap-3.5">
            {(budget?.byCategory ?? [])
              .slice()
              .sort((a, b) => b.total - a.total)
              .map((cat) => {
                const barWidth =
                  spent > 0 ? (cat.total / spent) * 100 : 0;
                const color =
                  CAT_COLOR[cat.category] ?? CAT_COLOR.other;

                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {CAT_EMOJI[cat.category] ?? "💸"}
                        </span>
                        <span className="text-sm font-medium text-[#1A1A2E]">
                          {formatCategory(cat.category)}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF] bg-[#F0EEE9] px-1.5 py-0.5 rounded-full">
                          {cat.count}x
                        </span>
                      </div>
                      <span className="text-sm font-bold text-[#1A1A2E]">
                        {formatCurrency(cat.total, currency)}
                      </span>
                    </div>
                    {/* Horizontal bar */}
                    <div className="h-1.5 bg-[#F0EEE9] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width:           `${barWidth}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Expense list ─────────────────────────── */}
      {(budget?.expenses ?? []).length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 overflow-hidden">
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest px-5 pt-5 pb-3">
            All Expenses
          </p>
          <div className="divide-y divide-[#F3F4F6]">
            {(budget?.expenses ?? [])
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              )
              .map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  {/* Category icon circle */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base"
                    style={{
                      backgroundColor: `${CAT_COLOR[exp.category] ?? "#9CA3AF"}18`,
                    }}
                  >
                    {CAT_EMOJI[exp.category] ?? "💸"}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A2E] truncate">
                      {exp.description}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">
                      {formatExpenseDate(exp.date)}
                      {exp.paidBy ? ` · ${exp.paidBy}` : ""}
                    </p>
                  </div>

                  {/* Amount */}
                  <span className="text-sm font-bold text-[#1A1A2E] shrink-0">
                    {formatCurrency(exp.amount, exp.currency)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Empty state ─────────────────────────── */}
      {(budget?.expenses ?? []).length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="text-5xl mb-4">💸</div>
          <p className="text-[#1A1A2E] font-bold text-base mb-1">
            No expenses yet
          </p>
          <p className="text-[#9CA3AF] text-sm leading-relaxed max-w-[220px]">
            Track your spending as you go
          </p>
        </div>
      )}

      {/* ── Add expense button ───────────────────── */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white border border-black/8 text-[#1A1A2E] text-sm font-bold shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow active:scale-[0.98]"
      >
        <Plus size={16} className="text-[#FF6B35]" />
        Add Expense
      </button>

      {showModal && (
        <AddExpenseModal
          tripId={tripId}
          currency={currency}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
