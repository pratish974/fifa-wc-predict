import { SummaryDay } from "../types";
import { formatDuration, formatIsoDate } from "../utils";

type DaySummaryCardProps = {
  day: SummaryDay;
};

export default function DaySummaryCard({ day }: DaySummaryCardProps) {
  return (
    <article className="itn-day-card">
      <h3>{formatIsoDate(day.date)}</h3>

      <ul>
        {day.points.map((point) => (
          <li key={point.pointId}>
            <p>
              <strong>{point.originalTime ?? "No time"}</strong>
              {" - "}
              {point.text}
              {" ("}
              {formatDuration(point.estimatedDurationMinutes)}
              {")"}
            </p>

            {point.suggestedStartTime && point.suggestedEndTime && (
              <p className="itn-suggested-time">
                Suggested slot: {point.suggestedStartTime} to {point.suggestedEndTime}
              </p>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
