import { expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Activity } from '../src/models/index.js';

const app = createApp();
const validId = '507f1f77bcf86cd799439011';

it.each([
  {},
  { userId: { $ne: null }, teamId: validId, type: 'run', minutes: 30 },
  { userId: validId, teamId: 'invalid', type: 'run', minutes: 30 },
  { userId: validId, teamId: validId, type: ' ', minutes: 30 },
  { userId: validId, teamId: validId, type: 'run', minutes: '30' },
  { userId: validId, teamId: validId, type: 'run', minutes: 0 },
  { userId: validId, teamId: validId, type: 'run', minutes: 1441 },
])('rejects invalid activity payloads before database access: %j', async (payload) => {
  const response = await request(app).post('/api/activities').send(payload);
  expect(response.status).toBe(400);
  expect(response.body.error).toEqual(expect.any(String));
});

it.each([
  { name: ' ', mascot: 'Mona' },
  { name: 'Octocats', mascot: {} },
  { name: 'Octocats', mascot: 'Mona', members: 'invalid' },
  { name: 'Octocats', mascot: 'Mona', members: [{ $ne: null }] },
])('rejects invalid team payloads before database access: %j', async (payload) => {
  expect((await request(app).post('/api/teams').send(payload)).status).toBe(400);
});

it('rejects malformed profile IDs and invalid profile edits before database access', async () => {
  expect((await request(app).get('/api/users/invalid')).status).toBe(400);
  for (const payload of [{ name: '' }, { fitnessGoal: { $ne: null } }, { team: validId }, {}]) {
    expect((await request(app).patch(`/api/users/${validId}`).send(payload)).status).toBe(400);
  }
});

it('enforces activity duration limits in the data tier too', () => {
  for (const minutes of [-1, 0, 1441, Infinity]) {
    const activity = new Activity({ user: validId, team: validId, type: 'run', minutes, points: 10, occurredAt: new Date() });
    expect(activity.validateSync()?.errors.minutes).toBeDefined();
  }
});
