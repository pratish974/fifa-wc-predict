## Plan: Firebase-Backed Itinerary Summary App

Build a React + TypeScript web app (responsive mobile + desktop) where users enter itinerary items by day, GPT generates a clean point-wise summary with both original and suggested timings, and the final summary is stored in Firebase and rendered in three sections: Current Itinerary, Places to Visit, and Places to Eat Around. Editors can modify data based on Firestore role permissions.

**Steps**
1. Finalize feature contract and UI behavior.
- Input flow: editor enters day, activity points, optional time, optional duration, optional notes.
- GPT output: point-wise summary by date with two timing fields per point:
Original time from user.
Suggested time estimate from GPT.
- Display flow:
Current Itinerary section at top.
Places to Visit section below with name + Google Maps link address.
Places to Eat Around section below with name + Google Maps link address.

2. Define responsive mock screen structure (depends on step 1).
- Mobile layout:
Sticky page title and Edit Itinerary button.
Card sections stacked vertically.
Each day card contains date header and bullet points.
Places lists shown as tappable rows with external-link icon.
- Desktop layout:
Wider centered container.
Same section order as mobile.
Date blocks in timeline/list format with higher density.
- Click behavior:
Selecting a place link opens Google Maps URL in a new browser tab.
On mobile devices, maps URL can deep-link into installed maps app if OS handles the URL.

3. Set up frontend architecture in TypeScript React (depends on step 1).
- Define routes:
Planner view.
Edit itinerary view.
Optional role-protected admin/editor area.
- Define state boundaries:
Raw itinerary input state.
Generated summary state.
Persisted itinerary snapshot state from Firebase.
- Define API boundary:
Client calls backend endpoint for GPT generation.
Client never calls OpenAI directly in production architecture.

4. Define Firebase architecture and permissions (depends on step 1).
- Firebase Auth for login identity.
- Firestore collections for itineraries, place lists, and generated summaries.
- User role model in user profile document with admin/editor/viewer.
- Security rules:
Only admin/editor can create/update itinerary input and regenerate summaries.
Viewer can read published itinerary and place links.
- Audit metadata:
Track who edited and when summary was generated.

5. Define GPT generation pipeline (depends on steps 1 and 4).
- Trigger pattern:
Editor clicks Generate Summary.
- Server action:
Send day-wise raw itinerary to GPT with structured-output prompt.
Receive normalized JSON response with summary points and suggested durations.
Validate schema.
Write summary to Firestore.
- Read pattern:
Planner page reads latest published summary document.

6. Implement places link behavior spec (depends on step 2).
- Store both human-readable address and googleMapsUrl.
- UI shows place name and short address.
- Clicking row opens googleMapsUrl in new tab.
- Validate URL format before render to avoid broken links.

7. Verification and acceptance (depends on steps 3 to 6).
- Role tests:
Viewer cannot edit.
Editor can edit and regenerate.
- Data tests:
Summary write/read round trip persists correctly.
- UX tests:
Mobile and desktop section order and readability.
Map links open correctly.
- Failure tests:
GPT malformed response handled with user-facing retry state.

**Relevant files**
No workspace is currently open, so file-level mapping cannot be attached yet.  
Once a workspace is opened, I will map this plan to exact file paths and symbols.

**Verification**
1. Create one itinerary with at least two dates and five points each; generate summary and confirm both original and suggested timings appear.
2. Confirm only editor/admin role can modify itinerary and regenerate summary.
3. Confirm all Places to Visit and Places to Eat links open in Google Maps.
4. Confirm latest generated summary persists and reloads correctly after refresh.
5. Confirm responsive behavior across mobile and desktop widths.

**Decisions**
- Included: both mobile and desktop mock behavior.
- Included: GPT summary keeps original times and adds suggested timing.
- Included: Firebase role model using Firestore user profile with admin/editor/viewer.
- Included: summary persisted in Firebase and rendered in point-wise format.
- Excluded for now: embedded maps widget and map coordinates rendering.
- Security note: even though earlier you accepted browser API key exposure, this architecture recommends a backend GPT call for safe Firebase app operation.

## Mock Screen Specification

1. Header Row
- Title: Trip Planner
- Right action: Edit Itinerary button (visible for editor/admin)

2. Section 1: Current Itinerary
- Section title bar
- Repeated day blocks:
Date heading.
Bullet list of summary points.
Each point line pattern:
Original time - Activity summary (estimated duration)
Optional second line:
Suggested slot: HH:MM to HH:MM

3. Section 2: Places to Visit
- Section title bar
- List rows:
Place Name - Address
Tap or click opens Google Maps link

4. Section 3: Places to Eat Around
- Section title bar
- List rows:
Place Name - Address
Tap or click opens Google Maps link

## TypeScript + React Folder Structure

Suggested project layout:

trip-planner-app/
- package.json
- tsconfig.json
- vite.config.ts
- .env
- public/
- src/
- src/app/
- src/app/router.tsx
- src/app/providers.tsx
- src/pages/
- src/pages/PlannerPage.tsx
- src/pages/EditItineraryPage.tsx
- src/components/
- src/components/layout/AppHeader.tsx
- src/components/itinerary/CurrentItinerarySection.tsx
- src/components/itinerary/DaySummaryCard.tsx
- src/components/places/PlacesListSection.tsx
- src/components/places/PlaceLinkRow.tsx
- src/components/forms/ItineraryEditorForm.tsx
- src/components/common/LoadingState.tsx
- src/components/common/ErrorState.tsx
- src/features/
- src/features/itinerary/types.ts
- src/features/itinerary/validation.ts
- src/features/itinerary/itineraryService.ts
- src/features/summary/summaryService.ts
- src/features/summary/summaryPromptBuilder.ts
- src/features/places/placeService.ts
- src/firebase/
- src/firebase/client.ts
- src/firebase/auth.ts
- src/firebase/firestore.ts
- src/firebase/securityNotes.md
- src/store/
- src/store/useItineraryStore.ts
- src/hooks/
- src/hooks/useCurrentItinerary.ts
- src/hooks/useUserRole.ts
- src/api/
- src/api/generateSummary.ts
- src/styles/
- src/styles/tokens.css
- src/styles/global.css
- functions/
- functions/src/
- functions/src/index.ts
- functions/src/generateItinerarySummary.ts
- functions/src/types.ts
- firestore.rules
- firestore.indexes.json

## Mock JSON Schema

1. User profile with role
- collection: users
- document id: auth uid
- fields:
uid: string
email: string
displayName: string
role: admin | editor | viewer
createdAt: timestamp
updatedAt: timestamp

2. Itinerary input (editor managed)
- collection: itineraries
- document id: itineraryId
- fields:
tripTitle: string
locationRegion: string
startDate: string (ISO)
endDate: string (ISO)
status: draft | published
createdBy: uid
updatedBy: uid
createdAt: timestamp
updatedAt: timestamp
days: array of day objects

3. Day object
- fields:
date: string (ISO)
notes: string
activities: array of activity objects

4. Activity object
- fields:
activityId: string
title: string
description: string
originalStartTime: string (HH:MM)
originalDurationMinutes: number
placeRefId: string or null
tags: array of strings

5. Generated summary (GPT output persisted)
- collection: itinerarySummaries
- document id: summaryId
- fields:
itineraryId: string
version: number
generatedBy: uid
generatedAt: timestamp
model: string
summaryDays: array of summary day objects
highlights: array of strings
warnings: array of strings
status: generated | approved | superseded

6. Summary day object
- fields:
date: string (ISO)
points: array of summary point objects

7. Summary point object
- fields:
pointId: string
text: string
originalTime: string (HH:MM or null)
estimatedDurationMinutes: number
suggestedStartTime: string (HH:MM or null)
suggestedEndTime: string (HH:MM or null)
sourceActivityId: string or null

8. Places to visit
- collection: placesToVisit
- document id: placeId
- fields:
itineraryId: string
name: string
addressText: string
googleMapsUrl: string
category: attraction | temple | museum | nature | other
sortOrder: number

9. Places to eat around
- collection: placesToEat
- document id: placeId
- fields:
itineraryId: string
name: string
addressText: string
googleMapsUrl: string
cuisineTags: array of strings
sortOrder: number

10. Optional edit audit log
- collection: itineraryAudit
- fields:
itineraryId: string
action: created | updated | generated_summary | published
actorUid: string
timestamp: timestamp
details: map

Natural next steps:
1. Open a workspace folder so I can convert this into an exact execution handoff plan with real file paths and step-by-step build order.
2. If you want, I can next provide Firestore security rules draft and a GPT prompt contract draft aligned to this schema.