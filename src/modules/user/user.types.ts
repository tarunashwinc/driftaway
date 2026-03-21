export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  role: string;
  homeCity?: string | null;
  passportExpiry?: string | null;
  emergencyContact?: Record<string, string> | null;
  preferences?: UserPreferences | null;
  frequentFlyerIds?: Record<string, string> | null;
  createdAt: string;
}

export interface UserPreferences {
  diet?: string;
  allergies?: string[];
  interests?: string[];
  travelStyle?: string;
  languages?: string[];
  accessibility?: string[];
  transportPref?: string;
}

export interface MinorProfile {
  id: string;
  name: string;
  dateOfBirth: string;
  guardianId: string;
  specialNeeds?: string | null;
  preferences?: Record<string, unknown> | null;
}
