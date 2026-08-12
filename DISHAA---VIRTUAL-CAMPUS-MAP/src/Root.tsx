import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { LandingPage } from './components/landing/LandingPage';
import { FacultyPortal } from './components/landing/FacultyPortal';

// Load the Leaflet-powered map only when the user enters the map view,
// keeping the landing page lightweight.
const App = lazy(() => import('./App'));

type View = 'landing' | 'map' | 'faculty';

function viewFromHash(): View {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (hash === 'map') return 'map';
  if (hash === 'faculty') return 'faculty';
  return 'landing';
}

/**
 * Lightweight hash-based view switcher. The landing page is the primary
 * entry point; its CTAs route to the existing campus map (`#/map`) and to a
 * faculty portal placeholder (`#/faculty`) without introducing a router
 * dependency or touching the map application itself.
 */
export function Root() {
  const [view, setView] = useState<View>(() => viewFromHash());

  useEffect(() => {
    const onHashChange = () => {
      setView(viewFromHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // The map app locks the document to a fixed 100vh layout. Restore normal
  // scrolling for the landing / faculty views via a body class.
  useEffect(() => {
    const scrolls = view === 'landing' || view === 'faculty';
    document.documentElement.classList.toggle('landing-mode', scrolls);
    document.body.classList.toggle('landing-mode', scrolls);
    return () => {
      document.documentElement.classList.remove('landing-mode');
      document.body.classList.remove('landing-mode');
    };
  }, [view]);

  const goToMap = useCallback(() => { window.location.hash = '#/map'; }, []);
  const goToFaculty = useCallback(() => { window.location.hash = '#/faculty'; }, []);
  const goToHome = useCallback(() => { window.location.hash = ''; }, []);

  if (view === 'map') {
    return (
      <Suspense fallback={<div className="lp-map-loading">Loading campus map…</div>}>
        <App />
      </Suspense>
    );
  }
  if (view === 'faculty') return <FacultyPortal onBack={goToHome} />;
  return <LandingPage onLaunchMap={goToMap} onFacultyPortal={goToFaculty} />;
}
