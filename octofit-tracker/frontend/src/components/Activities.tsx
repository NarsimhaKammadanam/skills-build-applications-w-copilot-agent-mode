import { useState, type FormEvent } from 'react';
import { getJson, sendJson } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import type { Activity, User } from '../api/types.js';

const loadActivities = (path: string) => getJson<{ activities: Activity[] }>(path);

function ActivityForm({ onSaved }: { onSaved: () => void }) {
  const { data, loading, error } = useApi<{ users: User[] }>('/api/users');
  const [userId, setUserId] = useState('');
  const [type, setType] = useState('');
  const [minutes, setMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const user = data?.users.find((entry) => entry._id === userId);
    if (!user?.team) return;
    setSaving(true);
    setMessage('');
    setFailure('');
    try {
      await sendJson('/api/activities', 'POST', { userId, teamId: user.team, type, minutes: Number(minutes) });
      setMessage('Activity saved.');
      setType('');
      setMinutes('');
      onSaved();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Unable to save activity');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status">Loading users…</p>;
  if (error) return <p role="alert">{error}</p>;
  const users = data?.users.filter((user) => user.team) ?? [];
  if (!users.length) return <p>No users with a team. Seed demo data or assign a team first.</p>;
  return <form onSubmit={submit} className="card card-body my-3">
    <label htmlFor="activity-user">User</label>
    <select id="activity-user" className="form-select mb-2" required value={userId} onChange={(event) => setUserId(event.target.value)}>
      <option value="">Select a user</option>
      {users.map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}
    </select>
    <label htmlFor="activity-type">Activity type</label>
    <input id="activity-type" className="form-control mb-2" required maxLength={80} value={type} onChange={(event) => setType(event.target.value)} />
    <label htmlFor="activity-minutes">Minutes</label>
    <input id="activity-minutes" className="form-control mb-2" type="number" min="1" max="1440" required value={minutes} onChange={(event) => setMinutes(event.target.value)} />
    <p>Earn one point per minute. Activities count toward your current team.</p>
    <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save activity'}</button>
    {message && <p role="status">{message}</p>}
    {failure && <p role="alert">{failure}</p>}
  </form>;
}

export default function Activities() {
  const { data, loading, error, reload } = useApi('/api/activities', loadActivities);
  const [showForm, setShowForm] = useState(false);
  return <section><h2>Activities</h2>
    <button className="btn btn-outline-primary mb-3" aria-expanded={showForm} onClick={() => setShowForm(!showForm)}>{showForm ? 'Close activity form' : 'Log activity'}</button>
    {showForm && <ActivityForm onSaved={reload} />}
    {loading ? <p role="status">Loading activities…</p> : error ? <p role="alert">{error}</p> : !data?.activities.length ? <p>No activities yet. Log your first activity.</p> :
      <ul className="list-group">{data.activities.map((activity, index) => <li className="list-group-item" key={activity._id ?? index}><strong>{activity.type}</strong> — {activity.minutes} minutes, {activity.points} points{activity.occurredAt && <> · <time dateTime={activity.occurredAt}>{new Date(activity.occurredAt).toLocaleDateString()}</time></>}</li>)}</ul>}
  </section>;
}
