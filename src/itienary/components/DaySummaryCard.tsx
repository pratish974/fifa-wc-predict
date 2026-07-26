import { SummaryDay } from "../types";
import { formatIsoDate } from "../utils";

type DaySummaryCardProps = {
  day: SummaryDay;
  isToday?: boolean;
  isPast?: boolean;
};

export default function DaySummaryCard({
  day,
  isToday = false,
  isPast = false,
}: DaySummaryCardProps) {
  const className = `itn-day-card${isToday ? " is-today" : ""}${isPast ? " is-past" : ""}`;

  return (
    <article className={className}>
      <h3>{formatIsoDate(day.date)}</h3>

      <ul>
        {day.points.map((point) => (
          <li key={point.pointId}>
            <p>
              <strong>{point.originalTime ?? "No time"}</strong>
              {" - "}
              {point.text}
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}
