import { PlaceRecord } from "../types";
import PlaceLinkRow from "./PlaceLinkRow";

type PlacesListSectionProps = {
  title: string;
  places: PlaceRecord[];
};

export default function PlacesListSection({
  title,
  places,
}: PlacesListSectionProps) {
  return (
    <section className="itn-section">
      <div className="itn-section-heading">
        <h2>{title}</h2>
      </div>

      <div className="itn-places-list" role="list">
        {places.map((place) => (
          <PlaceLinkRow key={place.placeId} place={place} />
        ))}
      </div>
    </section>
  );
}
