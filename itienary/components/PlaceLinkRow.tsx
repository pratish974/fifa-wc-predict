import { PlaceRecord } from "../types";
import { isGoogleMapsUrl } from "../utils";

type PlaceLinkRowProps = {
  place: PlaceRecord;
};

export default function PlaceLinkRow({ place }: PlaceLinkRowProps) {
  const isValid = isGoogleMapsUrl(place.googleMapsUrl);

  if (!isValid) {
    return (
      <div className="itn-place-row itn-place-row-disabled" role="listitem">
        <div>
          <p className="itn-place-name">{place.name}</p>
          <p className="itn-place-address">{place.addressText}</p>
        </div>
        <span className="itn-invalid">Invalid map URL</span>
      </div>
    );
  }

  return (
    <a
      className="itn-place-row"
      href={place.googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div>
        <p className="itn-place-name">{place.name}</p>
        <p className="itn-place-address">{place.addressText}</p>
      </div>
      <span className="itn-open-link">Open map</span>
    </a>
  );
}
