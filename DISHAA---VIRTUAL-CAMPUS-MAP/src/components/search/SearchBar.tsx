import { useState } from 'react';
import { useSearch } from '../../hooks/useSearch';
import type { Place } from '../../types';
import { SearchResults } from './SearchResults';

interface SearchBarProps {
  onSelect: (place: Place) => void;
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { results, isLoading, error } = useSearch(query);
  const shouldShowResults = isFocused && query.trim().length > 0;

  const selectPlace = (place: Place) => {
    setQuery(place.name);
    setIsFocused(false);
    onSelect(place);
  };

  return (
    <section className="search-section">
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
      {shouldShowResults && <SearchResults query={query.trim()} results={results} error={error} onSelect={selectPlace} />}
    </section>
  );
}
