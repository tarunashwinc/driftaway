"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, Plane, Hotel, Train, Car, ExternalLink, ArrowRight, Download, FileText,
} from "lucide-react";
import Link from "next/link";
import { api, getAccessToken } from "../../lib/api";
import { Spinner } from "../ui/spinner";

// ── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  type: "flight" | "hotel" | "train" | "bus" | "activity" | "ferry" | "other";
  status: string;
  carrier?: string | null;
  name: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  departureDate?: string | null;
  departureTime?: string | null;
  arrivalDate?: string | null;
  arrivalTime?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  confirmationRef?: string | null;
  cost?: number | null;
  currency?: string | null;
  details?: Record<string, unknown> | null;
}

interface TripDocument {
  id: string;
  type: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  metadata?: Record<string, unknown> | null;
}

interface BookingsResponse  { success: boolean; data: Booking[]      }
interface DocumentsResponse { success: boolean; data: TripDocument[] }

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { label: string; classes: string }> = {
  pending:   { label: "Pending",   classes: "bg-amber-50 text-amber-600 border border-amber-200" },
  confirmed: { label: "Confirmed", classes: "bg-[#06D6A0]/10 text-[#06D6A0] border border-[#06D6A0]/20" },
  cancelled: { label: "Cancelled", classes: "bg-red-50 text-red-500 border border-red-200" },
  completed: { label: "Completed", classes: "bg-[#F0EEE9] text-[#9CA3AF] border border-black/5" },
};

const DOC_EMOJI: Record<string, string> = {
  ticket: "✈️", hotel_confirmation: "🏨", passport: "🛂",
  visa: "📋", insurance: "🛡️", itinerary: "🗺️", other: "📄",
};

function getStatusStyle(s: string) { return STATUS_STYLE[s] ?? STATUS_STYLE.pending!; }

// Parse date string without timezone conversion to avoid UTC midnight shift artifacts
function parseDateLocal(d: string): Date {
  const part = d.split("T")[0] ?? d;
  const [y, m, day] = part.split("-").map(Number);
  return new Date(y!, m! - 1, day!);
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  return parseDateLocal(d).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function formatDateFull(d: string | null | undefined): string {
  if (!d) return "";
  return parseDateLocal(d).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch { return `${currency} ${amount.toLocaleString()}`; }
}

function formatSize(bytes: number) {
  return bytes < 1_048_576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function extractIATA(loc: string) {
  return loc.match(/\(([A-Z]{3})\)/)?.[1] ?? loc.slice(0, 3).toUpperCase();
}

// ── Inline document attachment ────────────────────────────────────────────────

function DocAttachment({ doc, tripId }: { doc: TripDocument; tripId: string }) {
  const emoji = DOC_EMOJI[doc.type] ?? "📄";
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/trips/${tripId}/documents/${doc.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load document");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      // silently fail — file may not be on disk
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleOpen}
      disabled={loading}
      className="flex items-center gap-2.5 w-full mt-3 px-3 py-2.5 rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] hover:bg-[#F0EEE9] hover:border-[#FF6B35]/30 active:scale-[0.98] transition-all text-left group disabled:opacity-60"
    >
      <div className="w-8 h-8 rounded-lg bg-white border border-black/8 flex items-center justify-center text-sm shrink-0 shadow-sm">
        {loading ? <span className="animate-spin text-xs">⏳</span> : emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[#1A1A2E] truncate leading-tight">{doc.name}</p>
        <p className="text-[10px] text-[#9CA3AF] mt-0.5">{formatSize(doc.sizeBytes)}</p>
      </div>
      <div className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-[#FF6B35] opacity-0 group-hover:opacity-100 transition-opacity">
        <Download size={12} strokeWidth={2.5} />
        <span>{loading ? "Loading…" : "Open"}</span>
      </div>
    </button>
  );
}

// ── Flight card ───────────────────────────────────────────────────────────────

function FlightCard({ b, docs, tripId }: { b: Booking; docs: TripDocument[]; tripId: string }) {
  const s = getStatusStyle(b.status);

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
            <Plane size={15} className="text-[#FF6B35]" strokeWidth={2} />
          </div>
          <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
            {b.carrier ?? "Flight"}
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${s.classes}`}>{s.label}</span>
      </div>

      {/* Route */}
      {(b.fromLocation ?? b.toLocation) ? (
        <>
          <div className="px-4 py-2 flex items-center gap-2">
            <div className="text-center min-w-[48px]">
              <p className="text-2xl font-black text-[#1A1A2E] leading-none tracking-tight">
                {extractIATA(b.fromLocation ?? "")}
              </p>
              {b.departureTime && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{b.departureTime}</p>}
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5 px-2">
              <div className="flex items-center gap-1 w-full">
                <div className="flex-1 h-px bg-[#E5E7EB]" />
                <Plane size={14} className="text-[#9CA3AF]" strokeWidth={1.5} />
                <div className="flex-1 h-px bg-[#E5E7EB]" />
              </div>
              {b.departureDate && (
                <span className="text-[10px] text-[#9CA3AF]">{formatDate(b.departureDate)}</span>
              )}
            </div>
            <div className="text-center min-w-[48px]">
              <p className="text-2xl font-black text-[#1A1A2E] leading-none tracking-tight">
                {extractIATA(b.toLocation ?? "")}
              </p>
              {b.arrivalTime && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{b.arrivalTime}</p>}
            </div>
          </div>
          <div className="px-4 flex items-center gap-1 text-[10px] text-[#9CA3AF]">
            <span className="truncate">{b.fromLocation}</span>
            <ArrowRight size={9} className="shrink-0" />
            <span className="truncate">{b.toLocation}</span>
          </div>
        </>
      ) : (
        <div className="px-4 pb-2">
          <p className="text-sm font-semibold text-[#1A1A2E]">{b.name}</p>
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 mt-1 border-t border-[#F3F4F6]">
        <div className="flex items-center gap-2 min-w-0">
          {b.name && (
            <span className="text-xs text-[#6B7280] font-medium truncate max-w-[130px]">{b.name}</span>
          )}
          {b.confirmationRef && (
            <span className="text-[10px] font-mono bg-[#F0EEE9] text-[#6B7280] px-2 py-0.5 rounded-full shrink-0">
              {b.confirmationRef}
            </span>
          )}
        </div>
        {b.cost != null && b.currency && (
          <span className="text-sm font-bold text-[#1A1A2E] shrink-0 ml-2">
            {formatCurrency(b.cost, b.currency)}
          </span>
        )}
      </div>

      {/* Inline documents */}
      {docs.length > 0 && (
        <div className="px-4 pb-4">
          {docs.map((doc) => <DocAttachment key={doc.id} doc={doc} tripId={tripId} />)}
        </div>
      )}
    </div>
  );
}

// ── Hotel card ────────────────────────────────────────────────────────────────

function HotelCard({ b, docs, tripId }: { b: Booking; docs: TripDocument[]; tripId: string }) {
  const s = getStatusStyle(b.status);
  const inclusions = b.details?.inclusions as string[] | undefined;
  const roomType   = b.details?.roomType   as string | undefined;
  const notes      = b.details?.notes      as string | undefined;

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#06D6A0]/10 flex items-center justify-center shrink-0">
          <Hotel size={18} className="text-[#06D6A0]" strokeWidth={1.8} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-0.5">Hotel</p>
              <p className="text-sm font-bold text-[#1A1A2E] leading-snug">{b.name}</p>
            </div>
            <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${s.classes}`}>{s.label}</span>
          </div>

          {/* Dates */}
          {(b.checkIn ?? b.checkOut) && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#6B7280]">
              <span>In: <span className="font-semibold text-[#1A1A2E]">{b.checkIn ? formatDateFull(b.checkIn) : "—"}</span></span>
              <ArrowRight size={11} className="text-[#D1D5DB]" />
              <span>Out: <span className="font-semibold text-[#1A1A2E]">{b.checkOut ? formatDateFull(b.checkOut) : "—"}</span></span>
            </div>
          )}

          {/* Chips */}
          {(roomType ?? (inclusions && inclusions.length > 0)) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {roomType && (
                <span className="text-[10px] bg-[#F0EEE9] text-[#6B7280] px-2 py-0.5 rounded-full">{roomType}</span>
              )}
              {inclusions?.map((inc) => (
                <span key={inc} className="text-[10px] bg-[#06D6A0]/10 text-[#06D6A0] px-2 py-0.5 rounded-full">{inc}</span>
              ))}
            </div>
          )}

          {/* Ref + cost */}
          <div className="flex items-center justify-between mt-2 gap-2">
            {b.confirmationRef && (
              <span className="text-[10px] font-mono bg-[#F0EEE9] text-[#6B7280] px-2 py-0.5 rounded-full">Ref: {b.confirmationRef}</span>
            )}
            {b.cost != null && b.currency && (
              <span className="text-sm font-bold text-[#1A1A2E] shrink-0">{formatCurrency(b.cost, b.currency)}</span>
            )}
          </div>

          {notes && <p className="text-[10px] text-amber-500 mt-1.5 font-medium">⚠️ {notes}</p>}

          {/* Inline documents */}
          {docs.map((doc) => <DocAttachment key={doc.id} doc={doc} tripId={tripId} />)}
        </div>
      </div>
    </div>
  );
}

// ── Generic card ──────────────────────────────────────────────────────────────

function GenericCard({ b, docs, tripId }: { b: Booking; docs: TripDocument[]; tripId: string }) {
  const s = getStatusStyle(b.status);
  const iconMap: Record<string, ReactNode> = {
    train: <Train size={18} className="text-blue-500" strokeWidth={1.8} />,
    bus:   <Car   size={18} className="text-purple-500" strokeWidth={1.8} />,
    car:   <Car   size={18} className="text-purple-500" strokeWidth={1.8} />,
    other: <Car   size={18} className="text-[#9CA3AF]" strokeWidth={1.8} />,
  };
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F0EEE9] flex items-center justify-center shrink-0">
          {iconMap[b.type] ?? iconMap.other}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-0.5">{b.type}</p>
              <p className="text-sm font-bold text-[#1A1A2E]">{b.name}</p>
            </div>
            <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${s.classes}`}>{s.label}</span>
          </div>
          <div className="flex items-center justify-between mt-2 gap-2">
            {b.confirmationRef && (
              <span className="text-[10px] font-mono bg-[#F0EEE9] text-[#6B7280] px-2 py-0.5 rounded-full">{b.confirmationRef}</span>
            )}
            {b.cost != null && b.currency && (
              <span className="text-sm font-bold text-[#1A1A2E] shrink-0">{formatCurrency(b.cost, b.currency)}</span>
            )}
          </div>
          {docs.map((doc) => <DocAttachment key={doc.id} doc={doc} tripId={tripId} />)}
        </div>
      </div>
    </div>
  );
}

function BookingCard({ b, docs, tripId }: { b: Booking; docs: TripDocument[]; tripId: string }) {
  if (b.type === "flight") return <FlightCard b={b} docs={docs} tripId={tripId} />;
  if (b.type === "hotel")  return <HotelCard  b={b} docs={docs} tripId={tripId} />;
  return <GenericCard b={b} docs={docs} tripId={tripId} />;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function BookingsTab({ tripId }: { tripId: string }) {
  const { data: bData, isLoading, isError } = useQuery({
    queryKey: ["trips", tripId, "bookings"],
    queryFn:  () => api.get<BookingsResponse>(`/trips/${tripId}/bookings`),
  });
  const { data: dData } = useQuery({
    queryKey: ["trips", tripId, "documents"],
    queryFn:  () => api.get<DocumentsResponse>(`/trips/${tripId}/documents`),
  });

  const bookings  = bData?.data ?? [];
  const allDocs   = dData?.data ?? [];

  // Build a map: confirmationRef → documents[]
  const docsByRef = new Map<string, TripDocument[]>();
  for (const doc of allDocs) {
    const ref = doc.metadata?.bookingRef as string | undefined;
    if (ref) {
      const existing = docsByRef.get(ref) ?? [];
      existing.push(doc);
      docsByRef.set(ref, existing);
    }
  }

  const getDocsForBooking = (b: Booking) =>
    b.confirmationRef ? (docsByRef.get(b.confirmationRef) ?? []) : [];

  if (isLoading) return <div className="flex justify-center py-14"><Spinner /></div>;
  if (isError)   return <div className="text-center py-10"><div className="text-4xl mb-3">⚠️</div><p className="text-[#9CA3AF] text-sm">Failed to load bookings</p></div>;

  const flights = bookings.filter((b) => b.type === "flight");
  const hotels  = bookings.filter((b) => b.type === "hotel");
  const trains  = bookings.filter((b) => b.type === "train");
  const others  = bookings.filter((b) => !["flight","hotel","train"].includes(b.type));

  const sections = [
    { label: "Flights", emoji: "✈️", items: flights },
    { label: "Hotels",  emoji: "🏨", items: hotels  },
    { label: "Trains",  emoji: "🚂", items: trains  },
    { label: "Other",   emoji: "🚌", items: others  },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {sections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">🎫</div>
          <p className="text-[#1A1A2E] font-bold text-base mb-1">No bookings yet</p>
          <p className="text-[#9CA3AF] text-sm max-w-[220px]">Add your flights, hotels, and trains to keep everything in one place</p>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-base leading-none">{section.emoji}</span>
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">{section.label}</p>
            <span className="ml-auto text-xs text-[#9CA3AF] bg-white border border-black/8 px-2 py-0.5 rounded-full font-semibold">
              {section.items.length}
            </span>
          </div>
          {section.items.map((b) => (
            <BookingCard key={b.id} b={b} docs={getDocsForBooking(b)} tripId={tripId} />
          ))}
        </div>
      ))}

      <Link href={`/trips/${tripId}/bookings/new`}>
        <button type="button" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#1A1A2E] text-white text-sm font-bold shadow-[0_4px_14px_rgba(26,26,46,0.25)] active:scale-[0.98] transition-transform">
          <Plus size={16} />Add Booking
        </button>
      </Link>

      <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-4">
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3">Book externally</p>
        <div className="flex flex-col gap-0 divide-y divide-[#F3F4F6]">
          {[
            { label: "Search Flights", url: "https://www.google.com/flights", emoji: "✈️" },
            { label: "Find Hotels",    url: "https://www.booking.com",         emoji: "🏨" },
            { label: "Book Trains",    url: "https://www.irctc.co.in",         emoji: "🚂" },
          ].map((link) => (
            <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 py-3 text-sm text-[#1A1A2E] font-medium hover:text-[#FF6B35] transition-colors">
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
