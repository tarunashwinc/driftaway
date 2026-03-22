"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Spinner } from "../ui/spinner";
import { Plane } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ItineraryItem {
  id: string;
  sortOrder: number;
  time: string;
  activity: string;
  type: string;
  highlight: boolean;
  bookingRequired: boolean;
  closedOn: string[];
  openingHours: string | null;
  tip: string | null;
  thumbnail: string | null;
  notes: string | null;
  costLocal: number | null;
  localCurrency: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ItineraryDay {
  id: string;
  dayNumber: number;
  date: string;
  title: string;
  summary: string | null;
  accommodation: string | null;
  items: ItineraryItem[];
}

interface ItineraryResponse {
  success: boolean;
  data: ItineraryDay[];
}

interface Booking {
  id: string;
  type: string;
  carrier?: string | null;
  name?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  departureDate?: string | null;
  departureTime?: string | null;
  arrivalDate?: string | null;
  arrivalTime?: string | null;
  confirmationRef?: string | null;
  details?: Record<string, unknown> | null;
}

interface BookingsResponse {
  success: boolean;
  data: Booking[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  hotel:       { emoji: "🏨", label: "Stay",       color: "text-blue-700",   bg: "bg-blue-50" },
  sightseeing: { emoji: "🔭", label: "Sightseeing", color: "text-purple-700", bg: "bg-purple-50" },
  dining:      { emoji: "🍽️", label: "Dining",     color: "text-orange-700", bg: "bg-orange-50" },
  transport:   { emoji: "🚌", label: "Transport",   color: "text-slate-600",  bg: "bg-slate-50" },
  adventure:   { emoji: "🧗", label: "Adventure",   color: "text-green-700",  bg: "bg-green-50" },
  culture:     { emoji: "🏛️", label: "Culture",     color: "text-amber-700",  bg: "bg-amber-50" },
  wellness:    { emoji: "🧘", label: "Wellness",    color: "text-teal-700",   bg: "bg-teal-50" },
  shopping:    { emoji: "🛍️", label: "Shopping",   color: "text-pink-700",   bg: "bg-pink-50" },
  other:       { emoji: "📍", label: "Activity",    color: "text-gray-600",   bg: "bg-gray-50" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type.toLowerCase()] ?? TYPE_CONFIG.other;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h ?? "0", 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function formatDayDate(dateStr: string): string {
  // dateStr may be a full ISO timestamp or a plain date string
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  return d.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });
}

// Split "Venue Name — description of experience" into two parts.
// Falls back gracefully if no em-dash separator is present.
function splitActivity(activity: string): { venue: string; description: string | null } {
  const idx = activity.indexOf(" — ");
  if (idx === -1) return { venue: activity, description: null };
  return { venue: activity.slice(0, idx), description: activity.slice(idx + 3) };
}

function formatCost(cost: number, currency: string | null): string {
  if (cost === 0) return "Free";
  const symbol = currency === "JPY" ? "¥" : currency === "INR" ? "₹" : currency === "USD" ? "$" : (currency ?? "");
  return `${symbol}${cost.toLocaleString()}`;
}

// ── Item card ─────────────────────────────────────────────────────────────────

function ItemCard({ item, isLast }: { item: ItineraryItem; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getTypeConfig(item.type);
  const hasExtra = !!(item.notes || item.tip || item.openingHours || item.closedOn.length);
  const { venue, description } = splitActivity(item.activity);

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0 w-5 pt-1">
        <div
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            item.highlight ? "bg-[#FF6B35] ring-2 ring-[#FF6B35]/30" : "bg-[#D1D5DB]"
          }`}
        />
        {!isLast && <div className="w-px flex-1 bg-[#E5E7EB] mt-1 min-h-[1.75rem]" />}
      </div>

      {/* Card */}
      <div className={`flex-1 min-w-0 mb-3 rounded-2xl border overflow-hidden ${
        item.highlight
          ? "border-[#FF6B35]/25 bg-gradient-to-br from-[#FF6B35]/5 to-white shadow-[0_2px_12px_rgba(255,107,53,0.1)]"
          : "border-black/6 bg-white shadow-[0_1px_6px_rgba(0,0,0,0.05)]"
      }`}>
        {/* Main row */}
        <div className="px-3.5 pt-3 pb-2.5">
          <div className="flex items-start gap-2">
            {/* Time */}
            <span className="shrink-0 text-[10px] font-bold text-[#6B7280] bg-[#F3F4F6] px-2 py-1 rounded-lg mt-0.5 tabular-nums whitespace-nowrap">
              {formatTime(item.time)}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                {/* Type badge */}
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                  <span className="text-[11px]">{item.thumbnail ?? cfg.emoji}</span>
                  {cfg.label}
                </span>
                {/* Highlight */}
                {item.highlight && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF6B35] text-white">
                    ⭐ Must-Do
                  </span>
                )}
                {/* Booking required */}
                {item.bookingRequired && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    📅 Book ahead
                  </span>
                )}
                {/* Closed days */}
                {item.closedOn.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                    ⚠️ Closed {item.closedOn.join(", ")}
                  </span>
                )}
              </div>

              {/* Activity name — venue bold, description softer below */}
              <p className="text-sm font-semibold text-[#1A1A2E] leading-snug">
                {venue}
              </p>
              {description && (
                <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">
                  {description}
                </p>
              )}

              {/* Opening hours */}
              {item.openingHours && (
                <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-1">
                  <span>🕐</span>
                  <span>{item.openingHours}</span>
                </p>
              )}

              {/* Cost + expand toggle */}
              <div className="flex items-center justify-between mt-2">
                {item.costLocal != null ? (
                  <span className={`text-xs font-bold ${item.costLocal === 0 ? "text-[#06D6A0]" : "text-[#1A1A2E]"}`}>
                    {formatCost(item.costLocal, item.localCurrency)}
                    {item.costLocal > 0 && <span className="text-[#9CA3AF] font-normal"> /person</span>}
                  </span>
                ) : (
                  <span />
                )}
                {hasExtra && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="text-[10px] font-semibold text-[#FF6B35] hover:opacity-80 transition-opacity"
                  >
                    {expanded ? "Less ▲" : "Tips & Info ▼"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && hasExtra && (
          <div className="border-t border-black/5 px-3.5 py-3 space-y-2.5 bg-[#FAFAFA]">
            {item.notes && (
              <div>
                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-1">About</p>
                <p className="text-xs text-[#4B5563] leading-relaxed">{item.notes}</p>
              </div>
            )}
            {item.tip && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">💡 Insider Tip</p>
                <p className="text-xs text-amber-900 leading-relaxed">{item.tip}</p>
              </div>
            )}
            {item.bookingRequired && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                <p className="text-xs text-blue-700 font-semibold">📅 Advance booking required — check the tip above for how far ahead to book.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Flight card helpers ────────────────────────────────────────────────────────

// Extract IATA code from "City Name (XYZ)" or first 3 uppercase chars
function iota(loc: string | null | undefined): string {
  return loc?.match(/\(([A-Z]{3})\)/)?.[1] ?? loc?.slice(0, 3).toUpperCase() ?? "—";
}

// Human-readable city name (strip parenthetical IATA code)
function cityName(loc: string | null | undefined): string {
  return loc?.replace(/\s*\([A-Z]{3}\)\s*$/, "").trim() ?? "";
}

// Calculate flight duration from departure + arrival datetimes
function flightDuration(
  depDate: string | null | undefined,
  depTime: string | null | undefined,
  arrDate: string | null | undefined,
  arrTime: string | null | undefined,
): string | null {
  if (!depDate || !depTime || !arrDate || !arrTime) return null;
  try {
    const dep = new Date(`${depDate.split("T")[0]}T${depTime}:00`);
    const arr = new Date(`${arrDate.split("T")[0]}T${arrTime}:00`);
    const diffMs = arr.getTime() - dep.getTime();
    if (diffMs <= 0) return null;
    const totalMin = Math.round(diffMs / 60_000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  } catch {
    return null;
  }
}

// ── Flight boarding-pass card ──────────────────────────────────────────────────

function FlightBanner({ booking, role }: { booking: Booking; role: "arriving" | "departing" }) {
  const fromIATA = iota(booking.fromLocation);
  const toIATA   = iota(booking.toLocation);
  const fromCity = cityName(booking.fromLocation);
  const toCity   = cityName(booking.toLocation);

  const depTime = booking.departureTime;
  const arrTime = booking.arrivalTime;
  const duration = flightDuration(
    booking.departureDate, depTime, booking.arrivalDate, arrTime,
  );

  const carrier    = booking.carrier ?? "";
  const flightNum  = booking.name ?? "";
  const ref        = booking.confirmationRef;
  const cabinClass = booking.details?.class as string | undefined;

  // Role colours
  const isArriving = role === "arriving";
  const accent    = isArriving ? "#06D6A0" : "#FF6B35";
  const pillBg    = isArriving ? "bg-[#06D6A0]/12" : "bg-[#FF6B35]/12";
  const pillText  = isArriving ? "text-[#059669]"  : "text-[#C2410C]";
  const borderCol = isArriving ? "border-[#06D6A0]/30" : "border-[#FF6B35]/30";

  return (
    <div className={`mx-4 mt-3 rounded-2xl border bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden ${borderCol}`}>
      {/* Top bar: role pill + carrier */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b border-black/5">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${pillBg} ${pillText}`}>
          <Plane size={10} strokeWidth={2.5} className={isArriving ? "rotate-[-35deg]" : "rotate-[35deg]"} />
          {isArriving ? "Arriving" : "Departing"}
        </div>
        <div className="flex items-center gap-1.5">
          {carrier && (
            <span className="text-[11px] font-semibold text-[#6B7280]">{carrier}</span>
          )}
          {flightNum && (
            <span className="text-[11px] font-black text-[#1A1A2E]">{flightNum}</span>
          )}
        </div>
      </div>

      {/* Route row */}
      <div className="px-3.5 py-3.5">
        <div className="flex items-center gap-0">
          {/* Departure */}
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-black text-[#1A1A2E] tabular-nums leading-none">{fromIATA}</p>
            {depTime && (
              <p className="text-base font-black tabular-nums mt-1" style={{ color: accent }}>
                {depTime}
              </p>
            )}
            {fromCity && (
              <p className="text-[10px] text-[#9CA3AF] font-medium mt-0.5 leading-tight truncate max-w-[90px]">{fromCity}</p>
            )}
          </div>

          {/* Centre: duration + line */}
          <div className="flex flex-col items-center px-2 shrink-0">
            {duration && (
              <span className="text-[10px] font-bold text-[#9CA3AF] mb-1 tabular-nums">{duration}</span>
            )}
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full border-2 border-[#D1D5DB]" />
              <div className="w-12 h-px bg-[#D1D5DB]" />
              <Plane size={12} className="text-[#9CA3AF]" strokeWidth={2} />
              <div className="w-12 h-px bg-[#D1D5DB]" />
              <div className="w-1.5 h-1.5 rounded-full border-2 border-[#D1D5DB]" />
            </div>
            <span className="text-[9px] text-[#C4C9D4] font-medium mt-1 uppercase tracking-wide">non-stop</span>
          </div>

          {/* Arrival */}
          <div className="flex-1 min-w-0 text-right">
            <p className="text-2xl font-black text-[#1A1A2E] tabular-nums leading-none">{toIATA}</p>
            {arrTime && (
              <p className="text-base font-black tabular-nums mt-1" style={{ color: accent }}>
                {arrTime}
              </p>
            )}
            {toCity && (
              <p className="text-[10px] text-[#9CA3AF] font-medium mt-0.5 leading-tight truncate max-w-[90px] ml-auto">{toCity}</p>
            )}
          </div>
        </div>

        {/* Bottom details strip */}
        {(ref ?? cabinClass) && (
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-black/5 flex-wrap">
            {ref && (
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest">PNR</span>
                <span className="text-[11px] font-black text-[#1A1A2E] font-mono tracking-wider">{ref}</span>
              </div>
            )}
            {cabinClass && (
              <>
                <div className="w-px h-3 bg-[#E5E7EB]" />
                <span className="text-[10px] font-semibold text-[#6B7280] capitalize">{cabinClass}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Day card ──────────────────────────────────────────────────────────────────

function DayCard({ day, flightBanners }: { day: ItineraryDay; flightBanners: { arriving: Booking[]; departing: Booking[] } }) {
  const [collapsed, setCollapsed] = useState(false);
  const sorted = day.items.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const highlights = sorted.filter((i) => i.highlight).length;
  const totalCost = sorted.reduce((sum, i) => sum + (i.costLocal ?? 0), 0);
  const costCurrency = sorted.find((i) => i.localCurrency)?.localCurrency ?? null;

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] border border-black/5 overflow-hidden">
      {/* Day header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full text-left px-4 pt-4 pb-3 border-b border-[#F3F4F6] active:bg-gray-50 transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Day number bubble */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] flex flex-col items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-[9px] font-bold uppercase leading-none">Day</span>
            <span className="text-white text-base font-black leading-none">{day.dayNumber}</span>
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm font-bold text-[#1A1A2E] leading-snug">{day.title}</h3>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{formatDayDate(day.date)}</p>
            {day.summary && (
              <p className="text-xs text-[#6B7280] mt-1 leading-relaxed line-clamp-2">{day.summary}</p>
            )}
          </div>

          <span className="text-xs text-[#9CA3AF] shrink-0 pt-1">{collapsed ? "▼" : "▲"}</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-2.5 ml-13 pl-[52px]">
          {day.accommodation && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
              🏨 {day.accommodation}
            </span>
          )}
          {highlights > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#FF6B35] bg-[#FF6B35]/8 px-2.5 py-1 rounded-full">
              ⭐ {highlights} highlight{highlights > 1 ? "s" : ""}
            </span>
          )}
          {totalCost > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#1A1A2E] bg-[#F0EEE9] px-2.5 py-1 rounded-full ml-auto">
              ~{formatCost(totalCost, costCurrency)} est.
            </span>
          )}
        </div>
      </button>

      {/* Flight banners — shown even when collapsed so arrival time is always visible */}
      {(flightBanners.arriving.length > 0 || flightBanners.departing.length > 0) && (
        <div className="pb-3">
          {flightBanners.arriving.map((b) => (
            <FlightBanner key={b.id} booking={b} role="arriving" />
          ))}
          {flightBanners.departing.map((b) => (
            <FlightBanner key={b.id} booking={b} role="departing" />
          ))}
        </div>
      )}

      {/* Timeline items */}
      {!collapsed && (
        <div className="px-4 pt-2 pb-2">
          {sorted.length === 0 ? (
            <p className="text-xs text-[#9CA3AF] py-4 text-center">No activities for this day</p>
          ) : (
            sorted.map((item, idx) => (
              <ItemCard key={item.id} item={item} isLast={idx === sorted.length - 1} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function TripSummaryBar({ days }: { days: ItineraryDay[] }) {
  const totalItems = days.reduce((s, d) => s + d.items.length, 0);
  const highlights = days.reduce((s, d) => s + d.items.filter((i) => i.highlight).length, 0);
  const needBooking = days.reduce((s, d) => s + d.items.filter((i) => i.bookingRequired).length, 0);

  return (
    <div className="bg-gradient-to-r from-[#1A1A2E] to-[#2D2D44] rounded-2xl px-4 py-3.5 flex items-center justify-between gap-2">
      <div className="text-center">
        <p className="text-white font-black text-lg leading-none">{days.length}</p>
        <p className="text-white/60 text-[10px] font-semibold mt-0.5">Days</p>
      </div>
      <div className="w-px h-8 bg-white/15" />
      <div className="text-center">
        <p className="text-white font-black text-lg leading-none">{totalItems}</p>
        <p className="text-white/60 text-[10px] font-semibold mt-0.5">Activities</p>
      </div>
      <div className="w-px h-8 bg-white/15" />
      <div className="text-center">
        <p className="text-[#FF6B35] font-black text-lg leading-none">{highlights}</p>
        <p className="text-white/60 text-[10px] font-semibold mt-0.5">Highlights</p>
      </div>
      <div className="w-px h-8 bg-white/15" />
      <div className="text-center">
        <p className="text-amber-400 font-black text-lg leading-none">{needBooking}</p>
        <p className="text-white/60 text-[10px] font-semibold mt-0.5">Book Ahead</p>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

// Extract YYYY-MM-DD from an ISO date string or date-only string
function toDateKey(d: string | null | undefined): string | null {
  if (!d) return null;
  return d.split("T")[0] ?? null;
}

export function ItineraryTab({ tripId }: { tripId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["trips", tripId, "itinerary"],
    queryFn: () => api.get<ItineraryResponse>(`/trips/${tripId}/itinerary`),
  });

  const { data: bData } = useQuery({
    queryKey: ["trips", tripId, "bookings"],
    queryFn: () => api.get<BookingsResponse>(`/trips/${tripId}/bookings`),
  });

  const days = (data?.data ?? []).slice().sort((a, b) => a.dayNumber - b.dayNumber);
  const bookings = bData?.data ?? [];

  // Build per-day flight banner maps (arriving / departing)
  const flightArrivingByDate = new Map<string, Booking[]>();
  const flightDepartingByDate = new Map<string, Booking[]>();
  for (const b of bookings) {
    if (b.type !== "flight") continue;
    const arrKey = toDateKey(b.arrivalDate);
    if (arrKey) {
      const arr = flightArrivingByDate.get(arrKey) ?? [];
      arr.push(b);
      flightArrivingByDate.set(arrKey, arr);
    }
    const depKey = toDateKey(b.departureDate);
    if (depKey) {
      // Only show departure banner if this day is a departure day but NOT an arrival day
      // (avoids double-banners on same-day connections)
      if (depKey !== arrKey) {
        const dep = flightDepartingByDate.get(depKey) ?? [];
        dep.push(b);
        flightDepartingByDate.set(depKey, dep);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-[#9CA3AF] text-sm">Failed to load itinerary</p>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-5">✈️</div>
        <p className="text-[#1A1A2E] font-bold text-base mb-2">Your itinerary is empty</p>
        <p className="text-[#9CA3AF] text-sm leading-relaxed max-w-[240px]">
          Add your wishlist &amp; places to visit in the <span className="font-semibold text-[#FF6B35]">Wishlist</span> tab, then tap <span className="font-semibold text-[#FF6B35]">Generate AI Plan</span> above.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <TripSummaryBar days={days} />
      {days.map((day) => {
        const dayKey = toDateKey(day.date);
        return (
          <DayCard
            key={day.id}
            day={day}
            flightBanners={{
              arriving:  dayKey ? (flightArrivingByDate.get(dayKey)  ?? []) : [],
              departing: dayKey ? (flightDepartingByDate.get(dayKey) ?? []) : [],
            }}
          />
        );
      })}
    </div>
  );
}
