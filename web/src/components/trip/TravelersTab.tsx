"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users, UserPlus, Check, Zap } from "lucide-react";
import { api } from "../../lib/api";
import { Spinner } from "../ui/spinner";

interface TripMember {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    name: string;
    phone: string;
    avatarUrl?: string | null;
  };
}

interface TripResponse {
  success: boolean;
  data: {
    members: TripMember[];
  };
}

interface AddMemberResponse {
  success: boolean;
  data: TripMember;
}

interface FamilyMember {
  id: string;
  name: string;
  phone: string;
  avatarUrl?: string | null;
  preferences?: { familyRole?: string } | null;
}

interface FamilyMinor {
  id: string;
  name: string;
  dateOfBirth: string;
  specialNeeds?: string | null;
}

interface FamilyResponse {
  success: boolean;
  data: {
    familyGroupId: string | null;
    members: FamilyMember[];
    minors: FamilyMinor[];
  };
}

const AVATAR_COLORS = [
  "bg-[#FF6B35]",
  "bg-[#06D6A0]",
  "bg-[#6C63FF]",
  "bg-[#FF3B82]",
  "bg-[#1A1A2E]",
];

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

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  const prefix = phone.slice(0, Math.max(0, phone.length - 4)).replace(/\d/g, "•");
  return prefix + phone.slice(-4);
}

function getRoleBadge(role: string): { label: string; color: string; bg: string } {
  if (role === "organizer") return { label: "Organizer", color: "text-[#FF6B35]", bg: "bg-orange-50" };
  if (role === "viewer")    return { label: "Viewer",    color: "text-[#9CA3AF]", bg: "bg-gray-50" };
  return                           { label: "Traveler",  color: "text-[#06D6A0]", bg: "bg-emerald-50" };
}

function MemberRow({
  member,
  index,
  onRemove,
}: {
  member: TripMember;
  index: number;
  onRemove: (id: string) => void;
}) {
  const badge = getRoleBadge(member.role);
  const colorClass = AVATAR_COLORS[index % AVATAR_COLORS.length] ?? "bg-[#FF6B35]";

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-black/5 last:border-0">
      <div
        className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden`}
      >
        {member.user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.user.avatarUrl} alt={member.user.name} className="w-full h-full object-cover" />
        ) : (
          getInitials(member.user.name)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1A1A2E] truncate">{member.user.name}</p>
        <p className="text-xs text-[#9CA3AF]">{maskPhone(member.user.phone)}</p>
      </div>
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${badge.color} ${badge.bg}`}>
        {badge.label}
      </span>
      {member.role !== "organizer" && (
        <button
          type="button"
          onClick={() => onRemove(member.id)}
          className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 active:scale-90 transition-all shrink-0"
          aria-label={`Remove ${member.user.name}`}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

export function TravelersTab({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"traveler" | "viewer">("traveler");
  const [group, setGroup] = useState<"individual" | "family">("individual");
  const [addingAll, setAddingAll] = useState(false);

  const { data: tripData, isLoading } = useQuery({
    queryKey: ["trips", tripId],
    queryFn: () => api.get<TripResponse>(`/trips/${tripId}`),
  });

  const { data: familyData } = useQuery({
    queryKey: ["family"],
    queryFn: () => api.get<FamilyResponse>("/users/me/family"),
  });

  const { mutate: addMember, isPending: isAdding, error: addError } = useMutation({
    mutationFn: (payload: { phone: string; role: string }) =>
      api.post<AddMemberResponse>(`/trips/${tripId}/members`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] });
    },
  });

  const { mutate: removeMember } = useMutation({
    mutationFn: (memberId: string) =>
      api.delete<{ success: boolean }>(`/trips/${tripId}/members/${memberId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips", tripId] }),
  });

  const handleAddFormSubmit = () => {
    if (!phone.trim()) return;
    addMember(
      { phone: phone.trim(), role },
      {
        onSuccess: () => {
          setPhone("");
          setRole("traveler");
          setGroup("individual");
          setShowAddForm(false);
        },
      }
    );
  };

  // Add all family members not already in trip
  async function handleAddAllFamily(members: FamilyMember[]) {
    setAddingAll(true);
    const existingPhones = new Set(
      (tripData?.data?.members ?? []).map((m) => m.user.phone)
    );
    const toAdd = members.filter((m) => !existingPhones.has(m.phone));
    for (const member of toAdd) {
      await new Promise<void>((resolve) =>
        addMember(
          { phone: member.phone, role: "traveler" },
          { onSuccess: () => resolve(), onError: () => resolve() }
        )
      );
    }
    queryClient.invalidateQueries({ queryKey: ["trips", tripId] });
    setAddingAll(false);
  }

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Spinner size={24} />
      </div>
    );
  }

  const members = tripData?.data?.members ?? [];
  const adults = members.filter((m) => m.role !== "minor");
  const minors = members.filter((m) => m.role === "minor");

  const familyMembers = familyData?.data?.members ?? [];
  const familyMinors = familyData?.data?.minors ?? [];

  // Family members not yet in the trip
  const existingPhones = new Set(members.map((m) => m.user.phone));
  const unaddedFamily = familyMembers.filter((m) => !existingPhones.has(m.phone));

  return (
    <div className="flex flex-col gap-3 pt-3">

      {/* ── Smart family quick-add ── */}
      {familyMembers.length > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-[#FF6B35]/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-[#FF6B35]" />
            <p className="text-xs font-bold text-[#FF6B35] uppercase tracking-widest">
              My Family
            </p>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            {familyMembers.map((fm, i) => {
              const isAdded = existingPhones.has(fm.phone);
              const role = (fm.preferences as { familyRole?: string } | null)?.familyRole ?? "";
              const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length] ?? "bg-[#FF6B35]";
              return (
                <div key={fm.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {getInitials(fm.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A2E] truncate">{fm.name}</p>
                    {role && <p className="text-xs text-[#9CA3AF]">{role}</p>}
                  </div>
                  {isAdded ? (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#06D6A0]/15 shrink-0">
                      <Check size={11} className="text-[#06D6A0]" />
                      <span className="text-xs font-semibold text-[#06D6A0]">Added</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addMember({ phone: fm.phone, role: "traveler" })}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF6B35] text-white text-xs font-semibold active:scale-95 shrink-0"
                    >
                      <Plus size={11} />
                      Add
                    </button>
                  )}
                </div>
              );
            })}

            {familyMinors.map((minor) => (
              <div key={minor.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#06D6A0] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {minor.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1A2E] truncate">{minor.name}</p>
                  <p className="text-xs text-[#9CA3AF]">Minor · {getAge(minor.dateOfBirth)} yrs</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 text-xs font-semibold shrink-0">
                  Auto-included
                </span>
              </div>
            ))}
          </div>

          {unaddedFamily.length > 0 && (
            <button
              type="button"
              onClick={() => handleAddAllFamily(familyMembers)}
              disabled={addingAll}
              className="w-full py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-60"
            >
              {addingAll ? (
                <Spinner size={14} className="text-white" />
              ) : (
                <Users size={14} />
              )}
              {addingAll ? "Adding…" : `Add All Family (${unaddedFamily.length} left)`}
            </button>
          )}
        </div>
      )}

      {/* ── Adults list ── */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_16px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Users size={13} className="text-[#9CA3AF]" />
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">
            Adults · {adults.length}
          </p>
        </div>
        {adults.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-[#9CA3AF]">No adults yet</p>
        ) : (
          adults.map((m, i) => (
            <MemberRow key={m.id} member={m} index={i} onRemove={(id) => removeMember(id)} />
          ))
        )}
      </div>

      {/* ── Minors ── */}
      {minors.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_16px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">
              Minors · {minors.length}
            </p>
          </div>
          {minors.map((m, i) => (
            <MemberRow key={m.id} member={m} index={i} onRemove={(id) => removeMember(id)} />
          ))}
        </div>
      )}

      {/* ── Add traveler ── */}
      {showAddForm ? (
        <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_16px_rgba(0,0,0,0.08)] p-4">
          <p className="text-sm font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
            <UserPlus size={15} className="text-[#FF6B35]" />
            Invite by Phone
          </p>

          {addError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl px-3 py-2 mb-3">
              {addError instanceof Error ? addError.message : "Failed to add traveler"}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="px-4 py-3 rounded-xl border border-black/8 bg-[#F8F7F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">Role</label>
              <div className="flex gap-2">
                {(["traveler", "viewer"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      role === r
                        ? "border-[#FF6B35] bg-orange-50 text-[#FF6B35]"
                        : "border-black/8 bg-[#F8F7F5] text-[#6B7280]"
                    }`}
                  >
                    {r === "traveler" ? "✈️ Traveler" : "👁️ Viewer"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">Group As</label>
              <div className="flex gap-2">
                {(["individual", "family"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroup(g)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      group === g
                        ? "border-[#06D6A0] bg-emerald-50 text-[#06D6A0]"
                        : "border-black/8 bg-[#F8F7F5] text-[#6B7280]"
                    }`}
                  >
                    {g === "individual" ? "👤 Individual" : "👨‍👩‍👧 Family"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleAddFormSubmit}
                disabled={!phone.trim() || isAdding}
                className="flex-1 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5"
              >
                {isAdding ? <Spinner size={15} className="text-white" /> : <UserPlus size={15} />}
                Invite
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setPhone(""); }}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-[#6B7280] text-sm font-semibold active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full py-3.5 rounded-2xl bg-[#1A1A2E] text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-[0_4px_12px_rgba(26,26,46,0.2)]"
        >
          <Plus size={16} />
          Add Other Traveler
        </button>
      )}
    </div>
  );
}
