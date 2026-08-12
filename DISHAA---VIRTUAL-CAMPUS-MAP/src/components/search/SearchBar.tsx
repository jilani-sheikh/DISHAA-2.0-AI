import { useEffect, useState } from 'react';
import { useSearch } from '../../hooks/useSearch';
import type { Place, Coordinates } from '../../types';
import { SearchResults } from './SearchResults';
import { BottomSheet } from '../ui/BottomSheet';

interface SearchBarProps {
  onSelect: (place: Place) => void;
  currentLocation?: Coordinates | null;
}

export function SearchBar({ onSelect, currentLocation }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [searchTarget, setSearchTarget] = useState<'origin' | 'destination' | null>(null);
  const { results, isLoading, error } = useSearch(query);
  const shouldShowResults = isFocused; // show sheet when focused; results render when query non-empty

  const selectPlace = (place: Place) => {
    setQuery(place.name);
    setIsFocused(false);
    onSelect(place);
    try {
      window.dispatchEvent(new CustomEvent('dishaa-place-selected', { detail: { place, target: searchTarget } }));
    } catch (_) {}
  };

  useEffect(() => {
    const opener = (e: Event) => {
      // Support CustomEvent with detail.target for origin/destination
      const ce = e as CustomEvent | Event;
      const target = (ce && (ce as any).detail && (ce as any).detail.target) ? (ce as any).detail.target : null;
      setSearchTarget(target as any);
      setIsFocused(true);
    };
    window.addEventListener('dishaa-open-search', opener as EventListener);
    return () => window.removeEventListener('dishaa-open-search', opener as EventListener);
  }, []);

  useEffect(() => {
    if (isFocused) document.body.classList.add('search-open');
    else document.body.classList.remove('search-open');
  }, [isFocused]);

  return (
    <section className="search-section">
      {!isFocused && query.trim() === '' ? (
        <button type="button" className="search-pill" onClick={() => { setSearchTarget('origin'); setIsFocused(true); }} aria-label="Open search">
          <span aria-hidden>⌕</span>
          <span className="pill-text">Search campus</span>
        </button>
      ) : (
        <label className="search-box" htmlFor="place-search">
          <span aria-hidden="true">⌕</span>
          <input
            id="place-search"
            type="search"
            autoComplete="off"
            placeholder="Search campus places..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          />
          {isLoading && <span className="search-spinner" aria-label="Searching" />}
        </label>
      )}
      {shouldShowResults && (
        <BottomSheet className="search-results-sheet">
          <div className="search-sheet-header">
            <div className="search-target-toggle">
              <button type="button" className={`st-btn ${searchTarget === 'destination' || searchTarget === null ? 'active' : ''}`} onClick={() => setSearchTarget('destination')}>To</button>
              <button type="button" className={`st-btn ${searchTarget === 'origin' ? 'active' : ''}`} onClick={() => setSearchTarget('origin')}>From</button>
            </div>
            {searchTarget === 'origin' && (
              <div className="search-current-row">
                <button
                  type="button"
                  className="secondary-button"
                  data-testid="use-current-location"
                  onClick={() => {
                    const place = { id: 'current-location', name: '📍 My current location' } as any;
                    // Do not call onSelect with the synthetic current-location object —
                    // this prevents the app from treating it as a normal campus Place
                    // (which lacks `location` data) and avoids downstream crashes.
                    // NavigationPanel listens for the `dishaa-place-selected` event
                    // to set the origin to the live current location instead.
                    try {
                      window.dispatchEvent(new CustomEvent('dishaa-place-selected', { detail: { place: { id: 'current-location' }, target: 'origin' } }));
                    } catch (_) {}
                    setIsFocused(false);
                  }}
                >📍 Use my current location</button>
              </div>
            )}
          </div>

          {query.trim().length > 0 ? (
            <SearchResults query={query.trim()} results={results} error={error} onSelect={selectPlace} />
          ) : (
            <div className="search-hint">Type to search campus places, or choose From/To above.</div>
          )}
        </BottomSheet>
      )}
    </section>
  );
}
