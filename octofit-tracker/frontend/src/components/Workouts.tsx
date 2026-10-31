import { useState, type FormEvent } from 'react';
import { getJson } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import type { Workout } from '../api/types.js';

const loadWorkouts = (path: string) => getJson<{ suggestions: Workout[] }>(path);

export default function Workouts() {
  const [email, setEmail] = useState('mona@example.com');
  const [selectedEmail, setSelectedEmail] = useState(email);
  const { data, loading, error, reload } = useApi(`/api/workouts/suggestions/${encodeURIComponent(selectedEmail)}`, loadWorkouts);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (email.trim() === selectedEmail) reload();
    else setSelectedEmail(email.trim());
  }
  return <section><h2>Workout suggestions</h2>
    <form onSubmit={submit} className="mb-3"><label htmlFor="workout-email">User email</label>
      <input id="workout-email" className="form-control mb-2" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <button className="btn btn-primary">Find workouts</button>
    </form>
    {loading ? <p role="status">Loading workout suggestions…</p> : error ? <p role="alert">{error}</p> : !data?.suggestions.length ? <p>No workout suggestions match this user yet.</p> :
      <ul className="list-group">{data.suggestions.map((workout, index) => <li className="list-group-item" key={workout._id ?? index}><h3 className="h5">{workout.title}</h3><p>{workout.focus} {workout.minutes && <>· {workout.minutes} minutes</>} {workout.difficulty && <>· {workout.difficulty}</>}</p><p>{workout.reason}</p></li>)}</ul>}
  </section>;
}
