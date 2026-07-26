import { ItinerarySummary, SummaryDay, SummaryPoint } from "./types";
import { EditableDay } from "./localSummaryService";

type GenerateOpenAISummaryParams = {
  itineraryId: string;
  generatedBy: string;
  referenceDate: string;
  days: EditableDay[];
};

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type StructuredSummaryResponse = {
  highlights: string[];
  warnings: string[];
  summaryDays: Array<{
    date: string;
    points: Array<{
      text: string;
      originalTime: string | null;
      estimatedDurationMinutes: number;
      suggestedStartTime: string | null;
      suggestedEndTime: string | null;
    }>;
  }>;
};

const OPENAI_API_KEY = (process.env.REACT_APP_OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = (process.env.REACT_APP_OPENAI_MODEL || "gpt-4o-mini").trim();

export function isOpenAIConfigured(): boolean {
  return OPENAI_API_KEY.length > 0;
}

export function getOpenAIModelName(): string {
  return OPENAI_MODEL;
}

function normalizeStructuredSummary(
  input: StructuredSummaryResponse,
): { highlights: string[]; warnings: string[]; summaryDays: SummaryDay[] } {
  const summaryDays = (input.summaryDays || [])
    .map((day, dayIndex) => {
      const date = typeof day.date === "string" ? day.date.trim() : "";
      if (!date) return null;

      const points = (day.points || [])
        .map((point, pointIndex) => {
          const text = typeof point.text === "string" ? point.text.trim() : "";
          if (!text) return null;

          const duration = Number(point.estimatedDurationMinutes);

          return {
            pointId: `ai-p-${dayIndex + 1}-${pointIndex + 1}`,
            text,
            originalTime:
              typeof point.originalTime === "string" && point.originalTime.trim()
                ? point.originalTime.trim()
                : null,
            estimatedDurationMinutes:
              Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 60,
            suggestedStartTime:
              typeof point.suggestedStartTime === "string" && point.suggestedStartTime.trim()
                ? point.suggestedStartTime.trim()
                : null,
            suggestedEndTime:
              typeof point.suggestedEndTime === "string" && point.suggestedEndTime.trim()
                ? point.suggestedEndTime.trim()
                : null,
            sourceActivityId: null as string | null,
          };
        })
        .filter((point): point is SummaryPoint => point !== null);

      if (points.length === 0) return null;
      return { date, points };
    })
    .filter((day): day is SummaryDay => day !== null);

  return {
    highlights: Array.isArray(input.highlights)
      ? input.highlights.filter((v): v is string => typeof v === "string")
      : [],
    warnings: Array.isArray(input.warnings)
      ? input.warnings.filter((v): v is string => typeof v === "string")
      : [],
    summaryDays,
  };
}

export async function generateSummaryWithOpenAI(
  params: GenerateOpenAISummaryParams,
): Promise<ItinerarySummary> {
  if (!isOpenAIConfigured()) {
    throw new Error("Missing REACT_APP_OPENAI_API_KEY.");
  }

  const promptPayload = {
    referenceDate: params.referenceDate,
    days: params.days.map((day) => ({
      date: day.date,
      points: day.points.map((point) => ({
        time: point.time,
        activity: point.activity,
      })),
    })),
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "itinerary_summary",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              highlights: {
                type: "array",
                items: { type: "string" },
              },
              warnings: {
                type: "array",
                items: { type: "string" },
              },
              summaryDays: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    date: { type: "string" },
                    points: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          text: { type: "string" },
                          originalTime: { type: ["string", "null"] },
                          estimatedDurationMinutes: { type: "number" },
                          suggestedStartTime: { type: ["string", "null"] },
                          suggestedEndTime: { type: ["string", "null"] },
                        },
                        required: [
                          "text",
                          "originalTime",
                          "estimatedDurationMinutes",
                          "suggestedStartTime",
                          "suggestedEndTime",
                        ],
                      },
                    },
                  },
                  required: ["date", "points"],
                },
              },
            },
            required: ["highlights", "warnings", "summaryDays"],
          },
          strict: true,
        },
      },
      messages: [
        {
          role: "system",
          content:
            "You generate concise, point-wise itinerary summaries. Normalize flexible dates like '28 feb' using reference year when year is missing. Keep date output as ISO YYYY-MM-DD and time output as HH:MM or null.",
        },
        {
          role: "user",
          content: `Convert the following itinerary rows into structured summary JSON. Input: ${JSON.stringify(
            promptPayload,
          )}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${details}`);
  }

  const payload = (await response.json()) as OpenAIChatResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI response did not include content.");
  }

  const structured = JSON.parse(content) as StructuredSummaryResponse;
  const normalized = normalizeStructuredSummary(structured);

  if (normalized.summaryDays.length === 0) {
    throw new Error("OpenAI response had no valid summary points.");
  }

  return {
    summaryId: `sum-${Date.now()}`,
    itineraryId: params.itineraryId,
    version: 1,
    generatedBy: params.generatedBy,
    generatedAtIso: new Date().toISOString(),
    model: OPENAI_MODEL || "gpt-4o-mini",
    status: "generated",
    highlights: normalized.highlights,
    warnings: normalized.warnings,
    summaryDays: normalized.summaryDays,
  };
}
