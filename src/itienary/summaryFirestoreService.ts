import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import {
  ItinerarySummary,
  ItineraryInput,
  PlacesToEatRecord,
  PlacesToVisitRecord,
} from "./types";

type StoredSummaryDoc = {
  summary?: ItinerarySummary;
  editorText?: string;
  placesToVisit?: PlacesToVisitRecord[];
  placesToEat?: PlacesToEatRecord[];
  itinerary?: Partial<ItineraryInput>;
};

export async function loadLatestSummaryFromFirestore(
  itineraryId: string,
): Promise<StoredSummaryDoc | null> {
  const summaryRef = doc(db, "itinerary", "0");
  const snap = await getDoc(summaryRef);

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data() as {
    itineraryId?: string;
    title?: string;
    tripTitle?: string;
    locationRegion?: string;
    startDate?: string;
    endDate?: string;
    status?: ItineraryInput["status"];
    createdBy?: string;
    updatedBy?: string;
    itinerary?: Partial<ItineraryInput>;
    summary?: ItinerarySummary;
    editorText?: string;
    sections?: {
      currentItinerary?: {
        highlights?: string[];
        warnings?: string[];
        summaryDays?: ItinerarySummary["summaryDays"];
        model?: string;
        generatedAtIso?: string;
      };
      locations?: {
        placesToVisit?: PlacesToVisitRecord[];
        placesToEatAround?: PlacesToEatRecord[];
      };
    };
  };

  const summaryFromSections = data.sections?.currentItinerary?.summaryDays
    ? {
        summaryId: `sum-${Date.now()}`,
        itineraryId,
        version: 1,
        generatedBy: "unknown",
        generatedAtIso:
          data.sections.currentItinerary.generatedAtIso || new Date().toISOString(),
        model: data.sections.currentItinerary.model || "unknown",
        status: "generated" as const,
        highlights: data.sections.currentItinerary.highlights || [],
        warnings: data.sections.currentItinerary.warnings || [],
        summaryDays: data.sections.currentItinerary.summaryDays,
      }
    : undefined;

  const resolvedSummary = data.summary || summaryFromSections;

  if (!resolvedSummary) {
    return null;
  }

  return {
    summary: {
      ...resolvedSummary,
      version: 1,
    },
    editorText: data.editorText,
    placesToVisit: data.sections?.locations?.placesToVisit,
    placesToEat: data.sections?.locations?.placesToEatAround,
    itinerary: {
      itineraryId:
        data.itinerary?.itineraryId || data.itineraryId || resolvedSummary.itineraryId || itineraryId,
      tripTitle: data.title || data.tripTitle || data.itinerary?.tripTitle,
      locationRegion: data.locationRegion || data.itinerary?.locationRegion,
      startDate: data.startDate || data.itinerary?.startDate,
      endDate: data.endDate || data.itinerary?.endDate,
      status: data.status || data.itinerary?.status,
      createdBy: data.createdBy || data.itinerary?.createdBy,
      updatedBy: data.updatedBy || data.itinerary?.updatedBy,
      days: data.itinerary?.days,
    },
  };
}

export async function saveLatestSummaryToFirestore(params: {
  itineraryId: string;
  tripTitle: string;
  summary: ItinerarySummary;
  editorText: string;
  locationRegion: string;
  startDate: string;
  endDate: string;
  status: ItineraryInput["status"];
  createdBy: string;
  updatedBy: string;
  placesToVisit: PlacesToVisitRecord[];
  placesToEat: PlacesToEatRecord[];
}): Promise<void> {
  const summaryRef = doc(db, "itinerary", "0");

  await setDoc(
    summaryRef,
    {
      itineraryId: params.itineraryId,
      title: params.tripTitle,
      tripTitle: params.tripTitle,
      locationRegion: params.locationRegion,
      startDate: params.startDate,
      endDate: params.endDate,
      status: params.status,
      createdBy: params.createdBy,
      updatedBy: params.updatedBy,
      itinerary: {
        itineraryId: params.itineraryId,
        tripTitle: params.tripTitle,
        locationRegion: params.locationRegion,
        startDate: params.startDate,
        endDate: params.endDate,
        status: params.status,
        createdBy: params.createdBy,
        updatedBy: params.updatedBy,
      },
      summary: {
        ...params.summary,
        version: 1,
      },
      sections: {
        currentItinerary: {
          generatedAtIso: params.summary.generatedAtIso,
          model: params.summary.model,
          highlights: params.summary.highlights,
          warnings: params.summary.warnings,
          summaryDays: params.summary.summaryDays,
        },
        locations: {
          placesToVisit: params.placesToVisit,
          placesToEatAround: params.placesToEat,
        },
      },
      editorText: params.editorText,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
