export type Activity = { _id?: string; type: string; minutes: number; points: number; occurredAt?: string };
export type Team = { _id?: string; name: string; mascot?: string; members: string[] };
export type User = { _id: string; name: string; email: string; team?: string; fitnessGoal: string };
export type Profile = Omit<User, 'team'> & {
  team?: { name: string; mascot: string } | null;
  totalMinutes: number;
  totalPoints: number;
  activityCount: number;
};
export type Ranking = { _id?: string; teamName: string; totalPoints: number; rank: number };
export type Workout = { _id?: string; title: string; focus?: string; minutes?: number; difficulty?: string; reason: string };
