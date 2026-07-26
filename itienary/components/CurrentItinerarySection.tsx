import { SummaryDay } from "../types";
import DaySummaryCard from "./DaySummaryCard";

type CurrentItinerarySectionProps = {
  days: SummaryDay[];
};

export default function CurrentItinerarySection({
  days,
}: CurrentItinerarySectionProps) {
  return (
    <section className="itn-section">
      <div className="itn-section-heading">
        <h2>Current Itinerary</h2>
      </div>

      <div className="itn-day-grid">
        {days.map((day) => (
          <DaySummaryCard key={day.date} day={day} />
        ))}
      </div>
    </section>
  );
}
