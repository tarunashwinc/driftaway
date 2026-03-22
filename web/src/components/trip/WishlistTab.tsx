"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { api } from "../../lib/api";

interface WishlistTabProps {
  tripId: string;
  wishlist: string[];
  placesToVisit: string[];
  notes?: string;
}

function TagInput({
  items,
  onAdd,
  onRemove,
  placeholder,
  isLoading,
}: {
  items: string[];
  onAdd: (val: string) => void;
  onRemove: (idx: number) => void;
  placeholder: string;
  isLoading: boolean;
}) {
  const [input, setInput] = useState("");

  const submit = () => {
    const v = input.trim();
    if (v && !items.includes(v)) {
      onAdd(v);
      setInput("");
    }
  };

  return (
    <div>
      {/* Existing tags */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {items.map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1A2E] text-white text-sm font-medium"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(idx)}
                disabled={isLoading}
                className="hover:opacity-70 transition-opacity"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 px-4 py-3 rounded-2xl bg-[#F0EEE9] border border-black/8 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/40 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!input.trim() || isLoading}
          className="w-12 h-12 rounded-2xl bg-[#FF6B35] text-white flex items-center justify-center shadow-sm disabled:opacity-40 active:scale-95 transition-all"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

export function WishlistTab({ tripId, wishlist, placesToVisit, notes }: WishlistTabProps) {
  const queryClient = useQueryClient();

  const [localWishlist, setLocalWishlist] = useState<string[]>(wishlist);
  const [localPlaces, setLocalPlaces] = useState<string[]>(placesToVisit);
  const [localNotes, setLocalNotes] = useState<string>(notes ?? "");
  const [saved, setSaved] = useState(false);

  const { mutate: save, isPending } = useMutation({
    mutationFn: (prefs: { wishlist: string[]; placesToVisit: string[]; notes: string }) =>
      api.put(`/trips/${tripId}`, {
        preferences: { wishlist: prefs.wishlist, placesToVisit: prefs.placesToVisit, notes: prefs.notes },
      }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] });
    },
  });

  const handleSave = () => {
    save({ wishlist: localWishlist, placesToVisit: localPlaces, notes: localNotes });
  };

  const dirty =
    JSON.stringify(localWishlist) !== JSON.stringify(wishlist) ||
    JSON.stringify(localPlaces) !== JSON.stringify(placesToVisit) ||
    localNotes !== (notes ?? "");

  return (
    <div className="flex flex-col gap-5">
      {/* Info banner */}
      <div className="bg-gradient-to-r from-[#FF6B35]/10 to-[#1A1A2E]/5 rounded-2xl px-4 py-3.5 border border-[#FF6B35]/15">
        <p className="text-sm text-[#4B5563] leading-relaxed">
          <span className="font-semibold text-[#1A1A2E]">Personalise your AI plan</span> — add specific experiences, foods, and places you want to visit. These will be woven into your itinerary.
        </p>
      </div>

      {/* Things to Do / Experiences */}
      <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] border border-black/5 p-4">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="text-xl">🎯</span>
          <div>
            <h3 className="text-sm font-bold text-[#1A1A2E]">Things to Do & Experiences</h3>
            <p className="text-xs text-[#9CA3AF]">Food, activities, cultural experiences you must have</p>
          </div>
        </div>

        <div className="mt-3">
          <TagInput
            items={localWishlist}
            onAdd={(v) => setLocalWishlist((prev) => [...prev, v])}
            onRemove={(i) => setLocalWishlist((prev) => prev.filter((_, idx) => idx !== i))}
            placeholder='e.g. "Eat fresh ramen in a tiny local shop"'
            isLoading={isPending}
          />
        </div>

        {/* Suggestions */}
        {localWishlist.length === 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              "Try conveyor belt sushi",
              "Watch a sumo match",
              "Eat matcha ice cream",
              "Attend a tea ceremony",
              "Try wagyu beef",
              "See Mt Fuji",
            ].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setLocalWishlist((prev) => [...prev, s])}
                className="text-xs px-3 py-1.5 rounded-full border border-dashed border-[#9CA3AF] text-[#6B7280] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Places to Visit */}
      <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] border border-black/5 p-4">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="text-xl">📍</span>
          <div>
            <h3 className="text-sm font-bold text-[#1A1A2E]">Specific Places to Visit</h3>
            <p className="text-xs text-[#9CA3AF]">Landmarks, temples, neighbourhoods, restaurants</p>
          </div>
        </div>

        <div className="mt-3">
          <TagInput
            items={localPlaces}
            onAdd={(v) => setLocalPlaces((prev) => [...prev, v])}
            onRemove={(i) => setLocalPlaces((prev) => prev.filter((_, idx) => idx !== i))}
            placeholder='e.g. "Fushimi Inari Shrine, Kyoto"'
            isLoading={isPending}
          />
        </div>

        {localPlaces.length === 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              "Senso-ji Temple",
              "TeamLab Borderless",
              "Nishiki Market",
              "Arashiyama Bamboo Grove",
              "Dotonbori, Osaka",
              "Hakone hot springs",
            ].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setLocalPlaces((prev) => [...prev, s])}
                className="text-xs px-3 py-1.5 rounded-full border border-dashed border-[#9CA3AF] text-[#6B7280] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Additional Notes */}
      <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] border border-black/5 p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-xl">📝</span>
          <div>
            <h3 className="text-sm font-bold text-[#1A1A2E]">Additional Notes for AI</h3>
            <p className="text-xs text-[#9CA3AF]">Anything else the AI should know — pace, special moments, concerns</p>
          </div>
        </div>
        <textarea
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          placeholder={'e.g. "We have an elderly grandparent — avoid long walks. We want at least one surprise experience. The kids love Pokemon."'}
          rows={4}
          disabled={isPending}
          className="w-full px-4 py-3 rounded-2xl bg-[#F0EEE9] border border-black/8 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/40 resize-none disabled:opacity-50"
        />
      </div>

      {/* Save button */}
      {(dirty || saved) && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !dirty}
          className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] ${
            saved
              ? "bg-[#06D6A0] text-white"
              : "bg-[#1A1A2E] text-white shadow-md disabled:opacity-60"
          }`}
        >
          {isPending ? "Saving…" : saved ? "✓ Saved! Now regenerate your AI plan" : "Save Preferences"}
        </button>
      )}

      {!dirty && !saved && (localWishlist.length > 0 || localPlaces.length > 0) && (
        <p className="text-xs text-center text-[#9CA3AF]">
          ✓ Preferences saved — tap <span className="font-semibold text-[#FF6B35]">Generate AI Plan</span> to update your itinerary
        </p>
      )}
    </div>
  );
}
