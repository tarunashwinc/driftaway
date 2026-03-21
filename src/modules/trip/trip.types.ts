import type {
  AIProvider,
  ActivityType,
  BookingStatus,
  BookingType,
  TripRole,
  TripStatus,
} from "@prisma/client";

// ─── Shared sub-types ───

export interface TripPreferences {
  pace?: "slow" | "moderate" | "fast";
  focusAreas?: string[];
  avoidCrowds?: boolean;
  [key: string]: unknown;
}

export interface TripBannerConfig {
  gradient?: string;
  emoji?: string;
  imageUrl?: string;
  [key: string]: unknown;
}

export interface MemberUser {
  id: string;
  name: string;
  phone: string;
  avatarUrl: string | null;
}

export interface TripMemberWithUser {
  id: string;
  tripId: string;
  userId: string;
  role: TripRole;
  startCity: string | null;
  joinedAt: Date;
  user: MemberUser;
}

export interface ItineraryItemSummary {
  id: string;
  dayId: string;
  sortOrder: number;
  time: string;
  activity: string;
  type: ActivityType;
  latitude: number | null;
  longitude: number | null;
  costLocal: number | null;
  costConverted: number | null;
  localCurrency: string | null;
  thumbnail: string | null;
  notes: string | null;
  bookingId: string | null;
  participants: string[];
  accessibility: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ItineraryDaySummary {
  id: string;
  tripId: string;
  dayNumber: number;
  date: Date;
  title: string;
  items: ItineraryItemSummary[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingSummary {
  id: string;
  tripId: string;
  type: BookingType;
  status: BookingStatus;
  carrier: string | null;
  name: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  departureDate: Date | null;
  departureTime: string | null;
  arrivalDate: Date | null;
  arrivalTime: string | null;
  checkIn: Date | null;
  checkOut: Date | null;
  confirmationRef: string | null;
  cost: number | null;
  currency: string | null;
  travelers: string[];
  details: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChecklistItemSummary {
  id: string;
  tripId: string;
  text: string;
  category: string;
  isChecked: boolean;
  assignedTo: string | null;
  isAiGenerated: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseSummary {
  id: string;
  tripId: string;
  userId: string;
  amount: number;
  currency: string;
  category: string;
  description: string | null;
  receiptUrl: string | null;
  isShared: boolean;
  splitWith: string[];
  createdAt: Date;
}

export interface TransportNoteSummary {
  id: string;
  tripId: string;
  icon: string;
  title: string;
  detail: string;
  sortOrder: number;
  createdAt: Date;
}

// ─── TripSummary — used in list view ───

export interface TripSummary {
  id: string;
  title: string;
  destination: string;
  subDestinations: string[];
  startDate: Date;
  endDate: Date;
  currency: string;
  budgetTotal: number | null;
  budgetSpent: number;
  aiProvider: AIProvider;
  status: TripStatus;
  bannerConfig: TripBannerConfig | null;
  memberCount: number;
  myRole: TripRole;
  createdAt: Date;
  updatedAt: Date;
}

// ─── TripDetail — used in full trip view ───

export interface TripDetail {
  id: string;
  title: string;
  destination: string;
  subDestinations: string[];
  startDate: Date;
  endDate: Date;
  currency: string;
  budgetTotal: number | null;
  budgetSpent: number;
  aiProvider: AIProvider;
  status: TripStatus;
  preferences: TripPreferences | null;
  bannerConfig: TripBannerConfig | null;
  whatsappGroupId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  members: TripMemberWithUser[];
  itineraryDays: ItineraryDaySummary[];
  bookings: BookingSummary[];
  checklistItems: ChecklistItemSummary[];
  expenses: ExpenseSummary[];
  transportNotes: TransportNoteSummary[];
}

// ─── Budget summary ───

export interface BudgetCategoryBreakdown {
  category: string;
  total: number;
}

export interface BudgetMemberSplit {
  userId: string;
  name: string;
  total: number;
}

export interface BudgetSummary {
  budgetTotal: number | null;
  budgetSpent: number;
  remaining: number | null;
  currency: string;
  byCategory: BudgetCategoryBreakdown[];
  memberSplit: BudgetMemberSplit[];
}
