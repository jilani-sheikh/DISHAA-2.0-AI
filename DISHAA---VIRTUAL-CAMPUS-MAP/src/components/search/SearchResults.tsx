import type { Place } from '../../types';
import { categoryGlyph, categoryLabel, formatSubtype } from '../../utils/categories';

interface SearchResultsProps {
  query: string;
  results: Place[];
  error: string | null;
  onSelect: (place: Place) => void;
}

export function SearchResults({ query, results, error, onSelect }: SearchResultsProps) {
  if (error) {
    return <div className="search-results"><p className="search-empty">Search is unavailable just now. Please try again.</p></div>;
  }

  if (!results.length) {
    return <div className="search-results"><p className="search-empty">No places found for “{query}”. Try a building, cafe, hostel, or office.</p></div>;
  }

  return (
    <div className="search-results" role="listbox" aria-label="Place search results">
      {results.map((place) => (
        <button className="search-result" type="button" key={place.id} onClick={() => onSelect(place)}>
          <span className="result-glyph">{categoryGlyph(place.category)}</span>
          <span>
            <strong>{place.name}</strong>
            <small>{categoryLabel(place.category)}{place.subcategory ? ` · ${formatSubtype(place.subcategory)}` : ''}</small>
          </span>
          <span aria-hidden="true">›</span>
        </button>
      ))}
    </div>
  );
}
