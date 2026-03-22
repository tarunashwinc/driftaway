"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Sparkles,
  Share2,
} from "lucide-react";
import { api } from "../../../../lib/api";
import { Button } from "../../../../components/ui/button";
import { Spinner } from "../../../../components/ui/spinner";
import { ItineraryTab } from "../../../../components/trip/ItineraryTab";
import { ChecklistTab } from "../../../../components/trip/ChecklistTab";
import { BudgetTab } from "../../../../components/trip/BudgetTab";
import { BookingsTab } from "../../../../components/trip/BookingsTab";
import { TravelersTab } from "../../../../components/trip/TravelersTab";
import { WishlistTab } from "../../../../components/trip/WishlistTab";

interface TripMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

interface TripDetail {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  currency: string;
  aiProvider: string;
  bannerConfig?: { emoji?: string; gradient?: string } | null;
  preferences?: {
    wishlist?: string[];
    placesToVisit?: string[];
    pace?: string;
    focusAreas?: string[];
    notes?: string;
  } | null;
  members: TripMember[];
  memberCount?: number;
  minorCount?: number;
  budgetTotal?: number | null;
}

interface TripResponse {
  success: boolean;
  data: TripDetail;
}

interface GeneratePlanResponse {
  success: boolean;
  data: { jobId: string };
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:      { bg: "bg-black/20", text: "text-white" },
  planning:   { bg: "bg-blue-500/80", text: "text-white" },
  confirmed:  { bg: "bg-[#06D6A0]/80", text: "text-white" },
  active:     { bg: "bg-[#06D6A0]/80", text: "text-white" },
  completed:  { bg: "bg-white/20", text: "text-white" },
  cancelled:  { bg: "bg-red-500/80", text: "text-white" },
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en", opts)} – ${e.toLocaleDateString("en", {
    ...opts,
    year: "numeric",
  })}`;
}

function getDurationDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
}

type TabKey = "itinerary" | "wishlist" | "people" | "bookings" | "checklist" | "budget";

const TABS: Array<{ key: TabKey; label: string; emoji: string }> = [
  { key: "itinerary", label: "Itinerary", emoji: "🗺️" },
  { key: "wishlist",  label: "Wishlist",  emoji: "🎯" },
  { key: "people",    label: "People",    emoji: "👥" },
  { key: "bookings",  label: "Bookings",  emoji: "🎫" },
  { key: "checklist", label: "Checklist", emoji: "✅" },
  { key: "budget",    label: "Budget",    emoji: "💰" },
];

function MemberAvatars({ members }: { members: TripMember[] }) {
  const shown = members.slice(0, 4);
  const extra = members.length - shown.length;

  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <div
          key={m.id}
          className={`w-7 h-7 rounded-full bg-[#FF6B35] flex items-center justify-center text-white text-xs font-bold border-2 border-white ${i > 0 ? "-ml-2" : ""}`}
          title={m.user.name}
        >
          {m.user.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className="-ml-2 w-7 h-7 rounded-full bg-[#F0EEE9] flex items-center justify-center text-[#6B7280] text-xs font-bold border-2 border-white">
          +{extra}
        </div>
      )}
    </div>
  );
}

function TripHeaderSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-52 bg-gray-300" />
      <div className="bg-[#F0EEE9]">
        <div className="bg-white rounded-t-3xl -mt-4 px-5 pt-5 pb-5 border-b border-black/5">
          <div className="h-7 bg-gray-200 rounded-xl w-2/3 mb-3" />
          <div className="h-4 bg-gray-100 rounded-lg w-1/2 mb-2" />
          <div className="h-4 bg-gray-100 rounded-lg w-1/3 mb-4" />
          <div className="h-12 bg-gray-200 rounded-2xl w-full" />
        </div>
        <div className="px-4 py-3 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-24 bg-gray-200 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>("itinerary");
  const [planGenerated, setPlanGenerated] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["trips", tripId],
    queryFn: () => api.get<TripResponse>(`/trips/${tripId}`),
  });

  const { mutate: generatePlan, isPending: isGenerating } = useMutation({
    mutationFn: () =>
      api.post<GeneratePlanResponse>(`/trips/${tripId}/generate-plan`),
    onSuccess: () => {
      setPlanGenerated(true);
      // Invalidate itinerary and checklist after a short delay to allow job processing
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["trips", tripId, "itinerary"],
        });
        queryClient.invalidateQueries({
          queryKey: ["trips", tripId, "checklist"],
        });
        queryClient.invalidateQueries({ queryKey: ["trips", tripId] });
      }, 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0EEE9]">
        <TripHeaderSkeleton />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="min-h-screen bg-[#F0EEE9] flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-5xl">😕</div>
        <p className="text-[#1A1A2E] font-semibold text-lg">Trip not found</p>
        <p className="text-[#9CA3AF] text-sm text-center">
          This trip may have been removed or you don't have access.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-2 px-6 py-3 rounded-2xl bg-white border border-black/8 text-[#1A1A2E] text-sm font-semibold shadow-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  const trip = data.data;
  const duration = getDurationDays(trip.startDate, trip.endDate);
  const statusStyle = STATUS_COLORS[trip.status] ?? STATUS_COLORS.draft;
  const canGeneratePlan =
    trip.status !== "completed" && trip.status !== "cancelled";

  return (
    <div className="min-h-screen bg-[#F0EEE9]">
      {/* ── Banner / Hero ─────────────────────────── */}
      <div
        className="relative h-52"
        style={{
          background:
            trip.bannerConfig?.gradient ??
            "linear-gradient(160deg, #1A1A2E 0%, #FF6B35 100%)",
        }}
      >
        {/* Gradient scrim at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />

        {/* Back button — frosted glass circle */}
        <Link href="/trips" className="absolute top-12 left-4 z-10">
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-sm active:scale-95 transition-transform"
            aria-label="Back to trips"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
        </Link>

        {/* Share button — frosted glass circle */}
        <button
          type="button"
          className="absolute top-12 right-4 z-10 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-sm active:scale-95 transition-transform"
          aria-label="Share trip"
        >
          <Share2 size={16} strokeWidth={2.5} />
        </button>

        {/* Large centered emoji */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-7xl drop-shadow-2xl select-none">
            {trip.bannerConfig?.emoji ?? "🌍"}
          </span>
        </div>

        {/* Status badge — top-right overlay, below header buttons */}
        <div className="absolute bottom-4 right-4 z-10">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm capitalize ${statusStyle.bg} ${statusStyle.text}`}
          >
            {trip.status}
          </span>
        </div>
      </div>

      {/* ── Info card overlapping banner ─────────── */}
      <div className="bg-[#F0EEE9]">
        <div className="bg-white rounded-t-3xl -mt-4 px-5 pt-5 pb-5 border-b border-black/5 shadow-[0_-1px_0_rgba(0,0,0,0.03)]">
          {/* Title */}
          <h1 className="text-2xl font-bold text-[#1A1A2E] leading-tight mb-3"
              style={{ fontFamily: "Outfit, sans-serif" }}>
            {trip.title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <MapPin size={13} className="text-[#FF6B35] shrink-0" />
              <span className="font-medium text-[#4B5563]">{trip.destination}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <Calendar size={13} className="text-[#FF6B35] shrink-0" />
              <span>
                {formatDateRange(trip.startDate, trip.endDate)}
                {" · "}
                <span className="font-semibold text-[#1A1A2E]">{duration} days</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <Users size={13} className="text-[#FF6B35] shrink-0" />
              <span>
                {trip.members.length} adult{trip.members.length !== 1 ? "s" : ""}
                {(trip.minorCount ?? 0) > 0 && ` · ${trip.minorCount} kid${trip.minorCount !== 1 ? "s" : ""}`}
              </span>
              <MemberAvatars members={trip.members} />
            </div>
          </div>

          {/* Generate AI Plan */}
          {canGeneratePlan && (
            <div>
              <button
                type="button"
                onClick={() => generatePlan()}
                disabled={isGenerating}
                className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] ${
                  isGenerating
                    ? "bg-[#1A1A2E]/80 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#FF6B35] to-[#FF8C5A] shadow-[0_4px_14px_rgba(255,107,53,0.4)]"
                }`}
              >
                {isGenerating ? (
                  <>
                    <Spinner size={16} className="text-white opacity-80" />
                    <span>Building your AI plan…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} strokeWidth={2.5} />
                    <span>
                      {planGenerated ? "Regenerate AI Plan" : "Generate AI Plan"}
                    </span>
                  </>
                )}
              </button>
              {planGenerated && !isGenerating && (
                <p className="text-xs text-center text-[#06D6A0] mt-2.5 font-semibold">
                  ✨ AI is building your plan — check back in a moment!
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Pill tab bar ────────────────────────── */}
        <div className="px-4 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  activeTab === tab.key
                    ? "bg-[#1A1A2E] text-white shadow-sm"
                    : "bg-white text-[#9CA3AF] border border-black/8 hover:text-[#6B7280]"
                }`}
              >
                <span className="text-base leading-none">{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ─────────────────────────── */}
        <div className="px-4 pt-1 pb-8">
          {activeTab === "itinerary" && <ItineraryTab  tripId={tripId} />}
          {activeTab === "wishlist"  && (
            <WishlistTab
              tripId={tripId}
              wishlist={trip.preferences?.wishlist ?? []}
              placesToVisit={trip.preferences?.placesToVisit ?? []}
              notes={trip.preferences?.notes}
            />
          )}
          {activeTab === "people"    && <TravelersTab  tripId={tripId} />}
          {activeTab === "bookings"  && <BookingsTab   tripId={tripId} />}
          {activeTab === "checklist" && <ChecklistTab  tripId={tripId} />}
          {activeTab === "budget"    && <BudgetTab     tripId={tripId} />}
        </div>
      </div>
    </div>
  );
}
