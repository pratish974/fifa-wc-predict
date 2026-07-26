import { PlannerUser } from "../types";

type PlannerHeaderProps = {
  tripTitle: string;
  region: string;
  user: PlannerUser;
  onEditClick: () => void;
};

const canEdit = (role: PlannerUser["role"]): boolean =>
  role === "admin" || role === "editor";

export default function PlannerHeader({
  tripTitle,
  region,
  user,
  onEditClick,
}: PlannerHeaderProps) {
  return (
    <header className="itn-header">
      <div>
        <p className="itn-overline">Trip Planner</p>
        <h1>{tripTitle}</h1>
        <p className="itn-subtitle">{region}</p>
      </div>

      {canEdit(user.role) && (
        <button type="button" className="itn-edit-btn" onClick={onEditClick}>
          Edit Itinerary
        </button>
      )}
    </header>
  );
}
