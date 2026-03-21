import { create } from "zustand";

interface BrandConfig {
  appName: string;
  tagline: string;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor: string;
}

interface BrandState {
  brand: BrandConfig;
  setBrand: (brand: BrandConfig) => void;
}

export const useBrandStore = create<BrandState>()((set) => ({
  brand: {
    appName: "DriftAway",
    tagline: "plan less. live more.",
    primaryColor: "#FF6B35",
    accentColor: "#06D6A0",
  },
  setBrand: (brand) => set({ brand }),
}));
