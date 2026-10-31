# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Use relative `/api` requests from React and the Vite proxy for local development.
- Logic tier decision: Implement API behavior in Express routes/services and return deliberate 4xx responses for invalid input or missing resources.
- Data tier decision: Use the existing Mongoose models and MongoDB seed data for persisted application records.
- Activity tracking approach: Validate IDs and verify the user and team exist before creating an activity with computed points and `occurredAt`.
- Team management approach: Reject missing or empty names and preserve submitted names and mascots.
- Leaderboard approach: Sum activity points by team, sort highest first, and assign ranks starting at 1.
- Workout suggestions approach: Match a user by email and base the recommendation focus on their goal or recent activity, with an explanatory reason.

## Test plan

- Data tier: `npm run test:data --prefix octofit-tracker/backend` — failures indicate model, persistence, or seed-data issues.
- API: `npm run test:api --prefix octofit-tracker/backend` — failures indicate incorrect route behavior, validation, responses, or status codes.
- Frontend: `npm test --prefix octofit-tracker/frontend` — failures indicate client behavior or UI regressions.
- Backend build: `npm run build --prefix octofit-tracker/backend` — failures indicate TypeScript or backend compilation errors.
- Frontend build: `npm run build --prefix octofit-tracker/frontend` — failures indicate type-checking or production-bundling errors.
