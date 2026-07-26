import { useEffect, useMemo, useState } from "react";
import CurrentItinerarySection from "./components/CurrentItinerarySection";
import PlacesListSection from "./components/PlacesListSection";
import PlannerHeader from "./components/PlannerHeader";
import { getPlannerSnapshot } from "./plannerService";
import {
  PlannerSnapshot,
  PlacesToEatRecord,
  PlacesToVisitRecord,
  UserRole,
} from "./types";
import usePlannerRole from "./hooks/usePlannerRole";
import {
  buildSummaryFromEditableDays,
  EditableDay,
} from "./localSummaryService";
import {
  loadLatestSummaryFromFirestore,
  saveLatestSummaryToFirestore,
} from "./summaryFirestoreService";
import "./itinerary.css";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("timeout"));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getFriendlyFirestoreError(error: unknown, phase: "read" | "write"): string {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const message = raw.toLowerCase();

  if (
    message.includes("err_blocked_by_client") ||
    message.includes("blocked by client") ||
    message.includes("failed to fetch") ||
    message.includes("network request failed")
  ) {
    return phase === "read"
      ? "Firestore sync blocked by browser extension or network filter. Showing local planner data."
      : "Save blocked by browser extension/network filter (ERR_BLOCKED_BY_CLIENT). Allow firestore.googleapis.com and retry.";
  }

  if (
    message.includes("permission-denied") ||
    message.includes("missing or insufficient permissions")
  ) {
    return phase === "read"
      ? "Firestore read permission denied. Showing local planner data."
      : "Firestore write permission denied. Check Firestore rules/deployment.";
  }

  if (message.includes("timeout")) {
    return phase === "read"
      ? "Firestore sync timed out. Showing local planner data."
      : "Save timed out while contacting Firestore. Retry once network is stable.";
  }

  return phase === "read"
    ? "Firestore sync is unavailable. Showing local planner data."
    : "Submit failed. Could not save data to Firestore.";
}

function mapSummaryToEditableDays(snapshot: PlannerSnapshot): EditableDay[] {
  const days = snapshot.summary.summaryDays.map((day) => ({
    id: makeId("day"),
    date: day.date,
    points: day.points.map((point) => ({
      id: point.pointId || makeId("point"),
      time: point.originalTime || "",
      activity: point.text,
    })),
  }));

  if (days.length > 0) {
    return days;
  }

  return [
    {
      id: makeId("day"),
      date: snapshot.itinerary.startDate,
      points: [{ id: makeId("point"), time: "", activity: "" }],
    },
  ];
}

function parseStoredEditableDays(value: string | undefined): EditableDay[] | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as EditableDay[];
    if (!Array.isArray(parsed)) {
      return null;
    }

    const sanitized = parsed
      .map((day) => ({
        id: typeof day.id === "string" && day.id ? day.id : makeId("day"),
        date: typeof day.date === "string" ? day.date : "",
        points: Array.isArray(day.points)
          ? day.points.map((point) => ({
              id: typeof point.id === "string" && point.id ? point.id : makeId("point"),
              time: typeof point.time === "string" ? point.time : "",
              activity: typeof point.activity === "string" ? point.activity : "",
            }))
          : [{ id: makeId("point"), time: "", activity: "" }],
      }))
      .filter((day) => day.points.length > 0);

    return sanitized.length > 0 ? sanitized : null;
  } catch {
    return null;
  }
}

export default function ItineraryPlannerPage() {
  const [snapshot, setSnapshot] = useState<PlannerSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [editableDays, setEditableDays] = useState<EditableDay[]>([]);
  const [editableVisitPlaces, setEditableVisitPlaces] = useState<PlacesToVisitRecord[]>([]);
  const [editableEatPlaces, setEditableEatPlaces] = useState<PlacesToEatRecord[]>([]);
  const [activeView, setActiveView] = useState<"itinerary" | "edit">("itinerary");
  const { role: firestoreRole, loading: roleLoading, error: roleError } = usePlannerRole();

  const withSortOrderVisit = (items: PlacesToVisitRecord[]): PlacesToVisitRecord[] =>
    items.map((item, index) => ({ ...item, sortOrder: index + 1 }));

  const withSortOrderEat = (items: PlacesToEatRecord[]): PlacesToEatRecord[] =>
    items.map((item, index) => ({ ...item, sortOrder: index + 1 }));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      setInfo("");

      try {
        const baseData = await getPlannerSnapshot();
        setSnapshot(baseData);
        setEditableDays(mapSummaryToEditableDays(baseData));
        setEditableVisitPlaces(withSortOrderVisit(baseData.placesToVisit));
        setEditableEatPlaces(withSortOrderEat(baseData.placesToEat));
        setLoading(false);

        try {
          const saved = await withTimeout(
            loadLatestSummaryFromFirestore(baseData.itinerary.itineraryId),
            2500,
          );

          if (!saved?.summary) {
            return;
          }

          const hydratedData = {
            ...baseData,
            summary: saved.summary,
            placesToVisit: saved.placesToVisit || baseData.placesToVisit,
            placesToEat: saved.placesToEat || baseData.placesToEat,
          };
          setSnapshot(hydratedData);
          const restoredEditor = parseStoredEditableDays(saved.editorText);
          setEditableDays(restoredEditor || mapSummaryToEditableDays(hydratedData));
          setEditableVisitPlaces(withSortOrderVisit(hydratedData.placesToVisit));
          setEditableEatPlaces(withSortOrderEat(hydratedData.placesToEat));
        } catch (syncError) {
          setInfo(getFriendlyFirestoreError(syncError, "read"));
        }
      } catch {
        setError("Failed to load itinerary mock data.");
        setLoading(false);
      }
    };

    void load();
  }, []);

  const effectiveRole: UserRole = useMemo(() => {
    if (firestoreRole) {
      return firestoreRole;
    }

    if (!snapshot) {
      return "viewer";
    }

    return snapshot.currentUser.role;
  }, [firestoreRole, snapshot]);

  const canSubmit = true;

  const handleSubmit = async () => {
    if (!snapshot || !canSubmit) {
      return;
    }

    const hasAnyPoint = editableDays.some((day) =>
      day.points.some((point) => point.activity.trim().length > 0),
    );

    if (!hasAnyPoint) {
      setError("Add at least one activity row before submitting.");
      return;
    }

    setRegenerating(true);
    setError("");
    setInfo("");

    try {
      const generatedSummary = buildSummaryFromEditableDays({
        itineraryId: snapshot.itinerary.itineraryId,
        generatedBy: snapshot.currentUser.uid,
        days: editableDays,
        referenceDate: snapshot.itinerary.startDate,
      });

      await saveLatestSummaryToFirestore({
        itineraryId: snapshot.itinerary.itineraryId,
        summary: generatedSummary,
        editorText: JSON.stringify(editableDays),
        locationRegion: snapshot.itinerary.locationRegion,
        placesToVisit: withSortOrderVisit(editableVisitPlaces),
        placesToEat: withSortOrderEat(editableEatPlaces),
      });

      const updated = {
        ...snapshot,
        summary: generatedSummary,
        placesToVisit: withSortOrderVisit(editableVisitPlaces),
        placesToEat: withSortOrderEat(editableEatPlaces),
      };
      setSnapshot(updated);
      setInfo("Summary generated locally and saved to Firestore.");
      setActiveView("itinerary");
    } catch (submitError) {
      setError(getFriendlyFirestoreError(submitError, "write"));
    } finally {
      setRegenerating(false);
    }
  };

  const handleEditClick = () => {
    setError("");
    setInfo("");
    setActiveView("edit");
  };

  const addPointRow = (dayId: string) => {
    setEditableDays((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? {
              ...day,
              points: [...day.points, { id: makeId("point"), time: "", activity: "" }],
            }
          : day,
      ),
    );
  };

  const removePointRow = (dayId: string, pointId: string) => {
    setEditableDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        const nextPoints = day.points.filter((point) => point.id !== pointId);
        return {
          ...day,
          points:
            nextPoints.length > 0
              ? nextPoints
              : [{ id: makeId("point"), time: "", activity: "" }],
        };
      }),
    );
  };

  const updateDayDate = (dayId: string, date: string) => {
    setEditableDays((prev) =>
      prev.map((day) => (day.id === dayId ? { ...day, date } : day)),
    );
  };

  const updatePointField = (
    dayId: string,
    pointId: string,
    field: "time" | "activity",
    value: string,
  ) => {
    setEditableDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        return {
          ...day,
          points: day.points.map((point) =>
            point.id === pointId ? { ...point, [field]: value } : point,
          ),
        };
      }),
    );
  };

  const addDayBlock = () => {
    const fallbackDate = snapshot?.itinerary.startDate || new Date().toISOString().slice(0, 10);
    setEditableDays((prev) => [
      ...prev,
      {
        id: makeId("day"),
        date: fallbackDate,
        points: [{ id: makeId("point"), time: "", activity: "" }],
      },
    ]);
  };

  const removeDayBlock = (dayId: string) => {
    setEditableDays((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((day) => day.id !== dayId);
    });
  };

  const updateVisitPlace = (
    placeId: string,
    field: "name" | "addressText" | "googleMapsUrl",
    value: string,
  ) => {
    setEditableVisitPlaces((prev) =>
      prev.map((place) => (place.placeId === placeId ? { ...place, [field]: value } : place)),
    );
  };

  const updateEatPlace = (
    placeId: string,
    field: "name" | "addressText" | "googleMapsUrl",
    value: string,
  ) => {
    setEditableEatPlaces((prev) =>
      prev.map((place) => (place.placeId === placeId ? { ...place, [field]: value } : place)),
    );
  };

  const addVisitPlace = () => {
    if (!snapshot) return;
    setEditableVisitPlaces((prev) => [
      ...prev,
      {
        placeId: makeId("visit"),
        itineraryId: snapshot.itinerary.itineraryId,
        name: "",
        addressText: "",
        googleMapsUrl: "",
        category: "other",
        sortOrder: prev.length + 1,
      },
    ]);
  };

  const addEatPlace = () => {
    if (!snapshot) return;
    setEditableEatPlaces((prev) => [
      ...prev,
      {
        placeId: makeId("eat"),
        itineraryId: snapshot.itinerary.itineraryId,
        name: "",
        addressText: "",
        googleMapsUrl: "",
        cuisineTags: [],
        sortOrder: prev.length + 1,
      },
    ]);
  };

  const removeVisitPlace = (placeId: string) => {
    setEditableVisitPlaces((prev) => withSortOrderVisit(prev.filter((p) => p.placeId !== placeId)));
  };

  const removeEatPlace = (placeId: string) => {
    setEditableEatPlaces((prev) => withSortOrderEat(prev.filter((p) => p.placeId !== placeId)));
  };

  if (loading) {
    return (
      <main className="itn-shell">
        <section className="itn-status-card">Loading itinerary planner...</section>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="itn-shell">
        <section className="itn-status-card itn-status-error">
          {error || "No itinerary data available."}
        </section>
      </main>
    );
  }

  return (
    <main className="itn-shell">
      <div className="itn-backdrop" />
      <div className="itn-container">
        <PlannerHeader
          tripTitle={snapshot.itinerary.tripTitle}
          region={snapshot.itinerary.locationRegion}
          user={{ ...snapshot.currentUser, role: effectiveRole }}
          onEditClick={handleEditClick}
        />

        <section className="itn-meta-bar">
          <p>
            Role: <strong>{roleLoading ? "loading..." : effectiveRole}</strong>
          </p>
          <p>
            Last generated: <strong>{new Date(snapshot.summary.generatedAtIso).toLocaleString()}</strong>
          </p>
          <p>
            Source: <strong>Local generator + Firestore</strong>
          </p>
        </section>

        {canSubmit && (
          <section className="itn-view-tabs" role="tablist" aria-label="Planner views">
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "itinerary"}
              className={`itn-tab-btn ${activeView === "itinerary" ? "is-active" : ""}`}
              onClick={() => setActiveView("itinerary")}
            >
              Itinerary
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "edit"}
              className={`itn-tab-btn ${activeView === "edit" ? "is-active" : ""}`}
              onClick={() => setActiveView("edit")}
            >
              Edit Points
            </button>
          </section>
        )}

        {canSubmit && activeView === "edit" && (
          <section className="itn-section" id="itinerary-editor-section">
            <div className="itn-section-heading">
              <h2>Edit Itinerary Points</h2>
            </div>
            <div className="itn-editor-wrap">
              <p className="itn-editor-help">
                Edit each point directly using time and activity fields, then submit.
              </p>
              <p className="itn-editor-help">
                Dates accept flexible format: 2026-07-24, 28 feb, 28/02, 28-02-2026.
              </p>
              <div className="itn-day-editor-list">
                {editableDays.map((day, dayIndex) => (
                  <div className="itn-day-editor-card" key={day.id}>
                    <div className="itn-day-editor-head">
                      <label htmlFor={`day-date-${day.id}`}>Date</label>
                      <input
                        id={`day-date-${day.id}`}
                        className="itn-input-date"
                        type="text"
                        value={day.date}
                        onChange={(event) => updateDayDate(day.id, event.target.value)}
                        placeholder="e.g. 28 feb"
                      />
                      <button
                        type="button"
                        className="itn-row-btn itn-row-btn-danger"
                        onClick={() => removeDayBlock(day.id)}
                        disabled={editableDays.length <= 1}
                      >
                        Remove day
                      </button>
                    </div>

                    <div className="itn-point-grid-head">
                      <span>Time</span>
                      <span>Activity</span>
                      <span>Action</span>
                    </div>

                    {day.points.map((point, pointIndex) => (
                      <div className="itn-point-row" key={point.id}>
                        <input
                          className="itn-input-time"
                          type="time"
                          value={point.time}
                          onChange={(event) =>
                            updatePointField(day.id, point.id, "time", event.target.value)
                          }
                          aria-label={`Time for day ${dayIndex + 1} point ${pointIndex + 1}`}
                        />
                        <input
                          className="itn-input-activity"
                          type="text"
                          value={point.activity}
                          onChange={(event) =>
                            updatePointField(day.id, point.id, "activity", event.target.value)
                          }
                          placeholder="Enter activity summary"
                          aria-label={`Activity for day ${dayIndex + 1} point ${pointIndex + 1}`}
                        />
                        <button
                          type="button"
                          className="itn-row-btn itn-row-btn-danger"
                          onClick={() => removePointRow(day.id, point.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="itn-row-btn"
                      onClick={() => addPointRow(day.id)}
                    >
                      Add point
                    </button>
                  </div>
                ))}
              </div>

              <div className="itn-editor-actions">
                <button type="button" className="itn-row-btn" onClick={addDayBlock}>
                  Add day
                </button>
                <button
                  type="button"
                  className="itn-generate-btn"
                  onClick={handleSubmit}
                  disabled={regenerating}
                >
                  {regenerating ? "Submitting..." : "Submit and Generate Summary"}
                </button>
              </div>

              <div className="itn-place-edit-group">
                <h3>Places to Visit</h3>
                {editableVisitPlaces.map((place) => (
                  <div className="itn-place-edit-row" key={place.placeId}>
                    <input
                      className="itn-input-activity"
                      type="text"
                      value={place.name}
                      onChange={(event) =>
                        updateVisitPlace(place.placeId, "name", event.target.value)
                      }
                      placeholder="Place name"
                    />
                    <input
                      className="itn-input-activity"
                      type="text"
                      value={place.addressText}
                      onChange={(event) =>
                        updateVisitPlace(place.placeId, "addressText", event.target.value)
                      }
                      placeholder="Address"
                    />
                    <input
                      className="itn-input-activity"
                      type="url"
                      value={place.googleMapsUrl}
                      onChange={(event) =>
                        updateVisitPlace(place.placeId, "googleMapsUrl", event.target.value)
                      }
                      placeholder="Google Maps URL"
                    />
                    <button
                      type="button"
                      className="itn-row-btn itn-row-btn-danger"
                      onClick={() => removeVisitPlace(place.placeId)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="itn-row-btn" onClick={addVisitPlace}>
                  Add place to visit
                </button>
              </div>

              <div className="itn-place-edit-group">
                <h3>Places to Eat Around</h3>
                {editableEatPlaces.map((place) => (
                  <div className="itn-place-edit-row" key={place.placeId}>
                    <input
                      className="itn-input-activity"
                      type="text"
                      value={place.name}
                      onChange={(event) =>
                        updateEatPlace(place.placeId, "name", event.target.value)
                      }
                      placeholder="Restaurant name"
                    />
                    <input
                      className="itn-input-activity"
                      type="text"
                      value={place.addressText}
                      onChange={(event) =>
                        updateEatPlace(place.placeId, "addressText", event.target.value)
                      }
                      placeholder="Address"
                    />
                    <input
                      className="itn-input-activity"
                      type="url"
                      value={place.googleMapsUrl}
                      onChange={(event) =>
                        updateEatPlace(place.placeId, "googleMapsUrl", event.target.value)
                      }
                      placeholder="Google Maps URL"
                    />
                    <button
                      type="button"
                      className="itn-row-btn itn-row-btn-danger"
                      onClick={() => removeEatPlace(place.placeId)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="itn-row-btn" onClick={addEatPlace}>
                  Add place to eat
                </button>
              </div>
            </div>
          </section>
        )}

        {info && <p className="itn-info-text">{info}</p>}
        {roleError && <p className="itn-error-text">{roleError}</p>}
        {error && <p className="itn-error-text">{error}</p>}

        {activeView === "itinerary" && (
          <CurrentItinerarySection days={snapshot.summary.summaryDays} />
        )}

        {activeView === "itinerary" && (
          <PlacesListSection
            title="Places to Visit"
            places={[...snapshot.placesToVisit].sort((a, b) => a.sortOrder - b.sortOrder)}
          />
        )}

        {activeView === "itinerary" && (
          <PlacesListSection
            title="Places to Eat Around"
            places={[...snapshot.placesToEat].sort((a, b) => a.sortOrder - b.sortOrder)}
          />
        )}
      </div>
    </main>
  );
}
