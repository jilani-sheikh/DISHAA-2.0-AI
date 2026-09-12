import { useEffect, useState, useRef } from 'react';
import { useSearch } from '../../hooks/useSearch';
import type { Place, Coordinates } from '../../types';
import { SearchResults } from './SearchResults';

interface SearchBarProps {
  onSelect: (place: Place) => void;
  currentLocation?: Coordinates | null;
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [searchTarget, setSearchTarget] = useState<'origin' | 'destination' | null>(null);
  const { results, isLoading, error } = useSearch(query);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectPlace = (place: Place, targetOverride?: 'origin' | 'destination') => {
    setQuery(place.name);
    setIsFocused(false);
    onSelect(place);
    const target = targetOverride || searchTarget;
    try {
      window.dispatchEvent(new CustomEvent('dishaa-place-selected', { detail: { place, target } }));
    } catch (_) {}
  };

  const handleDirectionsClick = (place?: Place) => {
    setIsFocused(false);
    if (place) {
      selectPlace(place, 'destination');
    } else {
      try {
        window.dispatchEvent(new CustomEvent('dishaa-open-search', { detail: { target: 'destination' } }));
      } catch (_) {}
    }
  };

  useEffect(() => {
    const opener = (e: Event) => {
      const ce = e as CustomEvent | Event;
      const target = (ce && (ce as any).detail && (ce as any).detail.target) ? (ce as any).detail.target : null;
      setSearchTarget(target as any);
      setIsFocused(true);
    };
    window.addEventListener('dishaa-open-search', opener as EventListener);
    return () => window.removeEventListener('dishaa-open-search', opener as EventListener);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="clean-search-container" ref={containerRef}>
      <div className={`clean-search-box ${isFocused ? 'is-active' : ''}`}>
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          id="place-search"
          type="text"
          autoComplete="off"
          placeholder="Search campus buildings, places..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
        />
        {query.trim() && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => setQuery('')}
            title="Clear search"
          >
            ✕
          </button>
        )}
        {isLoading ? (
          <span className="search-spinner" aria-label="Searching" />
        ) : (
          <button
            type="button"
            className="search-directions-btn"
            title="Directions"
            onClick={() => handleDirectionsClick()}
          >
            🧭 Route
          </button>
        )}
      </div>

      {isFocused && (
        <div className="clean-search-dropdown">
          {query.trim().length > 0 ? (
            <SearchResults
              query={query.trim()}
              results={results}
              error={error}
              onSelect={(place) => selectPlace(place, 'destination')}
              onDirections={(place) => selectPlace(place, 'destination')}
              onSetStart={(place) => selectPlace(place, 'origin')}
            />
          ) : (
            <div className="search-quick-hints">
              <div className="quick-hint-label">Quick Search</div>
              <div className="quick-hint-chips">
                <button type="button" className="quick-hint-chip" onClick={() => setQuery('Library')}>📚 Library</button>
                <button type="button" className="quick-hint-chip" onClick={() => setQuery('Canteen')}>🍔 Canteen</button>
                <button type="button" className="quick-hint-chip" onClick={() => setQuery('Block A')}>🎓 Block A</button>
                <button type="button" className="quick-hint-chip" onClick={() => setQuery('Hostel')}>🏠 Hostel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
