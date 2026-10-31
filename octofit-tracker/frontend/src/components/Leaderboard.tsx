import { useApi } from '../api/useApi.js';
import type { Ranking } from '../api/types.js';

export default function Leaderboard() {
  const { data, loading, error } = useApi<{ leaderboard: Ranking[] }>('/api/leaderboard');
  return <section><h2>Leaderboard</h2>
    {loading ? <p role="status">Loading leaderboard…</p> : error ? <p role="alert">{error}</p> : !data?.leaderboard.length ? <p>No leaderboard scores yet. Create a team to get started.</p> :
      <table className="table table-striped"><caption>Team rankings by total activity points</caption><thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Points</th></tr></thead><tbody>
        {data.leaderboard.map((entry) => <tr key={entry._id ?? entry.rank}><td>{entry.rank}</td><th scope="row">{entry.teamName}</th><td>{entry.totalPoints}</td></tr>)}
      </tbody></table>}
  </section>;
}
