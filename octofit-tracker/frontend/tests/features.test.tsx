import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../src/App.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderRoute(route: string) {
  render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);
}

it('logs an activity and refreshes the activity list', async () => {
  const user = userEvent.setup();
  let saved = false;
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/users')) return Response.json({ users: [{ _id: 'user-1', name: 'Mona', team: 'team-1' }] });
    if (init?.method === 'POST') {
      saved = true;
      return Response.json({ activity: { type: 'run', minutes: 30, points: 30 } }, { status: 201 });
    }
    return Response.json({ activities: saved ? [{ type: 'run', minutes: 30, points: 30 }] : [] });
  });
  vi.stubGlobal('fetch', fetchMock);
  renderRoute('/activities');
  await user.click(screen.getByRole('button', { name: /log activity/i }));
  await screen.findByRole('option', { name: 'Mona' });
  await user.selectOptions(screen.getByLabelText('User'), 'user-1');
  await user.type(screen.getByLabelText('Activity type'), 'run');
  await user.type(screen.getByLabelText('Minutes'), '30');
  await user.click(screen.getByRole('button', { name: /save activity/i }));
  await screen.findByText('Activity saved.');
  await screen.findByText('run');
  expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/activities$/), expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ userId: 'user-1', teamId: 'team-1', type: 'run', minutes: 30 }),
  }));
});

it('loads a profile and saves an updated fitness goal', async () => {
  const user = userEvent.setup();
  let profile = { _id: 'user-1', name: 'Mona', email: 'mona@example.com', fitnessGoal: 'endurance', team: { name: 'Octocats' }, totalMinutes: 30, totalPoints: 30, activityCount: 1 };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith('/users')) return Response.json({ users: [{ _id: 'user-1', name: 'Mona' }] });
    if (init?.method === 'PATCH') profile = { ...profile, ...JSON.parse(String(init.body)) };
    return Response.json({ user: profile });
  });
  vi.stubGlobal('fetch', fetchMock);
  renderRoute('/profiles');
  const goal = await screen.findByLabelText('Fitness goal');
  expect(screen.getByText('Octocats')).toBeInTheDocument();
  expect(screen.getByText(/30 minutes/)).toBeInTheDocument();
  await user.clear(goal);
  await user.type(goal, 'strength');
  await user.click(screen.getByRole('button', { name: /save profile/i }));
  await screen.findByText('Profile saved.');
  expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/users\/user-1$/), expect.objectContaining({
    method: 'PATCH', body: JSON.stringify({ name: 'Mona', fitnessGoal: 'strength' }),
  }));
});

it('shows profile empty and failure states', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ users: [] })));
  renderRoute('/profiles');
  await screen.findByText(/no users/i);
  cleanup();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));
  renderRoute('/profiles');
  expect(await screen.findByRole('alert')).toHaveTextContent(/unable/i);
});

it('reports a failed activity submission without claiming success', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST') return Response.json({ error: 'User or team not found' }, { status: 404 });
    if (String(input).endsWith('/users')) return Response.json({ users: [{ _id: 'user-1', name: 'Mona', team: 'team-1' }] });
    return Response.json({ activities: [] });
  }));
  renderRoute('/activities');
  await user.click(screen.getByRole('button', { name: /log activity/i }));
  await screen.findByRole('option', { name: 'Mona' });
  await user.selectOptions(screen.getByLabelText('User'), 'user-1');
  await user.type(screen.getByLabelText('Activity type'), 'run');
  await user.type(screen.getByLabelText('Minutes'), '10');
  await user.click(screen.getByRole('button', { name: /save activity/i }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/not found/i));
  expect(screen.queryByText('Activity saved.')).not.toBeInTheDocument();
});

it('creates a team and refreshes the team list', async () => {
  const user = userEvent.setup();
  const teams: { name: string; mascot: string; members: string[] }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST') {
      teams.push(JSON.parse(String(init.body)));
      return Response.json({ team: teams[0] }, { status: 201 });
    }
    return Response.json({ teams });
  }));
  renderRoute('/teams');
  await screen.findByText(/no teams/i);
  await user.type(screen.getByLabelText('Team name'), 'Octocats');
  await user.type(screen.getByLabelText('Mascot'), 'Mona');
  await user.click(screen.getByRole('button', { name: 'Create team' }));
  await screen.findByText('Team created.');
  await screen.findByText('Octocats');
});

it('requests suggestions for a different user submitted in the form', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn(async () => Response.json({ suggestions: [] }));
  vi.stubGlobal('fetch', fetchMock);
  renderRoute('/workouts');
  const email = screen.getByLabelText('User email');
  await user.clear(email);
  await user.type(email, 'hubot@example.com');
  await user.click(screen.getByRole('button', { name: 'Find workouts' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/hubot%40example\.com$/)));
});
