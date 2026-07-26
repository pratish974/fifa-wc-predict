import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import {
  ItinerarySummary,
  PlacesToEatRecord,
  PlacesToVisitRecord,
} from "./types";

type StoredSummaryDoc = {
  summary?: ItinerarySummary;
  editorText?: string;
  placesToVisit?: PlacesToVisitRecord[];
  placesToEat?: PlacesToEatRecord[];
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
  };
}

export async function saveLatestSummaryToFirestore(params: {
  itineraryId: string;
  summary: ItinerarySummary;
  editorText: string;
  locationRegion: string;
  placesToVisit: PlacesToVisitRecord[];
  placesToEat: PlacesToEatRecord[];
}): Promise<void> {
  const summaryRef = doc(db, "itinerary", "0");

  await setDoc(
    summaryRef,
    {
      itineraryId: params.itineraryId,
      locationRegion: params.locationRegion,
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
