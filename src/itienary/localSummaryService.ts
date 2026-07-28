import { ItinerarySummary, SummaryDay, SummaryPoint } from "./types";

type BuildSummaryParams = {
  itineraryId: string;
  generatedBy: string;
  text: string;
};

export type EditablePoint = {
  id: string;
  time: string;
  activity: string;
};

export type EditableDay = {
  id: string;
  date: string;
  points: EditablePoint[];
};

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const DATE_PATTERN = /(\d{4}-\d{2}-\d{2})/;
const TIME_PATTERN = /\b([01]\d|2[0-3]):([0-5]\d)\b/;

function inferDuration(text: string): number {
  const value = text.toLowerCase();
  if (/airport|transfer|drive|travel/.test(value)) return 120;
  if (/safari|hike|trek/.test(value)) return 180;
  if (/lunch|breakfast|dinner|meal|cafe/.test(value)) return 75;
  if (/check[- ]?in|hotel|rest/.test(value)) return 60;
  if (/market|beach|temple|museum|visit|walk/.test(value)) return 90;
  return 80;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function addMinutes(start: string, minutes: number): string {
  const [hStr, mStr] = start.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const total = h * 60 + m + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const nh = Math.floor(wrapped / 60);
  const nm = wrapped % 60;
  return `${pad2(nh)}:${pad2(nm)}`;
}

function normalizePointText(raw: string): string {
  return raw
    .replace(/^[-*\u2022\d).\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPoints(lines: string[]): SummaryDay[] {
  const days = new Map<string, SummaryPoint[]>();
  let activeDate = new Date().toISOString().slice(0, 10);
  let pointCounter = 1;

  const addPoint = (date: string, point: SummaryPoint) => {
    if (!days.has(date)) {
      days.set(date, []);
    }
    days.get(date)?.push(point);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const dateMatch = line.match(DATE_PATTERN);
    const isDateHeader = dateMatch && line.replace(dateMatch[1], "").trim().length <= 2;
    if (dateMatch && isDateHeader) {
      activeDate = dateMatch[1];
      continue;
    }

    const pointText = normalizePointText(line);
    if (!pointText) continue;

    const timeMatch = pointText.match(TIME_PATTERN);
    const originalTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : null;
    const estimatedDurationMinutes = inferDuration(pointText);
    const suggestedStartTime = originalTime;
    const suggestedEndTime = originalTime
      ? addMinutes(originalTime, estimatedDurationMinutes)
      : null;

    addPoint(activeDate, {
      pointId: `auto-p-${pointCounter}`,
      text: pointText,
      originalTime,
      estimatedDurationMinutes,
      suggestedStartTime,
      suggestedEndTime,
      sourceActivityId: null,
    });

    pointCounter += 1;
  }

  return Array.from(days.entries())
    .map(([date, points]) => ({ date, points }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildSummaryFromText(params: BuildSummaryParams): ItinerarySummary {
  const lines = params.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const summaryDays = extractPoints(lines);

  return {
    summaryId: `sum-${Date.now()}`,
    itineraryId: params.itineraryId,
    version: 1,
    generatedBy: params.generatedBy,
    generatedAtIso: new Date().toISOString(),
    model: "local-text-summarizer-v1",
    status: "generated",
    highlights: [
      "Summary generated from editor text in browser.",
      "Durations are heuristic estimates and can be edited.",
    ],
    warnings:
      summaryDays.length === 0
        ? ["No valid itinerary points detected. Add dated bullet lines."]
        : [],
    summaryDays,
  };
}

type BuildSummaryFromRowsParams = {
  itineraryId: string;
  generatedBy: string;
  days: EditableDay[];
  referenceDate?: string;
};

function normalizeTimeInput(time: string): string | null {
  const normalized = time.trim();
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    return null;
  }

  return `${match[1]}:${match[2]}`;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function normalizeEditableDate(input: string, referenceYear: number): string | null {
  const value = input.trim().toLowerCase();
  if (!value) {
    return null;
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return isValidDateParts(year, month, day) ? toIsoDate(year, month, day) : null;
  }

  const dayMonthYearMatch = value.match(/^(\d{1,2})[\s\-/]([a-zA-Z]+|\d{1,2})(?:[\s\-/](\d{2,4}))?$/);
  if (dayMonthYearMatch) {
    const day = Number(dayMonthYearMatch[1]);
    const monthToken = dayMonthYearMatch[2];
    const yearToken = dayMonthYearMatch[3];

    let month = Number(monthToken);
    if (Number.isNaN(month)) {
      month = MONTH_MAP[monthToken.toLowerCase()] || NaN;
    }

    let year = referenceYear;
    if (yearToken) {
      const parsedYear = Number(yearToken);
      year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
    }

    if (
      Number.isInteger(day) &&
      Number.isInteger(month) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31 &&
      isValidDateParts(year, month, day)
    ) {
      return toIsoDate(year, month, day);
    }
  }

  return null;
}

function sortSummaryPointsByTime(points: SummaryPoint[]): SummaryPoint[] {
  return [...points].sort((a, b) => {
    const left = a.originalTime;
    const right = b.originalTime;

    if (left && right) {
      return left.localeCompare(right);
    }

    if (left) {
      return -1;
    }

    if (right) {
      return 1;
    }

    return 0;
  });
}

export function buildSummaryFromEditableDays(
  params: BuildSummaryFromRowsParams,
): ItinerarySummary {
  const fallbackYear = (() => {
    const ref = params.referenceDate?.trim() || "";
    const match = ref.match(/^(\d{4})-/);
    return match ? Number(match[1]) : new Date().getFullYear();
  })();

  const summaryDays = params.days
    .map((day) => {
      const normalizedDate = normalizeEditableDate(day.date, fallbackYear);
      if (!normalizedDate) {
        return null;
      }

      const points = day.points
        .map((point, index) => {
          const activity = point.activity.trim();
          if (!activity) {
            return null;
          }

          const originalTime = normalizeTimeInput(point.time);
          const estimatedDurationMinutes = inferDuration(activity);

          return {
            pointId: point.id || `auto-${day.id}-${index + 1}`,
            text: activity,
            originalTime,
            estimatedDurationMinutes,
            suggestedStartTime: originalTime,
            suggestedEndTime: originalTime
              ? addMinutes(originalTime, estimatedDurationMinutes)
              : null,
            sourceActivityId: null as string | null,
          };
        })
        .filter((point): point is SummaryPoint => point !== null);

      return {
        date: normalizedDate,
        points: sortSummaryPointsByTime(points),
      };
    })
    .filter((day): day is SummaryDay => day !== null)
    .filter((day) => day.points.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    summaryId: `sum-${Date.now()}`,
    itineraryId: params.itineraryId,
    version: 1,
    generatedBy: params.generatedBy,
    generatedAtIso: new Date().toISOString(),
    model: "local-row-summarizer-v1",
    status: "generated",
    highlights: [
      "Summary generated from per-point editor rows.",
      "Each row maps to one bullet in the generated summary.",
    ],
    warnings:
      summaryDays.length === 0
        ? ["No valid point rows detected. Add at least one activity line."]
        : [],
    summaryDays,
  };
}
