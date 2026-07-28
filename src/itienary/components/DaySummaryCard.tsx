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
  const sortedPoints = [...day.points].sort((a, b) => {
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

  return (
    <article className={className}>
      <h3>{formatIsoDate(day.date)}</h3>

      <ul>
        {sortedPoints.map((point) => (
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
