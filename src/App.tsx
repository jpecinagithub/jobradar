import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { DemoBanner } from './components/layout/DemoBanner';
import Home from './pages/Home';
import SearchPage from './pages/SearchPage';
import JobDetailPage from './pages/JobDetailPage';
import SavedSearchesPage from './pages/SavedSearchesPage';
import SavedJobsPage from './pages/SavedJobsPage';
import ApplicationsPage from './pages/ApplicationsPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/DashboardPage';
import AdminSources from './pages/admin/SourcesPage';
import AdminFilters from './pages/admin/FiltersPage';
import AdminTaxonomies from './pages/admin/TaxonomiesPage';
import AdminSynonyms from './pages/admin/SynonymsPage';
import AdminJobs from './pages/admin/JobsPage';
import AdminDuplicates from './pages/admin/DuplicatesPage';
import AdminEngine from './pages/admin/EnginePage';
import AdminAnalytics from './pages/admin/AnalyticsPage';
import AdminSystem from './pages/admin/SystemPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <DemoBanner />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/job/:id" element={<JobDetailPage />} />
            <Route path="/saved-searches" element={<SavedSearchesPage />} />
            <Route path="/saved" element={<SavedJobsPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="sources" element={<AdminSources />} />
              <Route path="filters" element={<AdminFilters />} />
              <Route path="taxonomies" element={<AdminTaxonomies />} />
              <Route path="synonyms" element={<AdminSynonyms />} />
              <Route path="jobs" element={<AdminJobs />} />
              <Route path="duplicates" element={<AdminDuplicates />} />
              <Route path="engine" element={<AdminEngine />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="system" element={<AdminSystem />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
