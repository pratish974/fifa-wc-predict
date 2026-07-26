export type UserRole = "admin" | "editor" | "viewer";

export interface PlannerUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface Activity {
  activityId: string;
  title: string;
  description: string;
  originalStartTime: string | null;
  originalDurationMinutes: number | null;
  placeRefId: string | null;
  tags: string[];
}

export interface ItineraryDay {
  date: string;
  notes: string;
  activities: Activity[];
}

export interface ItineraryInput {
  itineraryId: string;
  tripTitle: string;
  locationRegion: string;
  startDate: string;
  endDate: string;
  status: "draft" | "published";
  createdBy: string;
  updatedBy: string;
  days: ItineraryDay[];
}

export interface SummaryPoint {
  pointId: string;
  text: string;
  originalTime: string | null;
  estimatedDurationMinutes: number;
  suggestedStartTime: string | null;
  suggestedEndTime: string | null;
  sourceActivityId: string | null;
}

export interface SummaryDay {
  date: string;
  points: SummaryPoint[];
}

export interface ItinerarySummary {
  summaryId: string;
  itineraryId: string;
  version: number;
  generatedBy: string;
  generatedAtIso: string;
  model: string;
  status: "generated" | "approved" | "superseded";
  highlights: string[];
  warnings: string[];
  summaryDays: SummaryDay[];
}

export interface PlaceRecord {
  placeId: string;
  itineraryId: string;
  name: string;
  addressText: string;
  googleMapsUrl: string;
  sortOrder: number;
}

export interface PlacesToVisitRecord extends PlaceRecord {
  category: "attraction" | "temple" | "museum" | "nature" | "other";
}

export interface PlacesToEatRecord extends PlaceRecord {
  cuisineTags: string[];
}

export interface PlannerSnapshot {
  currentUser: PlannerUser;
  itinerary: ItineraryInput;
  summary: ItinerarySummary;
  placesToVisit: PlacesToVisitRecord[];
  placesToEat: PlacesToEatRecord[];
}
