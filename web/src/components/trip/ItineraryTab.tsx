"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Spinner } from "../ui/spinner";

interface ItineraryItem {
  id: string;
  title: string;
  type: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  notes?: string | null;
  estimatedCost?: number | null;
  currency?: string | null;
  order: number;
}

interface ItineraryDay {
  id: string;
  dayNumber: number;
  date: string;
  title?: string | null;
  items: ItineraryItem[];
}

interface ItineraryResponse {
  success: boolean;
  data: ItineraryDay[];
}

const TYPE_EMOJI: Record<string, string> = {
  hotel:        "🏨",
  accommodation:"🏨",
  sightseeing:  "🔭",
  attraction:   "🔭",
  dining:       "🍽️",
  food:         "🍽️",
  restaurant:   "🍽️",
  transport:    "🚌",
  transfer:     "🚌",
  flight:       "✈️",
  adventure:    "🧗",
  outdoor:      "🧗",
  culture:      "🏛️",
  museum:       "🏛️",
  wellness:     "🧘",
  spa:          "🧘",
  shopping:     "🛍️",
  other:        "📍",
};

function getTypeEmoji(type: string): string {
  const lower = type.toLowerCase();
  return TYPE_EMOJI[lower] ?? TYPE_EMOJI.other;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function formatDayDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
  });
}

function TimelineDot({ isLast }: { isLast: boolean }) {
  return (
    <div className="flex flex-col items-center shrink-0 w-5">
      <div className="w-2 h-2 rounded-full bg-[#FF6B35] mt-1 shrink-0" />
      {!isLast && (
        <div className="w-px flex-1 bg-[#FF6B35]/20 mt-0.5 min-h-[1.5rem]" />
      )}
    </div>
  );
}

function ItemRow({
  item,
  isLast,
}: {
  item: ItineraryItem;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      {/* Timeline column */}
      <TimelineDot isLast={isLast} />

      {/* Content */}
      <div className={`flex-1 min-w-0 pb-3 ${isLast ? "" : ""}`}>
        <div className="flex items-start gap-2">
          {/* Time badge */}
          {item.startTime && (
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-[#F0EEE9] text-[#6B7280] text-[10px] font-semibold tracking-wide whitespace-nowrap mt-0.5">
              {formatTime(item.startTime)}
              {item.endTime ? ` – ${formatTime(item.endTime)}` : ""}
            </span>
          )}

          {/* Activity type emoji */}
          <span className="text-base shrink-0 leading-none mt-0.5">
            {getTypeEmoji(item.type)}
          </span>

          {/* Text details */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1A2E] leading-snug">
              {item.title}
            </p>
            {item.location && (
              <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">
                📍 {item.location}
              </p>
            )}
            {item.notes && (
              <p className="text-xs text-[#9CA3AF] mt-0.5 italic leading-relaxed">
                {item.notes}
              </p>
            )}
          </div>

          {/* Cost */}
          {item.estimatedCost != null && (
            <span className="shrink-0 text-xs font-semibold text-[#06D6A0] mt-0.5">
              {item.currency ?? ""} {item.estimatedCost.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DayCard({ day }: { day: ItineraryDay }) {
  const sortedItems = day.items
    .slice()
    .sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 overflow-hidden">
      {/* Day header */}
      <div className="px-4 py-3.5 flex items-center gap-3 border-b border-[#F3F4F6]">
        {/* Day number badge */}
        <div className="w-9 h-9 rounded-full bg-[#FF6B35] flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">{day.dayNumber}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1A1A2E] leading-tight">
            {day.title ? day.title : `Day ${day.dayNumber}`}
          </p>
          <p className="text-xs text-[#9CA3AF]">{formatDayDate(day.date)}</p>
        </div>

        <span className="text-xs text-[#9CA3AF] shrink-0">
          {sortedItems.length} activit{sortedItems.length === 1 ? "y" : "ies"}
        </span>
      </div>

      {/* Timeline items */}
      <div className="px-4 pt-3.5 pb-2">
        {sortedItems.length === 0 ? (
          <p className="text-xs text-[#9CA3AF] py-3 text-center">
            No activities planned for this day
          </p>
        ) : (
          sortedItems.map((item, idx) => (
            <ItemRow
              key={item.id}
              item={item}
              isLast={idx === sortedItems.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function ItineraryTab({ tripId }: { tripId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["trips", tripId, "itinerary"],
    queryFn: () => api.get<ItineraryResponse>(`/trips/${tripId}/itinerary`),
  });

  const days = data?.data ?? [];

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
        <p className="text-[#9CA3AF] text-sm">Failed to load itinerary</p>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4">✈️</div>
        <p className="text-[#1A1A2E] font-bold text-base mb-1">
          Your itinerary is empty
        </p>
        <p className="text-[#9CA3AF] text-sm leading-relaxed max-w-[220px]">
          Generate an AI plan to fill your itinerary
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {days
        .slice()
        .sort((a, b) => a.dayNumber - b.dayNumber)
        .map((day) => (
          <DayCard key={day.id} day={day} />
        ))}
    </div>
  );
}
