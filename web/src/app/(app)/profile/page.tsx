"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Edit2,
  Check,
  X,
  Phone,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Camera,
  MapPin,
  Heart,
} from "lucide-react";
import { useAuthStore } from "../../../stores/authStore";
import { api, getAccessToken } from "../../../lib/api";
import { Spinner } from "../../../components/ui/spinner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserPreferences {
  diet?: string;
  allergies?: string[];
  interests?: string[];
  travelStyle?: string;
  languages?: string[];
  accessibility?: string[];
  transportPref?: string[];
  gender?: string;
  address?: string;
}

interface Minor {
  id: string;
  name: string;
  dateOfBirth: string;
  specialNeeds?: string | null;
}

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  avatarUrl?: string | null;
  homeCity?: string | null;
  dateOfBirth?: string | null;
  preferences?: UserPreferences | null;
}

interface ProfileResponse {
  success: boolean;
  data: UserProfile;
}

interface MinorsResponse {
  success: boolean;
  data: Minor[];
}

interface FamilyMember {
  id: string;
  name: string;
  phone: string;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  preferences?: { familyRole?: string; gender?: string; diet?: string } | null;
}

interface FamilyResponse {
  success: boolean;
  data: {
    familyGroupId: string | null;
    members: FamilyMember[];
    minors: Minor[];
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DIETS = ["none", "vegetarian", "vegan", "halal", "kosher", "jain"] as const;

const DIET_LABELS: Record<string, string> = {
  none: "None",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  halal: "Halal",
  kosher: "Kosher",
  jain: "Jain",
};

const ALLERGY_OPTIONS = ["Nuts", "Dairy", "Gluten", "Shellfish", "Eggs", "Soy"];

const INTEREST_OPTIONS = [
  { value: "beaches", label: "🏖️ Beaches" },
  { value: "mountains", label: "🏔️ Mountains" },
  { value: "culture", label: "🏛️ Culture" },
  { value: "food", label: "🍜 Food" },
  { value: "adventure", label: "🧗 Adventure" },
  { value: "nightlife", label: "🌃 Nightlife" },
  { value: "history", label: "📚 History" },
  { value: "wellness", label: "🧘 Wellness" },
  { value: "shopping", label: "🛍️ Shopping" },
];

const TRAVEL_STYLES = [
  { value: "backpacker", label: "Backpacker", emoji: "🎒", desc: "Budget & local" },
  { value: "comfort", label: "Comfort", emoji: "🏨", desc: "Mid-range ease" },
  { value: "luxury", label: "Luxury", emoji: "💎", desc: "Premium only" },
  { value: "adventure", label: "Adventure", emoji: "🧗", desc: "Off the path" },
];

const TRANSPORT_OPTIONS = [
  { value: "flight", label: "✈️ Flight" },
  { value: "train", label: "🚂 Train" },
  { value: "road_trip", label: "🚗 Road Trip" },
  { value: "cruise", label: "🚢 Cruise" },
  { value: "bus", label: "🚌 Bus" },
  { value: "any", label: "🤷 Any" },
];

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const RELATIONSHIP_OPTIONS = [
  "Child",
  "Spouse",
  "Parent",
  "Sibling",
  "Grandparent",
  "Friend",
  "Other",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function getAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function parseMinorRelationship(specialNeeds?: string | null): {
  relationship: string | null;
  needs: string;
} {
  if (!specialNeeds) return { relationship: null, needs: "" };
  const match = specialNeeds.match(/^\[([^\]]+)\]([\s\S]*)/);
  if (match) return { relationship: match[1], needs: match[2].trim() };
  return { relationship: null, needs: specialNeeds };
}

function encodeMinorSpecialNeeds(relationship: string, needs: string): string {
  const rel = relationship ? `[${relationship}]` : "";
  const trimmed = needs.trim();
  return [rel, trimmed].filter(Boolean).join(" ");
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95 whitespace-nowrap ${
        selected
          ? "bg-[#FF6B35] text-white shadow-sm"
          : "bg-[#F3F2EE] text-[#6B7280] hover:bg-[#E8E6E0]"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const storeUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateUser = useAuthStore((s) => s.updateUser);
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Remote data ──────────────────────────────────────────────────────────

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<ProfileResponse>("/users/me"),
  });

  const { data: minorsData } = useQuery({
    queryKey: ["minors"],
    queryFn: () => api.get<MinorsResponse>("/users/me/minors"),
  });

  const { data: familyData } = useQuery({
    queryKey: ["family"],
    queryFn: () => api.get<FamilyResponse>("/users/me/family"),
  });

  const profile = profileData?.data;

  // ── Local state ──────────────────────────────────────────────────────────

  const [prefs, setPrefs] = useState<UserPreferences>({});
  const [dobValue, setDobValue] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [langInput, setLangInput] = useState("");
  const [showAddMinor, setShowAddMinor] = useState(false);
  const [minorName, setMinorName] = useState("");
  const [minorDob, setMinorDob] = useState("");
  const [minorNeeds, setMinorNeeds] = useState("");
  const [minorRelationship, setMinorRelationship] = useState("Child");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [minors, setMinors] = useState<Minor[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile?.preferences) setPrefs(profile.preferences);
    if (profile?.name) setNameValue(profile.name);
    if (profile?.dateOfBirth) setDobValue(profile.dateOfBirth.slice(0, 10));
  }, [profile]);

  useEffect(() => {
    if (minorsData?.data) setMinors(minorsData.data);
  }, [minorsData]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const { mutate: savePrefs, isPending: isSavingPrefs } = useMutation({
    mutationFn: () =>
      api.put<ProfileResponse>("/users/me", {
        dateOfBirth: dobValue || null,
        preferences: prefs,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    },
  });

  const { mutate: saveName, isPending: isSavingName } = useMutation({
    mutationFn: (name: string) => api.put<ProfileResponse>("/users/me", { name }),
    onSuccess: (res) => {
      updateUser({ name: res.data.name });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setEditingName(false);
    },
  });

  const { mutate: addMinor, isPending: isAddingMinor } = useMutation({
    mutationFn: () =>
      api.post<MinorsResponse>("/users/me/minors", {
        name: minorName.trim(),
        dateOfBirth: minorDob,
        specialNeeds:
          encodeMinorSpecialNeeds(minorRelationship, minorNeeds) || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minors"] });
      setMinorName("");
      setMinorDob("");
      setMinorNeeds("");
      setMinorRelationship("Child");
      setShowAddMinor(false);
    },
  });

  const { mutate: deleteMinor } = useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean }>(`/users/me/minors/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["minors"] }),
  });

  // ── Avatar upload ─────────────────────────────────────────────────────────

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/v1/users/me/avatar", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: form,
      });
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["me"] });
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function toggleArrayPref(
    key: keyof Pick<
      UserPreferences,
      "allergies" | "interests" | "languages" | "accessibility" | "transportPref"
    >,
    value: string
  ) {
    setPrefs((prev) => {
      const arr = (prev[key] as string[] | undefined) ?? [];
      return {
        ...prev,
        [key]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  function handleSaveName() {
    const trimmed = nameValue.trim();
    if (trimmed) saveName(trimmed);
  }

  const displayName = profile?.name ?? storeUser?.name ?? "Traveler";
  const familyMembers = familyData?.data?.members ?? [];
  const familyMinors = familyData?.data?.minors ?? [];

  // ── Loading state ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F0EEE9]">
        <Spinner />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="px-4 pt-8 pb-10 bg-[#F0EEE9] min-h-dvh">
      <h1
        className="text-2xl font-bold text-[#1A1A2E] mb-6"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        My Profile
      </h1>

      {/* ── Avatar + Identity card ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-5 mb-4">
        <div className="flex items-center gap-4">
          {/* Avatar with upload overlay */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#FF8C61] flex items-center justify-center text-white text-xl font-bold shadow-[0_4px_12px_rgba(255,107,53,0.3)] overflow-hidden">
              {uploadingAvatar ? (
                <Spinner className="text-white" size={20} />
              ) : profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(displayName)
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1A1A2E] flex items-center justify-center shadow-md border-2 border-white active:scale-90 transition-transform"
              aria-label="Change avatar"
            >
              <Camera size={11} className="text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          {/* Name + phone */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 font-semibold text-[#1A1A2E] min-w-0"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={isSavingName || !nameValue.trim()}
                  className="w-8 h-8 rounded-xl bg-[#06D6A0] flex items-center justify-center text-white disabled:opacity-50 shrink-0"
                  aria-label="Save name"
                >
                  {isSavingName ? (
                    <Spinner className="w-3.5 h-3.5 text-white" size={14} />
                  ) : (
                    <Check size={15} strokeWidth={2.5} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0"
                  aria-label="Cancel"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNameValue(displayName);
                  setEditingName(true);
                }}
                className="flex items-center gap-1.5 group"
              >
                <span
                  className="font-bold text-[#1A1A2E] text-lg leading-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {displayName}
                </span>
                <Edit2
                  size={14}
                  className="text-[#C4C4C4] group-hover:text-[#9CA3AF] transition-colors"
                />
              </button>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Phone size={12} className="text-[#C4C4C4]" />
              <span className="text-sm text-[#9CA3AF]">
                {profile?.phone ?? storeUser?.phone ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── My Family ─────────────────────────────────────────────────────── */}
      {(familyMembers.length > 0 || familyMinors.length > 0) && (
        <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Heart size={13} className="text-[#FF6B35]" />
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">
              My Family
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {familyMembers.map((member, i) => {
              const role = (member.preferences as { familyRole?: string } | null)?.familyRole ?? "";
              const roleColors: Record<string, { bg: string; text: string }> = {
                Spouse: { bg: "bg-pink-50", text: "text-pink-600" },
                Child:  { bg: "bg-blue-50", text: "text-blue-600" },
                Head:   { bg: "bg-orange-50", text: "text-[#FF6B35]" },
              };
              const badge = roleColors[role] ?? { bg: "bg-gray-50", text: "text-gray-500" };
              const avatarColors = ["#FF6B35", "#06D6A0", "#6C63FF", "#FF3B82"];
              const color = avatarColors[i % avatarColors.length] ?? "#FF6B35";

              return (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F7F5] border border-black/5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#1A1A2E] truncate">{member.name}</p>
                      {role && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                          {role}
                        </span>
                      )}
                      {member.dateOfBirth && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-xs font-semibold">
                          {getAge(member.dateOfBirth)} yrs
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone size={10} className="text-[#C4C4C4]" />
                      <p className="text-xs text-[#9CA3AF]">{member.phone}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {familyMinors.map((minor) => {
              const { relationship } = parseMinorRelationship(minor.specialNeeds);
              return (
                <div key={minor.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F7F5] border border-black/5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#06D6A0] to-[#05B88B] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {minor.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#1A1A2E] truncate">{minor.name}</p>
                      {relationship && (
                        <span className="px-2 py-0.5 rounded-full bg-[#06D6A0]/15 text-[#05B88B] text-xs font-semibold">
                          {relationship}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-xs font-semibold">
                        Minor
                      </span>
                    </div>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      {getAge(minor.dateOfBirth)} yrs · Born {new Date(minor.dateOfBirth).toLocaleDateString("en", { month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Basic Information ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-5 mb-4">
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-5">
          Basic Information
        </p>

        {/* Date of Birth */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">
            Date of Birth{dobValue && <span className="ml-2 text-xs font-normal text-[#9CA3AF]">{getAge(dobValue)} yrs</span>}
          </label>
          <input
            type="date"
            value={dobValue}
            onChange={(e) => setDobValue(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-black/8 bg-[#F8F7F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]"
          />
        </div>

        {/* Gender */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#1A1A2E] mb-3">Gender</p>
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map((g) => (
              <Chip
                key={g}
                label={g}
                selected={prefs.gender === g}
                onClick={() =>
                  setPrefs((p) => ({ ...p, gender: p.gender === g ? undefined : g }))
                }
              />
            ))}
          </div>
        </div>

        {/* Current Address */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">
            Current Address
          </label>
          <div className="relative">
            <MapPin
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4C4C4]"
            />
            <input
              type="text"
              value={prefs.address ?? ""}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, address: e.target.value || undefined }))
              }
              placeholder="City, Country"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-black/8 bg-[#F8F7F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]"
            />
          </div>
        </div>
      </div>

      {/* ── Travel Preferences ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-5 mb-4">
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-5">
          Travel Preferences
        </p>

        {saveSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4">
            <CheckCircle2 size={16} className="text-[#06D6A0] shrink-0" />
            <span className="text-sm font-semibold text-emerald-700">
              Preferences saved!
            </span>
          </div>
        )}

        {/* Travel Style */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#1A1A2E] mb-3">Travel Style</p>
          <div className="grid grid-cols-2 gap-2">
            {TRAVEL_STYLES.map((s) => {
              const isSelected = prefs.travelStyle === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() =>
                    setPrefs((p) => ({
                      ...p,
                      travelStyle: p.travelStyle === s.value ? undefined : s.value,
                    }))
                  }
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all active:scale-95 text-left ${
                    isSelected
                      ? "border-[#FF6B35] bg-orange-50 ring-1 ring-[#FF6B35]"
                      : "border-black/8 bg-[#F8F7F5] hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xl">{s.emoji}</span>
                  <div>
                    <p
                      className={`text-sm font-semibold leading-tight ${
                        isSelected ? "text-[#FF6B35]" : "text-[#1A1A2E]"
                      }`}
                    >
                      {s.label}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">{s.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Diet */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#1A1A2E] mb-3">Diet</p>
          <div className="flex flex-wrap gap-2">
            {DIETS.map((d) => (
              <Chip
                key={d}
                label={DIET_LABELS[d] ?? d}
                selected={prefs.diet === d}
                onClick={() =>
                  setPrefs((p) => ({ ...p, diet: p.diet === d ? undefined : d }))
                }
              />
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#1A1A2E] mb-3">Allergies</p>
          <div className="flex flex-wrap gap-2">
            {ALLERGY_OPTIONS.map((a) => (
              <Chip
                key={a}
                label={a}
                selected={(prefs.allergies ?? []).includes(a)}
                onClick={() => toggleArrayPref("allergies", a)}
              />
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#1A1A2E] mb-3">Interests</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((i) => (
              <Chip
                key={i.value}
                label={i.label}
                selected={(prefs.interests ?? []).includes(i.value)}
                onClick={() => toggleArrayPref("interests", i.value)}
              />
            ))}
          </div>
        </div>

        {/* Transport Preference — multi-select */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#1A1A2E] mb-3">
            Transport Preference
          </p>
          <div className="flex flex-wrap gap-2">
            {TRANSPORT_OPTIONS.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                selected={(prefs.transportPref ?? []).includes(t.value)}
                onClick={() => toggleArrayPref("transportPref", t.value)}
              />
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#1A1A2E] mb-3">Languages</p>
          {(prefs.languages ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {(prefs.languages ?? []).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleArrayPref("languages", lang)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FF6B35] text-white text-sm font-semibold active:scale-95"
                  aria-label={`Remove ${lang}`}
                >
                  {lang}
                  <X size={12} strokeWidth={2.5} />
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={langInput}
              onChange={(e) => setLangInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && langInput.trim()) {
                  const trimmed = langInput.trim();
                  if (!(prefs.languages ?? []).includes(trimmed)) {
                    toggleArrayPref("languages", trimmed);
                  }
                  setLangInput("");
                }
              }}
              placeholder="Add language..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-black/8 bg-[#F8F7F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]"
            />
            <button
              type="button"
              onClick={() => {
                const trimmed = langInput.trim();
                if (trimmed) {
                  if (!(prefs.languages ?? []).includes(trimmed)) {
                    toggleArrayPref("languages", trimmed);
                  }
                  setLangInput("");
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold active:scale-95"
            >
              Add
            </button>
          </div>
        </div>

        {/* Save preferences */}
        <button
          type="button"
          onClick={() => savePrefs()}
          disabled={isSavingPrefs}
          className="w-full py-3.5 rounded-2xl bg-[#1A1A2E] text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-[0_4px_12px_rgba(26,26,46,0.25)] disabled:opacity-60"
        >
          {isSavingPrefs ? (
            <Spinner className="w-4 h-4 text-white" size={16} />
          ) : (
            <Save size={16} />
          )}
          {isSavingPrefs ? "Saving..." : "Save Preferences"}
        </button>
      </div>

      {/* ── Dependents ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-black/5 p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">
            Dependents
          </p>
          <button
            type="button"
            onClick={() => setShowAddMinor((s) => !s)}
            className="flex items-center gap-1 text-sm font-semibold text-[#FF6B35]"
          >
            <Plus size={15} />
            Add
          </button>
        </div>

        {minors.length === 0 && !showAddMinor && (
          <p className="text-sm text-[#9CA3AF] text-center py-2">
            No dependents added yet
          </p>
        )}

        {minors.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {minors.map((minor) => {
              const { relationship, needs } = parseMinorRelationship(minor.specialNeeds);
              return (
                <div
                  key={minor.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F7F5] border border-black/5"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#06D6A0] to-[#05B88B] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {minor.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#1A1A2E] truncate">
                        {minor.name}
                      </p>
                      {relationship && (
                        <span className="px-2 py-0.5 rounded-full bg-[#06D6A0]/15 text-[#05B88B] text-xs font-semibold">
                          {relationship}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#9CA3AF]">
                      {getAge(minor.dateOfBirth)} yrs · Born{" "}
                      {new Date(minor.dateOfBirth).toLocaleDateString("en", {
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {needs && (
                      <p className="text-xs text-[#9CA3AF] truncate">{needs}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteMinor(minor.id)}
                    className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 active:scale-90 transition-all shrink-0"
                    aria-label={`Remove ${minor.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {showAddMinor && (
          <div className="p-4 rounded-2xl bg-[#F8F7F5] border border-black/5 flex flex-col gap-3">
            <p className="text-sm font-semibold text-[#1A1A2E]">Add Dependent</p>

            {/* Relationship */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
                Relationship *
              </label>
              <select
                value={minorRelationship}
                onChange={(e) => setMinorRelationship(e.target.value)}
                className="px-4 py-3 rounded-xl border border-black/8 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]"
              >
                {RELATIONSHIP_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
                Full Name *
              </label>
              <input
                value={minorName}
                onChange={(e) => setMinorName(e.target.value)}
                placeholder="Full name"
                className="px-4 py-3 rounded-xl border border-black/8 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]"
              />
            </div>

            {/* DOB */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
                Date of Birth *
              </label>
              <input
                type="date"
                value={minorDob}
                onChange={(e) => setMinorDob(e.target.value)}
                className="px-4 py-3 rounded-xl border border-black/8 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]"
              />
            </div>

            {/* Special needs */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
                Special Needs (optional)
              </label>
              <input
                value={minorNeeds}
                onChange={(e) => setMinorNeeds(e.target.value)}
                placeholder="Dietary, medical, etc."
                className="px-4 py-3 rounded-xl border border-black/8 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addMinor()}
                disabled={!minorName.trim() || !minorDob || isAddingMinor}
                className="flex-1 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5"
              >
                {isAddingMinor ? (
                  <Spinner className="w-4 h-4 text-white" size={16} />
                ) : (
                  <Plus size={15} />
                )}
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddMinor(false);
                  setMinorName("");
                  setMinorDob("");
                  setMinorNeeds("");
                  setMinorRelationship("Child");
                }}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-[#6B7280] text-sm font-semibold active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Sign Out ───────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl border-2 border-red-200 text-red-500 font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform hover:bg-red-50"
      >
        <LogOut size={17} />
        Sign out
      </button>

      <p className="text-center text-xs text-[#C4C4C4] mt-6">
        DriftAway · plan less. live more.
      </p>
    </div>
  );
}
