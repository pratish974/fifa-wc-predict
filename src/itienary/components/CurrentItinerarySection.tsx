import { SummaryDay } from "../types";
import DaySummaryCard from "./DaySummaryCard";
import { formatIsoDate } from "../utils";

type CurrentItinerarySectionProps = {
  days: SummaryDay[];
};

export default function CurrentItinerarySection({
  days,
}: CurrentItinerarySectionProps) {
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <section className="itn-section">
      <div className="itn-section-heading">
        <h2>Current Itinerary</h2>
        <p className="itn-today-label">Today: {formatIsoDate(todayIso)}</p>
      </div>

      <div className="itn-day-grid itn-day-grid-horizontal">
        {days.map((day) => (
          <DaySummaryCard
            key={day.date}
            day={day}
            isToday={day.date === todayIso}
            isPast={day.date < todayIso}
          />
        ))}
      </div>
    </section>
  );
}
