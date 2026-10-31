import { Link, Navigate, Route, Routes } from 'react-router-dom';
import Activities from './components/Activities.js';
import Teams from './components/Teams.js';
import Leaderboard from './components/Leaderboard.js';
import Workouts from './components/Workouts.js';
import Profiles from './components/Profiles.js';

export default function App() {
  return <div className="container py-4"><header className="mb-4"><h1>OctoFit Tracker</h1><nav aria-label="OctoFit sections" className="d-flex gap-3 flex-wrap"><Link to="/activities">Activities</Link><Link to="/teams">Teams</Link><Link to="/leaderboard">Leaderboard</Link><Link to="/workouts">Workout suggestions</Link><Link to="/profiles">User profiles</Link></nav></header><main><Routes><Route path="/" element={<Navigate to="/activities" replace />} /><Route path="/activities" element={<Activities />} /><Route path="/teams" element={<Teams />} /><Route path="/leaderboard" element={<Leaderboard />} /><Route path="/workouts" element={<Workouts />} /><Route path="/profiles" element={<Profiles />} /></Routes></main></div>;
}
