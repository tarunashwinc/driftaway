"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";
import { api } from "../../lib/api";
import { Spinner } from "../ui/spinner";

interface ChecklistItem {
  id: string;
  title: string;
  category: string;
  isCompleted: boolean;
  isAiGenerated: boolean;
}

interface ChecklistResponse {
  success: boolean;
  data: ChecklistItem[];
}

interface ToggleResponse {
  success: boolean;
  data: ChecklistItem;
}

interface AddResponse {
  success: boolean;
  data: ChecklistItem;
}

const CATEGORY_ICONS: Record<string, string> = {
  documents:       "📄",
  documents_visa:  "🛂",
  health:          "💊",
  clothing:        "👕",
  electronics:     "🔌",
  toiletries:      "🧴",
  money:           "💳",
  transport:       "🚗",
  accommodation:   "🏨",
  activities:      "🎯",
  food:            "🍽️",
  other:           "📋",
};

const CATEGORY_COLORS: Record<string, string> = {
  documents:       "bg-blue-50 text-blue-600",
  documents_visa:  "bg-indigo-50 text-indigo-600",
  health:          "bg-red-50 text-red-600",
  clothing:        "bg-purple-50 text-purple-600",
  electronics:     "bg-yellow-50 text-yellow-700",
  toiletries:      "bg-pink-50 text-pink-600",
  money:           "bg-green-50 text-green-600",
  transport:       "bg-orange-50 text-orange-600",
  accommodation:   "bg-teal-50 text-teal-600",
  activities:      "bg-[#FF6B35]/10 text-[#FF6B35]",
  food:            "bg-amber-50 text-amber-600",
  other:           "bg-gray-100 text-gray-600",
};

function getCategoryIcon(category: string): string {
  const lower = category.toLowerCase().replace(/\s+/g, "_");
  return (
    CATEGORY_ICONS[lower] ??
    CATEGORY_ICONS[lower.split("_")[0]] ??
    CATEGORY_ICONS.other
  );
}

function getCategoryColor(category: string): string {
  const lower = category.toLowerCase().replace(/\s+/g, "_");
  return (
    CATEGORY_COLORS[lower] ??
    CATEGORY_COLORS[lower.split("_")[0]] ??
    CATEGORY_COLORS.other
  );
}

function formatCategory(cat: string): string {
  return cat
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function groupByCategory(
  items: ChecklistItem[]
): Record<string, ChecklistItem[]> {
  return items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    const cat = item.category ?? "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});
}

function CheckItemRow({
  item,
  onToggle,
  isToggling,
}: {
  item: ChecklistItem;
  onToggle: (id: string, completed: boolean) => void;
  isToggling: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(item.id, !item.isCompleted)}
      disabled={isToggling}
      className="flex items-center gap-3 w-full py-3 text-left group disabled:opacity-60 border-b border-[#F3F4F6] last:border-0"
    >
      {/* Custom circular checkbox */}
      <div
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          item.isCompleted
            ? "bg-[#06D6A0] border-[#06D6A0] scale-100"
            : "border-[#D1D5DB] group-hover:border-[#FF6B35]"
        }`}
      >
        {item.isCompleted && (
          <Check size={13} className="text-white" strokeWidth={3} />
        )}
      </div>

      {/* Label */}
      <span
        className={`text-sm flex-1 transition-colors leading-snug ${
          item.isCompleted
            ? "line-through text-[#9CA3AF]"
            : "text-[#1A1A2E] font-medium"
        }`}
      >
        {item.title}
      </span>

      {/* AI badge */}
      {item.isAiGenerated && (
        <span className="shrink-0 text-[9px] font-bold tracking-wider text-[#9CA3AF] bg-[#F3F4F6] px-1.5 py-0.5 rounded-full">
          AI
        </span>
      )}
    </button>
  );
}

function AddItemForm({
  tripId,
  onSuccess,
}: {
  tripId: string;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: addItem, isPending } = useMutation({
    mutationFn: (payload: { title: string; category: string }) =>
      api.post<AddResponse>(`/trips/${tripId}/checklist`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["trips", tripId, "checklist"],
      });
      setTitle("");
      setIsOpen(false);
      onSuccess();
    },
  });

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 w-full py-3 px-4 rounded-2xl border border-dashed border-[#D1D5DB] text-[#9CA3AF] text-sm font-medium hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
      >
        <Plus size={16} />
        Add item
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-black/8 shadow-[0_2px_16px_rgba(0,0,0,0.08)] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-sm font-bold text-[#1A1A2E]">New item</p>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setTitle("");
          }}
          className="text-[#9CA3AF] hover:text-[#1A1A2E] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <input
        autoFocus
        type="text"
        placeholder="What do you need to pack?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            addItem({ title: title.trim(), category });
          }
          if (e.key === "Escape") setIsOpen(false);
        }}
        className="w-full rounded-2xl border border-black/8 py-3.5 px-4 bg-[#F0EEE9] text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full rounded-2xl border border-black/8 py-3.5 px-4 bg-[#F0EEE9] text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
      >
        {Object.keys(CATEGORY_ICONS).map((cat) => (
          <option key={cat} value={cat}>
            {getCategoryIcon(cat)} {formatCategory(cat)}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={!title.trim() || isPending}
        onClick={() => addItem({ title: title.trim(), category })}
        className="w-full py-3.5 rounded-2xl bg-[#1A1A2E] text-white text-sm font-bold disabled:opacity-40 transition-opacity active:scale-[0.98]"
      >
        {isPending ? "Adding…" : "Add to checklist"}
      </button>
    </div>
  );
}

export function ChecklistTab({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["trips", tripId, "checklist"],
    queryFn: () =>
      api.get<ChecklistResponse>(`/trips/${tripId}/checklist`),
  });

  const { mutate: toggleItem } = useMutation({
    mutationFn: ({
      itemId,
      isCompleted,
    }: {
      itemId: string;
      isCompleted: boolean;
    }) =>
      api.patch<ToggleResponse>(`/trips/${tripId}/checklist/${itemId}`, {
        isCompleted,
      }),
    onMutate: ({ itemId }) => {
      setTogglingIds((prev) => new Set(prev).add(itemId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["trips", tripId, "checklist"],
      });
    },
    onSettled: (_, __, { itemId }) => {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    },
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
        <p className="text-[#9CA3AF] text-sm">Failed to load checklist</p>
      </div>
    );
  }

  const items = data?.data ?? [];
  const grouped = groupByCategory(items);
  const completedCount = items.filter((i) => i.isCompleted).length;
  const progressPct =
    items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Progress bar card ───────────────────── */}
      {items.length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-bold text-[#1A1A2E]">
              {completedCount} of {items.length} completed
            </span>
            <span className="text-xs font-semibold text-[#9CA3AF]">
              {Math.round(progressPct)}%
            </span>
          </div>
          {/* Thick animated progress bar */}
          <div className="h-3 bg-[#F0EEE9] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPct}%`,
                background:
                  progressPct === 100
                    ? "#06D6A0"
                    : progressPct > 0
                    ? "linear-gradient(90deg, #06D6A0, #06D6A0 60%, #FF6B35)"
                    : "#06D6A0",
              }}
            />
          </div>
          {completedCount === items.length && items.length > 0 && (
            <p className="text-xs text-[#06D6A0] font-semibold mt-2 text-center">
              🎉 All packed!
            </p>
          )}
        </div>
      )}

      {/* ── Empty state ─────────────────────────── */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="text-5xl mb-4">🧳</div>
          <p className="text-[#1A1A2E] font-bold text-base mb-1">
            Nothing to pack yet
          </p>
          <p className="text-[#9CA3AF] text-sm leading-relaxed max-w-[220px]">
            Add items or generate an AI plan to get your list
          </p>
        </div>
      )}

      {/* ── Category groups ─────────────────────── */}
      {Object.entries(grouped).map(([category, catItems]) => {
        const catCompleted = catItems.filter((i) => i.isCompleted).length;
        const colorClass = getCategoryColor(category);

        return (
          <div
            key={category}
            className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 overflow-hidden"
          >
            {/* Category header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#F3F4F6]">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${colorClass}`}
              >
                <span>{getCategoryIcon(category)}</span>
                {formatCategory(category)}
              </span>
              <span className="ml-auto text-xs text-[#9CA3AF] font-semibold">
                {catCompleted}/{catItems.length}
              </span>
            </div>

            {/* Items */}
            <div className="px-4">
              {catItems.map((item) => (
                <CheckItemRow
                  key={item.id}
                  item={item}
                  onToggle={(id, completed) =>
                    toggleItem({ itemId: id, isCompleted: completed })
                  }
                  isToggling={togglingIds.has(item.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* ── Add item ────────────────────────────── */}
      <AddItemForm tripId={tripId} onSuccess={() => {}} />
    </div>
  );
}
