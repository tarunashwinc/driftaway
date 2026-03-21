"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, MapPin, Calendar } from "lucide-react";
import { api } from "../../../lib/api";
import { Spinner } from "../../../components/ui/spinner";
import { useAuthStore } from "../../../stores/authStore";

interface TripMember {
  user: { name: string; avatarUrl?: string | null };
}

interface TripSummary {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  currency: string;
  bannerConfig?: { emoji?: string; gradient?: string } | null;
  members: TripMember[];
}

interface TripsResponse {
  success: boolean;
  data: TripSummary[];
  meta: { page: number; total: number };
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft:     { bg: "bg-gray-100",        text: "text-gray-600",    label: "Draft" },
  planning:  { bg: "bg-blue-50",         text: "text-blue-600",    label: "Planning" },
  confirmed: { bg: "bg-emerald-50",      text: "text-emerald-600", label: "Confirmed" },
  active:    { bg: "bg-orange-50",       text: "text-[#FF6B35]",   label: "Active" },
  completed: { bg: "bg-gray-100",        text: "text-gray-500",    label: "Done" },
  cancelled: { bg: "bg-red-50",          text: "text-red-500",     label: "Cancelled" },
};

const BANNER_GRADIENTS = [
  "linear-gradient(135deg, #FF6B35 0%, #FF8C61 100%)",
  "linear-gradient(135deg, #06D6A0 0%, #0BB4A0 100%)",
  "linear-gradient(135deg, #1A1A2E 0%, #3D3D6E 100%)",
  "linear-gradient(135deg, #6C63FF 0%, #9B94FF 100%)",
  "linear-gradient(135deg, #FF6584 0%, #FF8C61 100%)",
];

function getBannerGradient(id: string, custom?: string): string {
  if (custom) return custom;
  const idx = id.charCodeAt(0) % BANNER_GRADIENTS.length;
  return BANNER_GRADIENTS[idx] ?? BANNER_GRADIENTS[0]!;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("en", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`;
}

function getDays(start: string, end: string): number {
  return Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
}

const AVATAR_COLORS = ["#FF6B35", "#06D6A0", "#6C63FF", "#FF6584"];

function MemberStack({ members }: { members?: TripMember[] }) {
  const list = members ?? [];
  const shown = list.slice(0, 3);
  const extra = list.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <div
          key={i}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white"
          style={{
            backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
            marginLeft: i > 0 ? "-6px" : 0,
          }}
        >
          {m.user.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div
          className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[10px] font-bold border-2 border-white"
          style={{ marginLeft: "-6px" }}
        >
          +{extra}
        </div>
      )}
      <span className="ml-2 text-xs text-[#9CA3AF] font-medium">
        {list.length} traveler{list.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

function TripCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 animate-pulse">
      <div className="h-28 bg-gray-200" />
      <div className="p-4 flex flex-col gap-2.5">
        <div className="flex justify-between items-start">
          <div className="h-5 bg-gray-200 rounded-lg w-2/3" />
          <div className="h-5 bg-gray-100 rounded-full w-16" />
        </div>
        <div className="h-3.5 bg-gray-100 rounded w-1/2" />
        <div className="h-3.5 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-2/5 mt-1" />
      </div>
    </div>
  );
}

export default function TripsPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["trips"],
    queryFn: () => api.get<TripsResponse>("/trips"),
  });

  const trips = data?.data ?? [];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#F0EEE9" }}
    >
      <div className="px-4 pt-10 pb-28 max-w-[480px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p
              className="text-sm font-medium mb-1"
              style={{ color: "#9CA3AF", fontFamily: "Space Grotesk, sans-serif" }}
            >
              Good day,
            </p>
            <h1
              className="text-[28px] font-bold leading-tight"
              style={{
                fontFamily: "Outfit, sans-serif",
                background: "linear-gradient(135deg, #FF6B35 0%, #FF8C61 60%, #1A1A2E 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {firstName} ✈️
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "#9CA3AF", fontFamily: "Space Grotesk, sans-serif" }}
            >
              {trips.length > 0
                ? `${trips.length} trip${trips.length !== 1 ? "s" : ""} planned`
                : "Where to next?"}
            </p>
          </div>

          {/* Inline new trip button — premium pill */}
          <Link href="/trips/new">
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white font-semibold text-sm shadow-[0_4px_12px_rgba(255,107,53,0.35)] active:scale-[0.97] transition-transform"
              style={{
                backgroundColor: "#FF6B35",
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              New Trip
            </button>
          </Link>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            <TripCardSkeleton />
            <TripCardSkeleton />
            <TripCardSkeleton />
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="text-5xl mb-4">😕</div>
            <p
              className="text-sm"
              style={{ color: "#9CA3AF", fontFamily: "Space Grotesk, sans-serif" }}
            >
              Couldn&apos;t load trips. Pull to refresh.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && trips.length === 0 && (
          <div className="flex flex-col items-center py-14 text-center">
            {/* Illustration-like emoji scene */}
            <div className="relative mb-6">
              <div
                className="w-28 h-28 rounded-3xl flex items-center justify-center text-5xl shadow-[0_8px_28px_rgba(255,107,53,0.28)]"
                style={{
                  background: "linear-gradient(135deg, #FF6B35 0%, #FF8C61 100%)",
                }}
              >
                🌍
              </div>
              <div
                className="absolute -top-2 -right-2 w-9 h-9 rounded-2xl flex items-center justify-center text-lg shadow-md"
                style={{ backgroundColor: "#06D6A0" }}
              >
                ✈️
              </div>
              <div
                className="absolute -bottom-1 -left-2 w-8 h-8 rounded-xl flex items-center justify-center text-base shadow-md"
                style={{ backgroundColor: "#1A1A2E" }}
              >
                🗺️
              </div>
            </div>

            <h3
              className="text-xl font-bold mb-2"
              style={{ fontFamily: "Outfit, sans-serif", color: "#1A1A2E" }}
            >
              No trips yet
            </h3>
            <p
              className="text-sm mb-8 max-w-[200px] leading-relaxed"
              style={{ color: "#9CA3AF", fontFamily: "Space Grotesk, sans-serif" }}
            >
              Your next adventure starts with a single tap
            </p>
            <Link href="/trips/new">
              <button
                className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-white font-semibold shadow-[0_4px_12px_rgba(255,107,53,0.35)] active:scale-[0.97] transition-transform"
                style={{
                  backgroundColor: "#FF6B35",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                <Plus size={18} strokeWidth={2.5} />
                Plan a trip
              </button>
            </Link>
          </div>
        )}

        {/* Trip cards */}
        {!isLoading && !isError && trips.length > 0 && (
          <div className="flex flex-col gap-3">
            {trips.map((trip) => {
              const statusStyle =
                STATUS_STYLES[trip.status] ?? STATUS_STYLES["draft"]!;
              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="block active:scale-[0.97] transition-transform"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <div className="bg-white rounded-3xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5">
                    {/* Banner */}
                    <div
                      className="h-28 relative flex items-end justify-between px-4 pb-3"
                      style={{
                        background: getBannerGradient(
                          trip.id,
                          trip.bannerConfig?.gradient
                        ),
                      }}
                    >
                      {/* Destination prominently over banner */}
                      <div className="flex items-center gap-1.5">
                        <MapPin
                          size={13}
                          className="text-white/80 shrink-0"
                        />
                        <span
                          className="text-white font-semibold text-sm drop-shadow-sm"
                          style={{ fontFamily: "Space Grotesk, sans-serif" }}
                        >
                          {trip.destination}
                        </span>
                      </div>

                      {/* Big emoji centered */}
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[42px] drop-shadow-md">
                        {trip.bannerConfig?.emoji ?? "🌍"}
                      </span>

                      {/* Status badge */}
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}
                        style={{ fontFamily: "Space Grotesk, sans-serif" }}
                      >
                        {statusStyle.label}
                      </span>
                    </div>

                    {/* Card body */}
                    <div className="p-4">
                      <h3
                        className="font-bold text-base leading-snug mb-2.5"
                        style={{
                          fontFamily: "Outfit, sans-serif",
                          color: "#1A1A2E",
                        }}
                      >
                        {trip.title}
                      </h3>

                      <div className="flex items-center gap-1.5 mb-3">
                        <Calendar
                          size={12}
                          className="shrink-0"
                          style={{ color: "#FF6B35" }}
                        />
                        <span
                          className="text-xs"
                          style={{
                            color: "#9CA3AF",
                            fontFamily: "Space Grotesk, sans-serif",
                          }}
                        >
                          {formatDateRange(trip.startDate, trip.endDate)}
                        </span>
                        <span
                          className="text-xs font-semibold ml-0.5"
                          style={{ color: "#1A1A2E" }}
                        >
                          · {getDays(trip.startDate, trip.endDate)}d
                        </span>
                      </div>

                      <MemberStack members={trip.members} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating action button (secondary — fixed bottom-right) */}
      <Link href="/trips/new">
        <button
          className="fixed bottom-6 right-5 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_6px_20px_rgba(255,107,53,0.45)] active:scale-[0.93] transition-transform z-50"
          style={{
            backgroundColor: "#FF6B35",
            WebkitTapHighlightColor: "transparent",
          }}
          aria-label="Create new trip"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      </Link>
    </div>
  );
}
