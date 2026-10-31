import { isObjectIdOrHexString } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}

function body(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Expected a JSON object');
  return input as Record<string, unknown>;
}

function text(value: unknown, field: string, maxLength = 100): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    fail(`${field} must be nonempty text (up to ${maxLength} characters)`);
  }
  return value.trim();
}

function id(value: unknown, field: string): string {
  if (typeof value !== 'string' || !isObjectIdOrHexString(value)) fail(`${field} must be a valid ID`);
  return value.toLowerCase();
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1, _id: -1 }).lean();
}

export async function createActivity(input: unknown) {
  const data = body(input);
  const userId = id(data.userId, 'userId');
  const teamId = id(data.teamId, 'teamId');
  const type = text(data.type, 'type', 80);
  const minutes = data.minutes;
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
    fail('minutes must be a number between 1 and 1440');
  }
  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) fail('User or team not found', 404);
  if (user.team?.toString() !== teamId) fail('Activity team must match the user team');
  return Activity.create({ user: userId, team: teamId, type, minutes, points: minutes, occurredAt: new Date() });
}

export async function listTeams() {
  return Team.find().sort({ name: 1, _id: 1 }).lean();
}

export async function createTeam(input: unknown) {
  const data = body(input);
  const name = text(data.name, 'name');
  const mascot = text(data.mascot, 'mascot');
  const submittedMembers = data.members ?? [];
  if (!Array.isArray(submittedMembers)) fail('members must be an array of user IDs');
  const members = [...new Set(submittedMembers.map((member) => id(member, 'member')))];
  if (await User.countDocuments({ _id: { $in: members } }) !== members.length) fail('Member not found', 404);
  const team = await Team.create({ name, mascot, members });
  if (members.length) {
    await Team.updateMany({ _id: { $ne: team._id }, members: { $in: members } }, { $pull: { members: { $in: members } } });
    await User.updateMany({ _id: { $in: members } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const entries = await Team.aggregate([
    { $lookup: {
      from: Activity.collection.name,
      let: { teamId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$team', '$$teamId'] } } },
        { $group: { _id: null, points: { $sum: '$points' } } },
      ],
      as: 'totals',
    } },
    { $project: { teamName: '$name', totalPoints: { $ifNull: [{ $arrayElemAt: ['$totals.points', 0] }, 0] } } },
    { $sort: { totalPoints: -1, teamName: 1, _id: 1 } },
  ]);
  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() });
  if (!user) fail('User not found', 404);
  const recent = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1, _id: -1 }).lean();
  const focusByType = new Map([
    ['run', 'endurance'], ['cycle', 'endurance'], ['walk', 'endurance'],
    ['swim', 'endurance'], ['strength', 'strength'], ['yoga', 'mobility'],
  ]);
  const goal = user.fitnessGoal.toLowerCase();
  const goalWorkouts = await Workout.find({ focus: goal }).sort({ title: 1 }).lean();
  if (goalWorkouts.length) return goalWorkouts.map((workout) => ({ ...workout, reason: `Supports your ${goal} fitness goal.` }));
  const focus = recent && focusByType.get(recent.type.toLowerCase());
  if (!focus) return [];
  const workouts = await Workout.find({ focus }).sort({ title: 1 }).lean();
  return workouts.map((workout) => ({ ...workout, reason: `Builds on your recent ${recent!.type} activity.` }));
}

export async function listUsers() {
  return User.find().select('name email team fitnessGoal').sort({ name: 1, _id: 1 }).lean();
}

export async function getUserProfile(userId: string) {
  const user = await User.findById(id(userId, 'userId')).populate('team', 'name mascot').lean();
  if (!user) fail('User not found', 404);
  const [totals] = await Activity.aggregate([
    { $match: { user: user._id } },
    { $group: { _id: null, totalMinutes: { $sum: '$minutes' }, totalPoints: { $sum: '$points' }, activityCount: { $sum: 1 } } },
  ]);
  return { ...user, totalMinutes: totals?.totalMinutes ?? 0, totalPoints: totals?.totalPoints ?? 0, activityCount: totals?.activityCount ?? 0 };
}

export async function updateUserProfile(userId: string, input: unknown) {
  const data = body(input);
  const updates: { name?: string; fitnessGoal?: string } = {};
  if (data.name !== undefined) updates.name = text(data.name, 'name');
  if (data.fitnessGoal !== undefined) updates.fitnessGoal = text(data.fitnessGoal, 'fitnessGoal');
  if (!Object.keys(updates).length) fail('Provide a name or fitnessGoal');
  const user = await User.findByIdAndUpdate(id(userId, 'userId'), { $set: updates }, { new: true, runValidators: true });
  if (!user) fail('User not found', 404);
  return getUserProfile(userId);
}

export { User };
