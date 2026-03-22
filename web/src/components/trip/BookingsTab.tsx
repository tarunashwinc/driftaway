"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Plane, Hotel, Train, Car, ExternalLink, ArrowRight,
  Download, FileText, Trash2, Paperclip, Upload, AlertTriangle, X,
} from "lucide-react";
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

// ── Confirm delete modal ──────────────────────────────────────────────────────

function ConfirmDeleteModal({
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl p-5 max-w-[320px] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <p className="text-sm font-bold text-[#1A1A2E]">{title}</p>
        </div>
        <p className="text-xs text-[#6B7280] mb-4 leading-relaxed">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#F9F9F9] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Document section: chip list + add button ─────────────────────────────────

const DOC_MIME_ICON: Record<string, string> = {
  "application/pdf": "📄",
  "image/jpeg": "🖼️",
  "image/png": "🖼️",
  "image/webp": "🖼️",
};

async function openDoc(tripId: string, docId: string) {
  const token = getAccessToken();
  const res = await fetch(`/api/v1/trips/${tripId}/documents/${docId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load document");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function DocChip({
  doc,
  tripId,
  onDelete,
}: {
  doc: TripDocument;
  tripId: string;
  onDelete: (docId: string) => void;
}) {
  const [opening, setOpening] = useState(false);
  const emoji = DOC_MIME_ICON[doc.mimeType] ?? DOC_EMOJI[doc.type] ?? "📄";

  const handleOpen = async () => {
    if (opening) return;
    setOpening(true);
    try { await openDoc(tripId, doc.id); } catch { /* silent */ } finally { setOpening(false); }
  };

  // Shorten file name for display
  const shortName = (() => {
    const noExt = doc.name.replace(/\.[^.]+$/, "");
    return noExt.length > 18 ? noExt.slice(0, 16) + "…" : noExt;
  })();

  return (
    <div className="flex items-center gap-0 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] overflow-hidden group hover:border-[#FF6B35]/40 hover:bg-[#FFF8F5] transition-all">
      {/* Clickable doc area */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={opening}
        className="flex items-center gap-2 px-3 py-2 flex-1 min-w-0 text-left active:scale-[0.97] transition-transform disabled:opacity-60"
      >
        <span className="text-sm shrink-0">
          {opening ? "⏳" : emoji}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[#1A1A2E] leading-tight truncate">{shortName}</p>
          <p className="text-[10px] text-[#9CA3AF]">{formatSize(doc.sizeBytes)}</p>
        </div>
        <Download size={10} className="shrink-0 text-[#FF6B35] opacity-0 group-hover:opacity-100 transition-opacity ml-1" strokeWidth={2.5} />
      </button>

      {/* Delete button — subtle right border */}
      <button
        type="button"
        onClick={() => onDelete(doc.id)}
        className="w-7 h-full border-l border-[#F3F4F6] flex items-center justify-center text-[#D1D5DB] hover:text-red-400 hover:bg-red-50 transition-all shrink-0"
        aria-label="Remove document"
      >
        <Trash2 size={11} strokeWidth={2} />
      </button>
    </div>
  );
}

function DocSection({
  docs,
  tripId,
  bookingId,
  onDelete,
  onUploaded,
}: {
  docs: TripDocument[];
  tripId: string;
  bookingId: string;
  onDelete: (docId: string) => void;
  onUploaded: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const form = new FormData();
      form.append("file", file);
      form.append("type", "other");
      form.append("bookingId", bookingId);
      const res = await fetch(`/api/v1/trips/${tripId}/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const j = await res.json() as { error?: { message?: string } };
        throw new Error(j.error?.message ?? "Upload failed");
      }
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#F3F4F6]">
      {/* Section label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest flex items-center gap-1">
          <FileText size={10} strokeWidth={2.5} />
          Documents {docs.length > 0 && <span className="ml-0.5 font-bold text-[#1A1A2E]">· {docs.length}</span>}
        </span>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 text-[10px] font-semibold text-[#9CA3AF] hover:text-[#FF6B35] transition-colors disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-[#FFF8F5]"
        >
          {uploading ? <><Spinner size={10} /><span>Uploading…</span></> : <><Paperclip size={10} strokeWidth={2.5} /><span>Attach</span></>}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />

      {/* Doc chips grid */}
      {docs.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {docs.map((doc) => (
            <DocChip key={doc.id} doc={doc} tripId={tripId} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#E5E7EB] text-[11px] text-[#C4C9D4] hover:border-[#FF6B35]/40 hover:text-[#FF6B35]/70 hover:bg-[#FFF8F5] transition-all"
        >
          <Paperclip size={11} strokeWidth={2} />
          <span>Tap to attach a document (PDF or image)</span>
        </button>
      )}
      {error && <p className="text-[10px] text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

// ── Booking card wrapper with delete ─────────────────────────────────────────

function BookingCardShell({
  children,
  onDelete,
}: {
  children: ReactNode;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <div className="relative group">
        {children}
        {/* Delete booking button — top right overlay */}
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="absolute top-3 right-3 w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 active:scale-90 transition-all opacity-0 group-hover:opacity-100 z-10"
          aria-label="Delete booking"
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>

      {confirmOpen && (
        <ConfirmDeleteModal
          title="Delete booking?"
          message="This will permanently delete the booking and all its attached documents. This cannot be undone."
          onConfirm={() => void handleConfirm()}
          onCancel={() => setConfirmOpen(false)}
          loading={deleting}
        />
      )}
    </>
  );
}

// ── Flight card ───────────────────────────────────────────────────────────────

function FlightCard({
  b, docs, tripId, onDeleteDoc, onUploadDone,
}: { b: Booking; docs: TripDocument[]; tripId: string; onDeleteDoc: (id: string) => void; onUploadDone: () => void }) {
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
              {b.departureDate && <p className="text-[10px] text-[#9CA3AF]">{formatDate(b.departureDate)}</p>}
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5 px-2">
              <div className="flex items-center gap-1 w-full">
                <div className="flex-1 h-px bg-[#E5E7EB]" />
                <Plane size={14} className="text-[#9CA3AF]" strokeWidth={1.5} />
                <div className="flex-1 h-px bg-[#E5E7EB]" />
              </div>
            </div>
            <div className="text-center min-w-[48px]">
              <p className="text-2xl font-black text-[#1A1A2E] leading-none tracking-tight">
                {extractIATA(b.toLocation ?? "")}
              </p>
              {b.arrivalTime && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{b.arrivalTime}</p>}
              {b.arrivalDate && <p className="text-[10px] text-[#9CA3AF]">{formatDate(b.arrivalDate)}</p>}
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

      {/* Documents */}
      <div className="px-4 pb-4">
        <DocSection docs={docs} tripId={tripId} bookingId={b.id} onDelete={onDeleteDoc} onUploaded={onUploadDone} />
      </div>
    </div>
  );
}

// ── Hotel card ────────────────────────────────────────────────────────────────

function HotelCard({
  b, docs, tripId, onDeleteDoc, onUploadDone,
}: { b: Booking; docs: TripDocument[]; tripId: string; onDeleteDoc: (id: string) => void; onUploadDone: () => void }) {
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
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-0.5">Hotel</p>
              <p className="text-sm font-bold text-[#1A1A2E] leading-snug">{b.name}</p>
            </div>
            <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${s.classes}`}>{s.label}</span>
          </div>

          {(b.checkIn ?? b.checkOut) && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#6B7280]">
              <span>In: <span className="font-semibold text-[#1A1A2E]">{b.checkIn ? formatDateFull(b.checkIn) : "—"}</span></span>
              <ArrowRight size={11} className="text-[#D1D5DB]" />
              <span>Out: <span className="font-semibold text-[#1A1A2E]">{b.checkOut ? formatDateFull(b.checkOut) : "—"}</span></span>
            </div>
          )}

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

          <div className="flex items-center justify-between mt-2 gap-2">
            {b.confirmationRef && (
              <span className="text-[10px] font-mono bg-[#F0EEE9] text-[#6B7280] px-2 py-0.5 rounded-full">Ref: {b.confirmationRef}</span>
            )}
            {b.cost != null && b.currency && (
              <span className="text-sm font-bold text-[#1A1A2E] shrink-0">{formatCurrency(b.cost, b.currency)}</span>
            )}
          </div>

          {notes && <p className="text-[10px] text-amber-500 mt-1.5 font-medium">⚠️ {notes}</p>}

          <DocSection docs={docs} tripId={tripId} bookingId={b.id} onDelete={onDeleteDoc} onUploaded={onUploadDone} />
        </div>
      </div>
    </div>
  );
}

// ── Generic card ──────────────────────────────────────────────────────────────

function GenericCard({
  b, docs, tripId, onDeleteDoc, onUploadDone,
}: { b: Booking; docs: TripDocument[]; tripId: string; onDeleteDoc: (id: string) => void; onUploadDone: () => void }) {
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
          <DocSection docs={docs} tripId={tripId} bookingId={b.id} onDelete={onDeleteDoc} onUploaded={onUploadDone} />
        </div>
      </div>
    </div>
  );
}

function BookingCard({
  b, docs, tripId, onDeleteDoc, onUploadDone, onDeleteBooking,
}: {
  b: Booking; docs: TripDocument[]; tripId: string;
  onDeleteDoc: (id: string) => void; onUploadDone: () => void;
  onDeleteBooking: () => void;
}) {
  const inner =
    b.type === "flight" ? <FlightCard b={b} docs={docs} tripId={tripId} onDeleteDoc={onDeleteDoc} onUploadDone={onUploadDone} /> :
    b.type === "hotel"  ? <HotelCard  b={b} docs={docs} tripId={tripId} onDeleteDoc={onDeleteDoc} onUploadDone={onUploadDone} /> :
                          <GenericCard b={b} docs={docs} tripId={tripId} onDeleteDoc={onDeleteDoc} onUploadDone={onUploadDone} />;

  return <BookingCardShell onDelete={onDeleteBooking}>{inner}</BookingCardShell>;
}

// ── Upload from document button ───────────────────────────────────────────────

function CreateFromDocumentButton({
  tripId,
  onCreated,
}: {
  tripId: string;
  onCreated: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setParsed(null);
    try {
      const token = getAccessToken();
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`/api/v1/trips/${tripId}/bookings/from-document`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const j = await res.json() as {
        success?: boolean;
        data?: { booking?: { name?: string; type?: string }; documentId?: string };
        error?: { message?: string };
      };
      if (!res.ok) throw new Error(j.error?.message ?? "Failed to create booking");
      const name = j.data?.booking?.name ?? j.data?.booking?.type ?? "booking";
      setParsed(`✅ Created "${name}" from document`);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create booking");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (parsed) setTimeout(() => setParsed(null), 4000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-dashed border-[#E5E7EB] p-4">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="w-full flex flex-col items-center gap-2 py-3 disabled:opacity-60"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${uploading ? "bg-[#FF6B35]/10" : "bg-[#1A1A2E]/5"}`}>
          {uploading
            ? <Spinner size={20} />
            : <Upload size={18} className="text-[#1A1A2E]" strokeWidth={1.8} />}
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-[#1A1A2E]">
            {uploading ? "Scanning document…" : "Upload to create booking"}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">
            {uploading
              ? "AI is reading your document"
              : "PDF or image — AI will extract all booking details"}
          </p>
        </div>
      </button>
      {parsed && <p className="text-[11px] text-[#06D6A0] font-semibold text-center mt-1">{parsed}</p>}
      {error && <p className="text-[11px] text-red-500 text-center mt-1">{error}</p>}
    </div>
  );
}

// ── Trip documents section (docs with no booking) ─────────────────────────────

function TripDocumentsSection({
  docs,
  tripId,
  onDelete,
}: {
  docs: TripDocument[];
  tripId: string;
  onDelete: (docId: string) => void;
}) {
  if (docs.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-base leading-none">📂</span>
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">Trip Documents</p>
        <span className="ml-auto text-xs text-[#9CA3AF] bg-white border border-black/8 px-2 py-0.5 rounded-full font-semibold">
          {docs.length}
        </span>
      </div>
      <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 px-4 py-3">
        <p className="text-[10px] text-[#9CA3AF] mb-2">General trip documents (not linked to a specific booking)</p>
        <div className="flex flex-col gap-1.5">
          {docs.map((doc) => (
            <DocChip key={doc.id} doc={doc} tripId={tripId} onDelete={onDelete} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function BookingsTab({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();

  const { data: bData, isLoading, isError } = useQuery({
    queryKey: ["trips", tripId, "bookings"],
    queryFn:  () => api.get<BookingsResponse>(`/trips/${tripId}/bookings`),
  });
  const { data: dData } = useQuery({
    queryKey: ["trips", tripId, "documents"],
    queryFn:  () => api.get<DocumentsResponse>(`/trips/${tripId}/documents`),
  });

  // Delete document mutation
  const { mutate: deleteDoc } = useMutation({
    mutationFn: (docId: string) =>
      api.delete<{ success: boolean }>(`/trips/${tripId}/documents/${docId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trips", tripId, "documents"] });
    },
  });

  // Delete booking mutation
  const { mutate: deleteBooking } = useMutation({
    mutationFn: (bookingId: string) =>
      api.delete<{ success: boolean }>(`/trips/${tripId}/bookings/${bookingId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trips", tripId, "bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["trips", tripId, "documents"] });
    },
  });

  const bookings = bData?.data ?? [];
  const allDocs  = dData?.data ?? [];

  // Separate docs by bookingId: linked to a booking vs. general trip docs
  const docsByBookingId = new Map<string, TripDocument[]>();
  const unlinkedDocs: TripDocument[] = [];

  const allBookingIds = new Set(bookings.map((b) => b.id));

  for (const doc of allDocs) {
    const bid = doc.metadata?.bookingId as string | undefined;
    if (bid && allBookingIds.has(bid)) {
      const existing = docsByBookingId.get(bid) ?? [];
      existing.push(doc);
      docsByBookingId.set(bid, existing);
    } else {
      // No bookingId or bookingId doesn't match any booking → show in general section
      unlinkedDocs.push(doc);
    }
  }

  const getDocsForBooking = (b: Booking) => docsByBookingId.get(b.id) ?? [];

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["trips", tripId, "bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["trips", tripId, "documents"] });
  };

  const refreshDocs = () => {
    void queryClient.invalidateQueries({ queryKey: ["trips", tripId, "documents"] });
  };

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
      {/* Create booking from document — prominent at top */}
      <CreateFromDocumentButton tripId={tripId} onCreated={refreshAll} />

      {sections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="text-4xl mb-3">🎫</div>
          <p className="text-[#1A1A2E] font-bold text-base mb-1">No bookings yet</p>
          <p className="text-[#9CA3AF] text-sm max-w-[220px]">Upload a flight ticket or hotel confirmation above — AI will extract all the details automatically</p>
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
            <BookingCard
              key={b.id}
              b={b}
              docs={getDocsForBooking(b)}
              tripId={tripId}
              onDeleteDoc={deleteDoc}
              onUploadDone={refreshDocs}
              onDeleteBooking={() => new Promise<void>((res) => deleteBooking(b.id, { onSettled: () => res() }))}
            />
          ))}
        </div>
      ))}

      {/* General trip documents (not linked to any booking) */}
      <TripDocumentsSection docs={unlinkedDocs} tripId={tripId} onDelete={deleteDoc} />

      {/* Manual add */}
      <a href={`/trips/${tripId}/bookings/new`}>
        <button
          type="button"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#1A1A2E] text-white text-sm font-bold shadow-[0_4px_14px_rgba(26,26,46,0.25)] active:scale-[0.98] transition-transform"
        >
          <Plus size={16} />Add Booking Manually
        </button>
      </a>

      {/* External links */}
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
