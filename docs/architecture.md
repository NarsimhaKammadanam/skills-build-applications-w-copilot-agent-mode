# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. API contracts and focused regression tests cover activity tracking, teams, rankings, workout suggestions, and user profiles.

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
| User profiles | `GET /api/users`, `GET /api/users/:userId`, `PATCH /api/users/:userId` | List users, view a user's team and activity totals, or edit `name` and `fitnessGoal`. Invalid IDs or edits return `400`; missing users return `404`. Identity and team fields cannot be changed through profile edits. |

## Implementation decisions

- Presentation tier decision: React views use the shared API client and loading, empty, success, and error states. `/profiles` provides a user selector, fitness totals, and profile editing.
- Logic tier decision: Routes delegate validation and business behavior to explicit service functions.
- Data tier decision: Required fields and duration limits live in Mongoose schemas. Activity indexes support team totals and recent user activity. Demo seeding remains non-destructive and idempotent.
- Activity tracking approach: Accept 1–1440 minutes and award one point per minute. The activity must reference the user's current team; points and timestamps are server-controlled.
- Team management approach: Validate member IDs and claim only unassigned users, rolling back conflicting assignments. Creating a team never moves an existing member from another team. The team creation UI creates an empty team; initial member assignment is supported by the API.
- Leaderboard approach: Aggregate points in MongoDB, include teams with zero points, and assign sequential ranks. Ties sort by team name, then ID.
- Workout suggestions approach: Prefer workouts matching the user's goal, falling back to the latest activity's focus. Each suggestion explains the match; no matching workouts produces an empty list.
- Profiles: Seeded demo users can update names and goals. Authentication is intentionally out of scope; keep the API private and use demo data only.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
- API command: `npm run test:api --prefix octofit-tracker/backend`
- Frontend command: `npm test --prefix octofit-tracker/frontend`
- Backend build command: `npm run build --prefix octofit-tracker/backend`
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
- Additional regression tests: `npm test --prefix octofit-tracker/backend` and `npm test --prefix octofit-tracker/frontend`
- Database-backed tests use `mongodb-memory-server`, which requires a downloadable MongoDB binary or `MONGOMS_SYSTEM_BINARY` pointing to an installed `mongod`.

## Run locally

From the repository root, install each tier with `npm ci --prefix octofit-tracker/backend` and `npm ci --prefix octofit-tracker/frontend`. Start MongoDB on port `27017`, then run:

```bash
npm run seed --prefix octofit-tracker/backend
npm run dev --prefix octofit-tracker/backend
# In a second terminal:
npm run dev --prefix octofit-tracker/frontend
```

Open `http://localhost:5173`. Log an activity for Mona or Hubot, check the leaderboard and profile totals, then update a fitness goal and request workout suggestions using that user's email.
