import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { useAuth } from './hooks/api/useAuth';
import AuthGuard from './components/common/AuthGuard';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { MapsProvider } from './components/maps/MapsProvider';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Services = lazy(() => import('./pages/Services'));
const Orders = lazy(() => import('./pages/Orders'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Messages = lazy(() => import('./pages/Messages'));
const Profile = lazy(() => import('./pages/Profile'));
const GigDetails = lazy(() => import('./pages/GigDetails'));
const PostGig = lazy(() => import('./pages/PostGig'));
const Login = lazy(() => import('./pages/Login'));
const Notifications = lazy(() => import('./pages/Notifications'));
const CategoryResults = lazy(() => import('./pages/CategoryResults'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const GigImmersiveView = lazy(() => import('./pages/GigImmersiveView'));
const StoryImmersiveView = lazy(() => import('./components/story/StoryImmersiveView'));

// Settings Sub-pages
const ProfileSettings = lazy(() => import('./pages/settings/ProfileSettings'));
const VerificationSettings = lazy(() => import('./pages/settings/VerificationSettings'));
const SecuritySettings = lazy(() => import('./pages/settings/SecuritySettings'));
const NotificationSettings = lazy(() => import('./pages/settings/NotificationSettings'));
const PrivacySettings = lazy(() => import('./pages/settings/PrivacySettings'));
const PaymentSettings = lazy(() => import('./pages/settings/PaymentSettings'));
const SupportSettings = lazy(() => import('./pages/settings/SupportSettings'));
const RecoverySettings = lazy(() => import('./pages/settings/RecoverySettings'));
import Settings from './pages/Settings';
import SavedGigs from './pages/SavedGigs';
import TransactionHistory from './pages/TransactionHistory';

const App: React.FC = () => {
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  return (
    <ErrorBoundary>
      <MapsProvider>
        {mapsQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}
        <Router>
          <AppContent />
        </Router>
      </MapsProvider>
    </ErrorBoundary>
  );
};

const AppContent: React.FC = () => {
  const { isLoading, user } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    console.log('[Router] Current Path:', location.pathname);
  }, [location]);

  // Wait for auth rehydration before rendering routes to avoid login flash.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-70">
            Restoring session
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    }>
      <Routes>
        {/* If user is logged in, redirect away from login automatically */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="explore" element={<Services />} />
          <Route path="orders" element={<Orders />} />
          <Route path="explore/:categoryName" element={<CategoryResults />} />
          <Route path="search" element={<SearchResults />} />
          <Route path="gig/:id" element={<GigDetails />} />
          <Route path="gig/view/:id" element={<GigImmersiveView />} />
          <Route path="story/:userId" element={<StoryImmersiveView />} />
          <Route path="profile/:userId" element={<PublicProfile />} />
          
          {/* Protected Routes */}
          <Route path="dashboard" element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          } />
          <Route path="messages" element={
            <AuthGuard>
              <Messages />
            </AuthGuard>
          } />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/profile" element={<ProfileSettings />} />
          <Route path="settings/verification" element={<VerificationSettings />} />
          <Route path="settings/security" element={<SecuritySettings />} />
          <Route path="settings/notifications" element={<NotificationSettings />} />
          <Route path="settings/privacy" element={<PrivacySettings />} />
          <Route path="settings/payments" element={<PaymentSettings />} />
          <Route path="settings/support" element={<SupportSettings />} />
          <Route path="settings/recovery" element={<RecoverySettings />} />
          <Route path="saved" element={
            <AuthGuard>
              <SavedGigs />
            </AuthGuard>
          } />
          <Route path="history" element={
            <AuthGuard>
              <TransactionHistory />
            </AuthGuard>
          } />
          <Route path="upload" element={
            <AuthGuard>
              <PostGig />
            </AuthGuard>
          } />
        </Route>

        {/* Fallback for deep links if guest */}
        <Route path="*" element={user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
