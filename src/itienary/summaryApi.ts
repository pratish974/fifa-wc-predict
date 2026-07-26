import { ItineraryInput, ItinerarySummary } from "./types";

type GenerateSummaryResponse = {
  summary: ItinerarySummary;
};

const summaryApiUrl = process.env.REACT_APP_ITINERARY_SUMMARY_API_URL;

export function isSummaryApiConfigured(): boolean {
  return typeof summaryApiUrl === "string" && summaryApiUrl.trim().length > 0;
}

export async function generateItinerarySummary(
  itinerary: ItineraryInput,
): Promise<ItinerarySummary> {
  if (!isSummaryApiConfigured()) {
    throw new Error(
      "Missing REACT_APP_ITINERARY_SUMMARY_API_URL. Use mock mode until backend is configured.",
    );
  }

  const response = await fetch(summaryApiUrl as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ itinerary }),
  });

  if (!response.ok) {
    throw new Error(`Summary API failed with status ${response.status}`);
  }

  const payload = (await response.json()) as GenerateSummaryResponse | ItinerarySummary;

  // Support either { summary: ... } or raw summary payload from backend.
  const summary = "summary" in payload ? payload.summary : payload;

  if (!summary) {
    throw new Error("Summary API returned invalid payload.");
  }

  return summary;
}
