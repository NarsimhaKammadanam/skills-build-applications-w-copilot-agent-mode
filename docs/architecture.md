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
Use the existing contract tests as acceptance criteria. Work in small slices: run the closest test after each change, keep data, API, and presentation responsibilities in their own tiers, and do not weaken or rewrite a contract to make an implementation pass. Keep the configured ports unchanged and leave authentication out of scope.

### 1. Data tier

Run `npm run test:data --prefix octofit-tracker/backend`.

- Confirm users require a name, email, and fitness goal.
- Confirm teams require a name and mascot, default `members` to an empty array, and retain member IDs.
- Confirm activities require a type, user, team, minutes, points, and occurrence date.
- Confirm workouts require a title, focus, duration, and difficulty.
- Confirm seeding creates representative records for all capabilities, is idempotent, preserves unrelated records, and moves an existing seeded user out of their previous team's membership when their team changes.

Failures here point to Mongoose schema or seed behavior. Complete this tier before relying on API persistence behavior.

### 2. Logic tier

Run `npm run test:api --prefix octofit-tracker/backend`. The API contract tests use an isolated in-memory MongoDB and clear their fixture collections between cases.

- **Activities:** reject missing or malformed input and malformed or nonexistent user/team IDs with deliberate 4xx responses; do not persist rejected records or expose Mongoose cast errors as 500s. For valid input, return `201`, persist the user, team, type, and minutes, compute positive points and an occurrence date, and return the record from `GET /api/activities`.
- **Teams:** reject a missing name with `400`; create and list a valid team while preserving its name, mascot, and member IDs.
- **Leaderboard:** sum activity points per team, sort descending, and assign ranks starting at 1.
- **Workout suggestions:** for a known user's email, recommend a workout whose focus reflects their goal or recent activity and include a reason; return a deliberate 4xx for an unknown email.

Failures here point to service logic, request validation, route responses, or status codes. Keep business behavior in services and HTTP behavior in routes.

### 3. Presentation tier

Run `npm test --prefix octofit-tracker/frontend`. The tests mock `fetch`, so they verify UI behavior without requiring live API or database processes.

- Verify each route requests its API data and renders returned activity, team, leaderboard, or workout content.
- Verify workout suggestions request the expected user's email.
- For all four routes, verify a pending request announces a loading state, an empty response shows a meaningful empty state, and a failed response shows an accessible alert.

Failures here point to API-client integration, rendering, or missing user-facing request states. Use accessible status and alert semantics for the loading and error states.

### 4. Build gates

After the contract tests pass, run both builds:

- `npm run build --prefix octofit-tracker/backend` checks backend TypeScript compilation.
- `npm run build --prefix octofit-tracker/frontend` checks frontend TypeScript and creates the Vite production bundle.

Build failures indicate type or bundling issues that contract tests may not cover. A completed change passes when its tier's contract suite and build gate pass, with earlier tier suites kept green.
