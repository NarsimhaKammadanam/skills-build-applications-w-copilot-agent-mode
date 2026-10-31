import { useState, type FormEvent } from 'react';
import { sendJson } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import type { Profile, User } from '../api/types.js';

function ProfileForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name);
  const [fitnessGoal, setFitnessGoal] = useState(profile.fitnessGoal);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await sendJson(`/api/users/${encodeURIComponent(profile._id)}`, 'PATCH', { name, fitnessGoal });
      setMessage('Profile saved.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  }

  return <div className="card card-body">
    <p>{profile.email}</p><p>Team: <strong>{profile.team?.name ?? 'No team'}</strong></p>
    <p>{profile.totalMinutes} minutes · {profile.totalPoints} points · {profile.activityCount} activities</p>
    <form onSubmit={submit}>
      <label htmlFor="profile-name">Name</label><input id="profile-name" className="form-control mb-2" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
      <label htmlFor="profile-goal">Fitness goal</label><input id="profile-goal" className="form-control mb-2" required maxLength={100} value={fitnessGoal} onChange={(event) => setFitnessGoal(event.target.value)} />
      <p>Try endurance, strength, or mobility for workout suggestions.</p>
      <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
      {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    </form>
  </div>;
}

function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error } = useApi<{ user: Profile }>(`/api/users/${encodeURIComponent(userId)}`);
  if (loading) return <p role="status">Loading profile…</p>;
  if (error) return <p role="alert">{error}</p>;
  return data && <ProfileForm profile={data.user} />;
}

export default function Profiles() {
  const { data, loading, error } = useApi<{ users: User[] }>('/api/users');
  const [selectedId, setSelectedId] = useState('');
  const userId = selectedId || data?.users[0]?._id;
  return <section><h2>User profiles</h2>
    {loading ? <p role="status">Loading users…</p> : error ? <p role="alert">{error}</p> : !data?.users.length ? <p>No users yet. Seed the demo data to get started.</p> : <>
      <label htmlFor="profile-user">Choose a user</label>
      <select id="profile-user" className="form-select mb-3" value={userId} onChange={(event) => setSelectedId(event.target.value)}>
        {data.users.map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}
      </select>
      {userId && <UserProfile key={userId} userId={userId} />}
    </>}
  </section>;
}
