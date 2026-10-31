import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { Activity, Team, User } from '../src/models/index.js';

const app = createApp();
let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
beforeEach(async () => {
  await Promise.all([Activity.deleteMany({}), Team.deleteMany({}), User.deleteMany({})]);
});

it('rejects invalid durations and team mismatches without saving activities', async () => {
  const team = await Team.create({ name: 'Octocats', mascot: 'Mona' });
  const other = await Team.create({ name: 'Robocats', mascot: 'Hubot' });
  const user = await User.create({ name: 'Mona', email: 'mona@example.com', fitnessGoal: 'endurance', team: team._id });
  for (const minutes of [0, -1, '30', null, 1441]) {
    const response = await request(app).post('/api/activities').send({ userId: user.id, teamId: team.id, type: 'run', minutes });
    expect(response.status).toBe(400);
  }
  const mismatch = await request(app).post('/api/activities').send({ userId: user.id, teamId: other.id, type: 'run', minutes: 30 });
  expect(mismatch.status).toBe(400);
  expect(await Activity.countDocuments()).toBe(0);
});

it('returns zero-point teams and resolves ranking ties consistently', async () => {
  await Team.create([{ name: 'Robocats', mascot: 'Hubot' }, { name: 'Octocats', mascot: 'Mona' }]);
  const response = await request(app).get('/api/leaderboard');
  expect(response.body.leaderboard).toMatchObject([
    { teamName: 'Octocats', totalPoints: 0, rank: 1 },
    { teamName: 'Robocats', totalPoints: 0, rank: 2 },
  ]);
});

it('lists profiles, summarizes fitness history, and updates only profile fields', async () => {
  const team = await Team.create({ name: 'Octocats', mascot: 'Mona' });
  const user = await User.create({ name: 'Mona', email: 'mona@example.com', fitnessGoal: 'endurance', team: team._id });
  await Activity.create({ user: user._id, team: team._id, type: 'run', minutes: 30, points: 30, occurredAt: new Date() });
  expect((await request(app).get('/api/users')).body.users[0].name).toBe('Mona');
  const profile = await request(app).get(`/api/users/${user.id}`);
  expect(profile.body.user).toMatchObject({ name: 'Mona', team: { name: 'Octocats' }, totalMinutes: 30, totalPoints: 30, activityCount: 1 });
  const updated = await request(app).patch(`/api/users/${user.id}`).send({ name: 'Mona Cat', fitnessGoal: 'strength', email: 'changed@example.com' });
  expect(updated.status).toBe(200);
  expect(updated.body.user).toMatchObject({ name: 'Mona Cat', fitnessGoal: 'strength', email: 'mona@example.com' });
  expect((await request(app).patch(`/api/users/${user.id}`).send({ fitnessGoal: ' ' })).status).toBe(400);
  expect((await request(app).get('/api/users/not-an-id')).status).toBe(400);
  expect((await request(app).get(`/api/users/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
});

it('reconciles membership when a new team receives an existing user', async () => {
  const oldTeam = await Team.create({ name: 'Old team', mascot: 'Old' });
  const user = await User.create({ name: 'Mona', email: 'mona@example.com', fitnessGoal: 'endurance', team: oldTeam._id });
  await Team.updateOne({ _id: oldTeam._id }, { $addToSet: { members: user._id } });
  const response = await request(app).post('/api/teams').send({ name: 'New team', mascot: 'New', members: [user.id] });
  expect(response.status).toBe(201);
  expect((await User.findById(user._id))?.team?.toString()).toBe(response.body.team._id);
  expect((await Team.findById(oldTeam._id))?.members).toHaveLength(0);
});
