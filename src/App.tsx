import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BlueprintEditor } from './components/BlueprintEditor';
import LandingPage from './components/LandingPage';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import ProjectDashboard from './components/projects/ProjectDashboard';
import RoadmapPage from './components/RoadmapPage';
import IssuesPage from './components/IssuesPage';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen w-full bg-zinc-100 dark:bg-noder-black text-zinc-900 dark:text-zinc-100 transition-colors duration-200 font-sans">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/roadmap" element={<RoadmapPage />} />
              <Route path="/issues" element={<IssuesPage />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/projects" element={<ProjectDashboard />} />
                <Route path="/projects/:projectId" element={<BlueprintEditor />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
