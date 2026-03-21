"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, Plane, Hotel, Train, Car, ExternalLink, ArrowRight, Download, FileText,
} from "lucide-react";
import Link from "next/link";
import { api } from "../../lib/api";
import { Spinner } from "../ui/spinner";

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
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
  metadata?: Record<string, unknown> | null;
  user: { id: string; name: string };
}

interface BookingsResponse { success: boolean; data: Booking[] }
interface DocumentsResponse { success: boolean; data: TripDocument[] }

const STATUS_STYLE: Record<string, { label: string; classes: string }> = {
  pending:   { label: "Pending",   classes: "bg-amber-50 text-amber-600 border border-amber-200" },
  confirmed: { label: "Confirmed", classes: "bg-[#06D6A0]/10 text-[#06D6A0] border border-[#06D6A0]/20" },
  cancelled: { label: "Cancelled", classes: "bg-red-50 text-red-500 border border-red-200" },
  completed: { label: "Completed", classes: "bg-[#F0EEE9] text-[#9CA3AF] border border-black/5" },
};

const DOC_TYPE_EMOJI: Record<string, string> = {
  ticket: "✈️", hotel_confirmation: "🏨", passport: "🛂",
  visa: "📋", insurance: "🛡️", itinerary: "🗺️", other: "📄",
};
const DOC_TYPE_LABEL: Record<string, string> = {
  ticket: "E-Ticket", hotel_confirmation: "Hotel Confirmation", passport: "Passport",
  visa: "Visa", insurance: "Insurance", itinerary: "Itinerary", other: "Document",
};

function getStatusStyle(s: string) { return STATUS_STYLE[s] ?? STATUS_STYLE.pending!; }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch { return `${currency} ${amount.toLocaleString()}`; }
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function extractIATA(loc: string) {
  return loc.match(/\(([A-Z]{3})\)/)?.[1] ?? loc.slice(0, 3).toUpperCase();
}

// ─── Flight Card ──────────────────────────────────────────────────────────────
function FlightCard({ b }: { b: Booking }) {
  const s = getStatusStyle(b.status);
  const hasRoute = b.fromLocation ?? b.toLocation;
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
            <Plane size={15} className="text-[#FF6B35]" strokeWidth={2} />
          </div>
          <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">{b.carrier ?? "Flight"}</span>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${s.classes}`}>{s.label}</span>
      </div>

      {hasRoute ? (
        <>
          <div className="px-4 py-2 flex items-center gap-2">
            <div className="text-center min-w-[48px]">
              <p className="text-2xl font-black text-[#1A1A2E] leading-none tracking-tight">{extractIATA(b.fromLocation ?? "")}</p>
              {b.departureTime && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{b.departureTime}</p>}
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5 px-2">
              <div className="flex items-center gap-1 w-full">
                <div className="flex-1 h-px bg-[#E5E7EB]" />
                <Plane size={14} className="text-[#9CA3AF]" strokeWidth={1.5} />
                <div className="flex-1 h-px bg-[#E5E7EB]" />
              </div>
              {b.departureDate && <span className="text-[10px] text-[#9CA3AF]">{formatDate(b.departureDate)}</span>}
            </div>
            <div className="text-center min-w-[48px]">
              <p className="text-2xl font-black text-[#1A1A2E] leading-none tracking-tight">{extractIATA(b.toLocation ?? "")}</p>
              {b.arrivalTime && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{b.arrivalTime}</p>}
            </div>
          </div>
          <div className="px-4 pb-1.5 flex items-center gap-1 text-[10px] text-[#9CA3AF]">
            <span className="truncate">{b.fromLocation}</span>
            <ArrowRight size={10} className="shrink-0" />
            <span className="truncate">{b.toLocation}</span>
          </div>
        </>
      ) : (
        <div className="px-4 pb-2"><p className="text-sm font-semibold text-[#1A1A2E]">{b.name}</p></div>
      )}

      <div className="flex items-center justify-between px-4 pt-1.5 pb-3.5 border-t border-[#F3F4F6] mt-1">
        <div className="flex items-center gap-2 min-w-0">
          {b.name && <span className="text-xs text-[#6B7280] font-medium truncate max-w-[140px]">{b.name}</span>}
          {b.confirmationRef && (
            <span className="text-[10px] font-mono bg-[#F0EEE9] text-[#6B7280] px-2 py-0.5 rounded-full shrink-0">{b.confirmationRef}</span>
          )}
        </div>
        {b.cost != null && b.currency && (
          <span className="text-sm font-bold text-[#1A1A2E] shrink-0 ml-2">{formatCurrency(b.cost, b.currency)}</span>
        )}
      </div>
    </div>
  );
}

// ─── Hotel Card ───────────────────────────────────────────────────────────────
function HotelCard({ b }: { b: Booking }) {
  const s = getStatusStyle(b.status);
  const inclusions = b.details?.inclusions as string[] | undefined;
  const roomType = b.details?.roomType as string | undefined;
  const notes = b.details?.notes as string | undefined;
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#06D6A0]/10 flex items-center justify-center shrink-0">
          <Hotel size={18} className="text-[#06D6A0]" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-0.5">Hotel</p>
              <p className="text-sm font-bold text-[#1A1A2E] leading-snug">{b.name}</p>
            </div>
            <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${s.classes}`}>{s.label}</span>
          </div>

          {(b.checkIn ?? b.checkOut) && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-[#6B7280]">
              <span>In: <span className="font-semibold text-[#1A1A2E]">{b.checkIn ? formatDate(b.checkIn) : "—"}</span></span>
              <ArrowRight size={11} className="text-[#D1D5DB]" />
              <span>Out: <span className="font-semibold text-[#1A1A2E]">{b.checkOut ? formatDate(b.checkOut) : "—"}</span></span>
            </div>
          )}

          {(roomType ?? (inclusions && inclusions.length > 0)) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {roomType && <span className="text-[10px] bg-[#F0EEE9] text-[#6B7280] px-2 py-0.5 rounded-full">{roomType}</span>}
              {inclusions?.map((inc) => (
                <span key={inc} className="text-[10px] bg-[#06D6A0]/10 text-[#06D6A0] px-2 py-0.5 rounded-full">{inc}</span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2 gap-2">
            {b.confirmationRef && (
              <span className="text-[10px] font-mono bg-[#F0EEE9] text-[#6B7280] px-2 py-0.5 rounded-full">Ref: {b.confirmationRef}</span>
            )}
            {b.cost != null && b.currency && (
              <span className="text-sm font-bold text-[#1A1A2E] shrink-0">{formatCurrency(b.cost, b.currency)}</span>
            )}
          </div>

          {notes && <p className="text-[10px] text-amber-500 mt-1.5 font-medium">⚠️ {notes}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Generic Card ─────────────────────────────────────────────────────────────
function GenericCard({ b }: { b: Booking }) {
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
        </div>
      </div>
    </div>
  );
}

function BookingCard({ b }: { b: Booking }) {
  if (b.type === "flight") return <FlightCard b={b} />;
  if (b.type === "hotel")  return <HotelCard  b={b} />;
  return <GenericCard b={b} />;
}

// ─── Document Row ─────────────────────────────────────────────────────────────
function DocumentRow({ doc }: { doc: TripDocument }) {
  const localPath = doc.metadata?.localPath as string | undefined;
  return (
    <button
      onClick={() => localPath && window.open(`file://${localPath}`, "_blank")}
      className="flex items-center gap-3 w-full py-3 px-4 bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border border-black/5 active:scale-[0.98] transition-transform text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-[#F0EEE9] flex items-center justify-center shrink-0 text-lg">
        {DOC_TYPE_EMOJI[doc.type] ?? "📄"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1A1A2E] leading-snug truncate">{doc.name}</p>
        <p className="text-[10px] text-[#9CA3AF] mt-0.5">
          {DOC_TYPE_LABEL[doc.type] ?? "Document"} · {formatSize(doc.sizeBytes)}
        </p>
      </div>
      <div className="shrink-0 w-8 h-8 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
        {localPath
          ? <Download size={14} className="text-[#FF6B35]" strokeWidth={2} />
          : <FileText size={14} className="text-[#9CA3AF]" strokeWidth={2} />
        }
      </div>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function BookingsTab({ tripId }: { tripId: string }) {
  const { data: bData, isLoading: bLoading, isError } = useQuery({
    queryKey: ["trips", tripId, "bookings"],
    queryFn:  () => api.get<BookingsResponse>(`/trips/${tripId}/bookings`),
  });
  const { data: dData, isLoading: dLoading } = useQuery({
    queryKey: ["trips", tripId, "documents"],
    queryFn:  () => api.get<DocumentsResponse>(`/trips/${tripId}/documents`),
  });

  const bookings  = bData?.data ?? [];
  const documents = dData?.data ?? [];

  if (bLoading) return <div className="flex justify-center py-14"><Spinner /></div>;
  if (isError)  return <div className="text-center py-10"><div className="text-4xl mb-3">⚠️</div><p className="text-[#9CA3AF] text-sm">Failed to load bookings</p></div>;

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
            <span className="ml-auto text-xs text-[#9CA3AF] bg-white border border-black/8 px-2 py-0.5 rounded-full font-semibold">{section.items.length}</span>
          </div>
          {section.items.map((b) => <BookingCard key={b.id} b={b} />)}
        </div>
      ))}

      {(documents.length > 0 || dLoading) && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-base leading-none">📎</span>
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">Documents</p>
            {!dLoading && <span className="ml-auto text-xs text-[#9CA3AF] bg-white border border-black/8 px-2 py-0.5 rounded-full font-semibold">{documents.length}</span>}
          </div>
          {dLoading ? <div className="flex justify-center py-4"><Spinner /></div> : documents.map((doc) => <DocumentRow key={doc.id} doc={doc} />)}
        </div>
      )}

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
