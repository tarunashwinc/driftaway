"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Plane, Hotel, Train, Car, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import { api } from "../../lib/api";
import { Spinner } from "../ui/spinner";

interface Booking {
  id: string;
  type: "flight" | "hotel" | "train" | "bus" | "car" | "other";
  title: string;
  status: string;
  provider?: string | null;
  confirmationCode?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  origin?: string | null;
  destination?: string | null;
  amount?: number | null;
  currency?: string | null;
  notes?: string | null;
}

interface BookingsResponse {
  success: boolean;
  data: Booking[];
}

const STATUS_STYLE: Record<
  string,
  { label: string; classes: string }
> = {
  pending:   { label: "Pending",   classes: "bg-amber-50 text-amber-600 border border-amber-200" },
  confirmed: { label: "Confirmed", classes: "bg-[#06D6A0]/10 text-[#06D6A0] border border-[#06D6A0]/20" },
  cancelled: { label: "Cancelled", classes: "bg-red-50 text-red-500 border border-red-200" },
  completed: { label: "Completed", classes: "bg-[#F0EEE9] text-[#9CA3AF] border border-black/5" },
};

function getStatusStyle(status: string) {
  return STATUS_STYLE[status] ?? STATUS_STYLE.pending;
}

function bookingTypeLabel(type: string): string {
  const map: Record<string, string> = {
    flight: "Flight",
    hotel:  "Hotel",
    train:  "Train",
    bus:    "Bus",
    car:    "Car Rental",
    other:  "Booking",
  };
  return map[type] ?? "Booking";
}

function formatDate(
  dateStr: string,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
): string {
  return new Date(dateStr).toLocaleDateString("en", opts);
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en", {
    hour:   "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

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

// ── Flight card ────────────────────────────────────────────────────────────

function FlightCard({ booking }: { booking: Booking }) {
  const statusStyle = getStatusStyle(booking.status);
  const hasRoute = booking.origin ?? booking.destination;

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
            <Plane size={15} className="text-[#FF6B35]" strokeWidth={2} />
          </div>
          <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
            Flight
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${statusStyle.classes}`}
        >
          {statusStyle.label}
        </span>
      </div>

      {/* Route display */}
      {hasRoute ? (
        <div className="px-4 py-2 flex items-center gap-2">
          <div className="text-center">
            <p className="text-2xl font-black text-[#1A1A2E] leading-none tracking-tight">
              {booking.origin ?? "—"}
            </p>
            {booking.startDate && (
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                {formatTime(booking.startDate)}
              </p>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center gap-0.5 px-2">
            <div className="flex items-center gap-1 w-full">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <Plane size={14} className="text-[#9CA3AF] rotate-0" strokeWidth={1.5} />
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>
            {booking.startDate && (
              <span className="text-[10px] text-[#9CA3AF]">
                {formatDate(booking.startDate)}
              </span>
            )}
          </div>

          <div className="text-center">
            <p className="text-2xl font-black text-[#1A1A2E] leading-none tracking-tight">
              {booking.destination ?? "—"}
            </p>
            {booking.endDate && (
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                {formatTime(booking.endDate)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 pb-2">
          <p className="text-sm font-semibold text-[#1A1A2E]">{booking.title}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 pt-1.5 pb-3.5 border-t border-[#F3F4F6] mt-1">
        <div className="flex items-center gap-2">
          {booking.provider && (
            <span className="text-xs text-[#6B7280] font-medium">
              {booking.provider}
            </span>
          )}
          {booking.confirmationCode && (
            <span className="text-[10px] font-mono bg-[#F0EEE9] text-[#6B7280] px-2 py-0.5 rounded-full">
              Ref: {booking.confirmationCode}
            </span>
          )}
        </div>
        {booking.amount != null && booking.currency && (
          <span className="text-sm font-bold text-[#1A1A2E]">
            {formatCurrency(booking.amount, booking.currency)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Hotel card ────────────────────────────────────────────────────────────

function HotelCard({ booking }: { booking: Booking }) {
  const statusStyle = getStatusStyle(booking.status);

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#06D6A0]/10 flex items-center justify-center shrink-0">
          <Hotel size={18} className="text-[#06D6A0]" strokeWidth={1.8} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-0.5">
                Hotel
              </p>
              <p className="text-sm font-bold text-[#1A1A2E] leading-snug truncate">
                {booking.title}
              </p>
            </div>
            <span
              className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full capitalize whitespace-nowrap ${statusStyle.classes}`}
            >
              {statusStyle.label}
            </span>
          </div>

          {(booking.startDate ?? booking.endDate) && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-[#6B7280]">
              <span>
                Check-in:{" "}
                <span className="font-semibold text-[#1A1A2E]">
                  {booking.startDate ? formatDate(booking.startDate) : "—"}
                </span>
              </span>
              <ArrowRight size={11} className="text-[#D1D5DB]" />
              <span>
                Check-out:{" "}
                <span className="font-semibold text-[#1A1A2E]">
                  {booking.endDate ? formatDate(booking.endDate) : "—"}
                </span>
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-2">
              {booking.provider && (
                <span className="text-xs text-[#9CA3AF]">
                  {booking.provider}
                </span>
              )}
              {booking.confirmationCode && (
                <span className="text-[10px] font-mono bg-[#F0EEE9] text-[#6B7280] px-2 py-0.5 rounded-full">
                  Ref: {booking.confirmationCode}
                </span>
              )}
            </div>
            {booking.amount != null && booking.currency && (
              <span className="text-sm font-bold text-[#1A1A2E] shrink-0">
                {formatCurrency(booking.amount, booking.currency)}
              </span>
            )}
          </div>

          {booking.notes && (
            <p className="text-xs text-[#9CA3AF] mt-1.5 italic">
              {booking.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Generic card ──────────────────────────────────────────────────────────

function GenericBookingCard({ booking }: { booking: Booking }) {
  const statusStyle = getStatusStyle(booking.status);

  const iconMap: Record<string, ReactNode> = {
    train: <Train size={18} className="text-blue-500" strokeWidth={1.8} />,
    bus:   <Car   size={18} className="text-purple-500" strokeWidth={1.8} />,
    car:   <Car   size={18} className="text-purple-500" strokeWidth={1.8} />,
    other: <Car   size={18} className="text-[#9CA3AF]" strokeWidth={1.8} />,
  };

  const iconBgMap: Record<string, string> = {
    train: "bg-blue-50",
    bus:   "bg-purple-50",
    car:   "bg-purple-50",
    other: "bg-[#F0EEE9]",
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-4">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgMap[booking.type] ?? "bg-[#F0EEE9]"}`}
        >
          {iconMap[booking.type] ?? iconMap.other}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-0.5">
                {bookingTypeLabel(booking.type)}
              </p>
              <p className="text-sm font-bold text-[#1A1A2E] leading-snug">
                {booking.title}
              </p>
            </div>
            <span
              className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${statusStyle.classes}`}
            >
              {statusStyle.label}
            </span>
          </div>

          {(booking.origin ?? booking.destination) && (
            <p className="text-xs text-[#6B7280] mt-1.5">
              {booking.origin}
              {booking.origin && booking.destination ? " → " : ""}
              {booking.destination}
            </p>
          )}

          {(booking.startDate ?? booking.endDate) && (
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              {booking.startDate ? formatDate(booking.startDate) : ""}
              {booking.endDate ? ` – ${formatDate(booking.endDate)}` : ""}
            </p>
          )}

          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-2">
              {booking.confirmationCode && (
                <span className="text-[10px] font-mono bg-[#F0EEE9] text-[#6B7280] px-2 py-0.5 rounded-full">
                  Ref: {booking.confirmationCode}
                </span>
              )}
              {booking.provider && (
                <span className="text-xs text-[#9CA3AF]">
                  {booking.provider}
                </span>
              )}
            </div>
            {booking.amount != null && booking.currency && (
              <span className="text-sm font-bold text-[#1A1A2E] shrink-0">
                {formatCurrency(booking.amount, booking.currency)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  if (booking.type === "flight") return <FlightCard booking={booking} />;
  if (booking.type === "hotel")  return <HotelCard  booking={booking} />;
  return <GenericBookingCard booking={booking} />;
}

export function BookingsTab({ tripId }: { tripId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["trips", tripId, "bookings"],
    queryFn: () =>
      api.get<BookingsResponse>(`/trips/${tripId}/bookings`),
  });

  const bookings = data?.data ?? [];

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
        <p className="text-[#9CA3AF] text-sm">Failed to load bookings</p>
      </div>
    );
  }

  // Group by type
  const flights = bookings.filter((b) => b.type === "flight");
  const hotels  = bookings.filter((b) => b.type === "hotel");
  const trains  = bookings.filter((b) => b.type === "train");
  const others  = bookings.filter(
    (b) => !["flight", "hotel", "train"].includes(b.type)
  );

  const sections: Array<{
    label: string;
    emoji: string;
    items: Booking[];
  }> = [
    { label: "Flights", emoji: "✈️",  items: flights },
    { label: "Hotels",  emoji: "🏨",  items: hotels },
    { label: "Trains",  emoji: "🚂",  items: trains },
    { label: "Other",   emoji: "🚌",  items: others },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Empty state ─────────────────────────── */}
      {sections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">🎫</div>
          <p className="text-[#1A1A2E] font-bold text-base mb-1">
            No bookings yet
          </p>
          <p className="text-[#9CA3AF] text-sm leading-relaxed max-w-[220px]">
            Add your flights, hotels, and trains to keep everything in one place
          </p>
        </div>
      )}

      {/* ── Grouped sections ────────────────────── */}
      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-2">
          {/* Section header */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-base leading-none">{section.emoji}</span>
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">
              {section.label}
            </p>
            <span className="ml-auto text-xs text-[#9CA3AF] bg-white border border-black/8 px-2 py-0.5 rounded-full font-semibold">
              {section.items.length}
            </span>
          </div>

          {section.items.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      ))}

      {/* ── Add booking button (FAB-style inline) ── */}
      <Link href={`/trips/${tripId}/bookings/new`}>
        <button
          type="button"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#1A1A2E] text-white text-sm font-bold shadow-[0_4px_14px_rgba(26,26,46,0.25)] active:scale-[0.98] transition-transform"
        >
          <Plus size={16} />
          Add Booking
        </button>
      </Link>

      {/* ── External links card ──────────────────── */}
      <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-4">
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3">
          Book externally
        </p>
        <div className="flex flex-col gap-0 divide-y divide-[#F3F4F6]">
          {[
            { label: "Search Flights", url: "https://www.google.com/flights", emoji: "✈️" },
            { label: "Find Hotels",    url: "https://www.booking.com",         emoji: "🏨" },
            { label: "Book Trains",    url: "https://www.irctc.co.in",         emoji: "🚂" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 py-3 text-sm text-[#1A1A2E] font-medium hover:text-[#FF6B35] transition-colors"
            >
              <span className="text-base">{link.emoji}</span>
              <span className="flex-1">{link.label}</span>
              <ExternalLink size={13} className="text-[#9CA3AF]" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
