import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Setup from './pages/Setup';

export default function App() {
  const [isSetup, setIsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('gh_token');
    const owner = localStorage.getItem('gh_owner');
    const repo = localStorage.getItem('gh_repo');
    
    if (token && owner && repo) {
      setIsSetup(true);
    } else {
      setIsSetup(false);
    }
  }, []);

  if (isSetup === null) return <div className="min-h-screen flex items-center justify-center">加载中...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/setup" element={!isSetup ? <Setup onSetup={() => setIsSetup(true)} /> : <Navigate to="/login" />} />
        <Route path="/login" element={isSetup ? <Login /> : <Navigate to="/setup" />} />
        <Route path="/" element={isSetup ? <Dashboard /> : <Navigate to="/setup" />} />
      </Routes>
    </Router>
  );
}
