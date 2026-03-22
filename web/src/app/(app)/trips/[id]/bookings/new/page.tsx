"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plane, Hotel, Train, Car, Ship, Ticket,
  ChevronDown, Check,
} from "lucide-react";
import { api } from "../../../../../../lib/api";
import { Spinner } from "../../../../../../components/ui/spinner";

// ── Types ────────────────────────────────────────────────────────────────────

type BookingType = "flight" | "hotel" | "train" | "bus" | "activity" | "ferry";
type BookingStatus = "pending" | "confirmed" | "cancelled";

interface BookingPayload {
  type: BookingType;
  status: BookingStatus;
  carrier?: string;
  name?: string;
  fromLocation?: string;
  toLocation?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  checkIn?: string;
  checkOut?: string;
  confirmationRef?: string;
  cost?: number;
  currency?: string;
  travelers: string[];
}

// ── Booking type config ────────────────────────────────────────────────────

const TYPES: Array<{
  id: BookingType;
  label: string;
  icon: typeof Plane;
  color: string;
  bg: string;
  hasRoute: boolean;
  hasHotel: boolean;
  carrierLabel: string;
  nameLabel: string;
}> = [
  { id: "flight",   label: "Flight",   icon: Plane,   color: "text-[#FF6B35]", bg: "bg-[#FF6B35]/10", hasRoute: true,  hasHotel: false, carrierLabel: "Airline",       nameLabel: "Flight number" },
  { id: "hotel",    label: "Hotel",    icon: Hotel,   color: "text-[#06D6A0]", bg: "bg-[#06D6A0]/10", hasRoute: false, hasHotel: true,  carrierLabel: "Hotel chain",   nameLabel: "Hotel name" },
  { id: "train",    label: "Train",    icon: Train,   color: "text-blue-500",  bg: "bg-blue-50",       hasRoute: true,  hasHotel: false, carrierLabel: "Rail operator", nameLabel: "Train / PNR" },
  { id: "bus",      label: "Bus",      icon: Car,     color: "text-purple-500",bg: "bg-purple-50",     hasRoute: true,  hasHotel: false, carrierLabel: "Operator",      nameLabel: "Service name" },
  { id: "activity", label: "Activity", icon: Ticket,  color: "text-amber-500", bg: "bg-amber-50",      hasRoute: false, hasHotel: false, carrierLabel: "Organiser",     nameLabel: "Activity name" },
  { id: "ferry",    label: "Ferry",    icon: Ship,    color: "text-cyan-500",  bg: "bg-cyan-50",       hasRoute: true,  hasHotel: false, carrierLabel: "Operator",      nameLabel: "Ferry name" },
];

const CURRENCIES = ["INR", "JPY", "USD", "EUR", "GBP", "AUD", "SGD", "THB", "IDR", "AED"];

// ── Field helpers ──────────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-[#9CA3AF]">{hint}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A2E] bg-white placeholder-[#C4C9D4] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-all ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full px-3.5 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A2E] bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-all ${props.className ?? ""}`}
      />
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function NewBookingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const tripId = params.id;

  const [type, setType] = useState<BookingType>("flight");
  const [status, setStatus] = useState<BookingStatus>("confirmed");
  const [carrier, setCarrier] = useState("");
  const [name, setName] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [confirmationRef, setConfirmationRef] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("INR");

  const typeConfig = TYPES.find((t) => t.id === type) ?? TYPES[0]!;

  const { mutate, isPending, error: mutationError } = useMutation({
    mutationFn: (payload: BookingPayload) =>
      api.post<{ success: boolean; data: unknown }>(`/trips/${tripId}/bookings`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trips", tripId, "bookings"] });
      router.back();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: BookingPayload = {
      type,
      status,
      travelers: [],
      ...(carrier && { carrier }),
      ...(name && { name }),
      ...(fromLocation && { fromLocation }),
      ...(toLocation && { toLocation }),
      ...(departureDate && { departureDate }),
      ...(departureTime && { departureTime }),
      ...(arrivalDate && { arrivalDate }),
      ...(arrivalTime && { arrivalTime }),
      ...(checkIn && { checkIn }),
      ...(checkOut && { checkOut }),
      ...(confirmationRef && { confirmationRef }),
      ...(cost && !isNaN(Number(cost)) && { cost: Number(cost), currency }),
    };
    mutate(payload);
  };

  const TypeIcon = typeConfig.icon;

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#F3F4F6] px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-8 h-8 rounded-xl bg-[#F0EEE9] flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft size={16} className="text-[#1A1A2E]" />
        </button>
        <div>
          <p className="text-xs text-[#9CA3AF] font-medium">New Booking</p>
          <p className="text-sm font-bold text-[#1A1A2E] leading-tight">Add manually</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 flex flex-col gap-5 max-w-xl mx-auto pb-28">

        {/* Type selector */}
        <div>
          <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">Booking type</p>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const active = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all active:scale-[0.96] ${
                    active
                      ? "border-[#1A1A2E] bg-[#1A1A2E] text-white"
                      : "border-[#E5E7EB] bg-white text-[#9CA3AF] hover:border-[#1A1A2E]/20"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? "bg-white/15" : t.bg}`}>
                    <Icon size={16} className={active ? "text-white" : t.color} strokeWidth={2} />
                  </div>
                  <span className={`text-[11px] font-bold ${active ? "text-white" : "text-[#6B7280]"}`}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <Field label="Status">
          <div className="grid grid-cols-3 gap-2">
            {(["confirmed", "pending", "cancelled"] as BookingStatus[]).map((s) => {
              const COLORS = {
                confirmed: "border-[#06D6A0] bg-[#06D6A0]/10 text-[#06D6A0]",
                pending:   "border-amber-400 bg-amber-50 text-amber-600",
                cancelled: "border-red-400 bg-red-50 text-red-500",
              };
              const active = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-[11px] font-bold capitalize transition-all ${
                    active ? COLORS[s] : "border-[#E5E7EB] bg-white text-[#9CA3AF]"
                  }`}
                >
                  {active && <Check size={11} strokeWidth={3} />}
                  {s}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Carrier / operator */}
        <Field label={typeConfig.carrierLabel} hint={type === "flight" ? "e.g. IndiGo, Air India, Emirates" : undefined}>
          <Input
            type="text"
            placeholder={type === "flight" ? "e.g. IndiGo" : type === "hotel" ? "e.g. Marriott, ITC Hotels" : "Operator name"}
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          />
        </Field>

        {/* Name / number */}
        <Field label={typeConfig.nameLabel} hint={type === "flight" ? "e.g. 6E-421, AI-302" : undefined}>
          <Input
            type="text"
            placeholder={type === "flight" ? "e.g. AI-302" : type === "hotel" ? "e.g. Park Hyatt Kyoto" : "Name or reference"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        {/* Route (for flights, trains, bus, ferry) */}
        {typeConfig.hasRoute && (
          <div className="flex flex-col gap-3">
            <Field label="From" hint={type === "flight" ? "e.g. Hyderabad (HYD)" : undefined}>
              <Input
                type="text"
                placeholder={type === "flight" ? "e.g. Hyderabad (HYD)" : "Departure location"}
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
              />
            </Field>
            <Field label="To" hint={type === "flight" ? "e.g. Tokyo Narita (NRT)" : undefined}>
              <Input
                type="text"
                placeholder={type === "flight" ? "e.g. Tokyo Narita (NRT)" : "Arrival location"}
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
              />
            </Field>

            {/* Departure */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Field label="Departure date">
                  <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
                </Field>
              </div>
              <div className="w-28">
                <Field label="Time">
                  <Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
                </Field>
              </div>
            </div>

            {/* Arrival */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Field label="Arrival date">
                  <Input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
                </Field>
              </div>
              <div className="w-28">
                <Field label="Time">
                  <Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* Hotel dates */}
        {typeConfig.hasHotel && (
          <div className="flex gap-2">
            <div className="flex-1">
              <Field label="Check-in">
                <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Check-out">
                <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {/* Confirmation ref */}
        <Field label="Confirmation / PNR" hint="Booking reference or confirmation number">
          <Input
            type="text"
            placeholder="e.g. ABC123, XYZPNR"
            value={confirmationRef}
            onChange={(e) => setConfirmationRef(e.target.value.toUpperCase())}
            className="font-mono tracking-wide"
          />
        </Field>

        {/* Cost */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Field label="Cost / price">
              <Input
                type="number"
                placeholder="0"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </Field>
          </div>
          <div className="w-28">
            <Field label="Currency">
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
        </div>

        {/* Error */}
        {mutationError && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-xs text-red-600 font-medium">
              {mutationError instanceof Error ? mutationError.message : "Failed to save booking"}
            </p>
          </div>
        )}
      </form>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl z-40 bg-white/95 backdrop-blur-sm border-t border-[#F3F4F6] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3.5 rounded-2xl border-2 border-[#E5E7EB] text-sm font-bold text-[#6B7280] hover:bg-[#F9F9F9] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form=""
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-2 flex-grow-[2] py-3.5 rounded-2xl bg-[#1A1A2E] text-white text-sm font-bold shadow-[0_4px_14px_rgba(26,26,46,0.3)] disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isPending ? (
              <><Spinner size={16} /><span>Saving…</span></>
            ) : (
              <><TypeIcon size={15} strokeWidth={2} /><span>Add {typeConfig.label}</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
