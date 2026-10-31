import { useState, type FormEvent } from 'react';
import { getJson, sendJson } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import type { Team } from '../api/types.js';

const loadTeams = (path: string) => getJson<{ teams: Team[] }>(path);

export default function Teams() {
  const { data, loading, error, reload } = useApi('/api/teams', loadTeams);
  const [name, setName] = useState('');
  const [mascot, setMascot] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setFailure('');
    try {
      await sendJson('/api/teams', 'POST', { name, mascot, members: [] });
      setName('');
      setMascot('');
      setMessage('Team created.');
      reload();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Unable to create team');
    } finally {
      setSaving(false);
    }
  }

  return <section><h2>Teams</h2>
    {loading ? <p role="status">Loading teams…</p> : error ? <p role="alert">{error}</p> : !data?.teams.length ? <p>No teams yet.</p> :
      <ul className="list-group mb-3">{data.teams.map((team, index) => <li className="list-group-item" key={team._id ?? index}><strong>{team.name}</strong> {team.mascot && <>· {team.mascot}</>} · {team.members.length} members</li>)}</ul>}
    <form onSubmit={submit} className="card card-body"><h3 className="h5">Create a team</h3>
      <label htmlFor="team-name">Team name</label><input id="team-name" className="form-control mb-2" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
      <label htmlFor="team-mascot">Mascot</label><input id="team-mascot" className="form-control mb-2" required maxLength={100} value={mascot} onChange={(event) => setMascot(event.target.value)} />
      <button className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create team'}</button>
      {message && <p role="status">{message}</p>}{failure && <p role="alert">{failure}</p>}
    </form>
  </section>;
}
