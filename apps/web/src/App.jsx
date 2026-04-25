import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { LandingPageClean } from './pages/LandingPageClean';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { PrototypeTitlePage } from './pages/PrototypeTitlePage';
import { PrototypeStartupFeaturesPage } from './pages/PrototypeStartupFeaturesPage';
import { PrototypeSignInPage } from './pages/PrototypeSignInPage';
import { PrototypeSignUpPage } from './pages/PrototypeSignUpPage';
import { SearchPage } from './pages/SearchPage';
import { PlaceDetailPage } from './pages/PlaceDetailPage';
import { SavedPage } from './pages/SavedPage';
import { ItineraryPage } from './pages/ItineraryPage';
import { ItineraryDetailPage } from './pages/ItineraryDetailPage';
import { TerminalsPage } from './pages/TerminalsPage';
import { TerminalDetailPage } from './pages/TerminalDetailPage';
import { ProfilePage } from './pages/ProfilePage';
function ProtectedRoute({ children }) {
    const [session, setSession] = useState(null);
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(!!session));
        const { data: { subscription }, } = supabase.auth.onAuthStateChange((_event, s) => setSession(!!s));
        return () => subscription.unsubscribe();
    }, []);
    if (session === null) {
        return (<div className="min-h-screen flex items-center justify-center font-['Inter',sans-serif] text-neutral-600">
        Loading…
      </div>);
    }
    if (!session)
        return <Navigate to="/login" replace/>;
    return <>{children}</>;
}
export default function App() {
    return (<BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPageClean />}/>
        <Route path="/login" element={<LoginPage />}/>
        <Route path="/signup" element={<SignupPage />}/>
        <Route path="/prototype/title" element={<PrototypeTitlePage />}/>
        <Route path="/prototype/startup" element={<PrototypeStartupFeaturesPage />}/>
        <Route path="/prototype/sign-in" element={<PrototypeSignInPage />}/>
        <Route path="/prototype/sign-up" element={<PrototypeSignUpPage />}/>
        <Route path="/search" element={<ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>}/>
        <Route path="/saved" element={<ProtectedRoute>
              <SavedPage />
            </ProtectedRoute>}/>
        <Route path="/itinerary" element={<ProtectedRoute>
              <ItineraryPage />
            </ProtectedRoute>}/>
        <Route path="/itinerary/:id" element={<ProtectedRoute>
              <ItineraryDetailPage />
            </ProtectedRoute>}/>
        <Route path="/terminals" element={<ProtectedRoute>
              <TerminalsPage />
            </ProtectedRoute>}/>
        <Route path="/terminals/:id" element={<ProtectedRoute>
              <TerminalDetailPage />
            </ProtectedRoute>}/>
        <Route path="/profile" element={<ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>}/>
        <Route path="/place/:id" element={<ProtectedRoute>
              <PlaceDetailPage />
            </ProtectedRoute>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </BrowserRouter>);
}
