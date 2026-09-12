import type { Place } from '../../types';
import { categoryGlyph, categoryLabel, formatSubtype } from '../../utils/categories';

interface SearchResultsProps {
  query: string;
  results: Place[];
  error: string | null;
  onSelect: (place: Place) => void;
  onDirections?: (place: Place) => void;
  onSetStart?: (place: Place) => void;
}

export function SearchResults({ query, results, error, onSelect, onDirections, onSetStart }: SearchResultsProps) {
  if (error) {
    return <div className="clean-search-results"><p className="search-empty">Search is unavailable just now. Please try again.</p></div>;
  }

  if (!results.length) {
    return <div className="clean-search-results"><p className="search-empty">No campus places found matching “{query}”.</p></div>;
  }

  return (
    <div className="clean-search-results" role="listbox" aria-label="Campus search results">
      {results.map((place) => (
        <div key={place.id} className="clean-search-item">
          <button className="search-item-info" type="button" onClick={() => onSelect(place)}>
            <span className="item-glyph">{categoryGlyph(place.category)}</span>
            <div className="item-details">
              <strong>{place.name}</strong>
              <small>{categoryLabel(place.category)}{place.subcategory ? ` · ${formatSubtype(place.subcategory)}` : ''}</small>
            </div>
          </button>
          <div className="search-item-actions">
            {onSetStart && (
              <button
                type="button"
                className="item-start-btn"
                title={`Set ${place.name} as start location`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSetStart(place);
                }}
              >
                📍 From
              </button>
            )}
            {onDirections && (
              <button
                type="button"
                className="item-directions-btn"
                title={`Directions to ${place.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDirections(place);
                }}
              >
                🧭 To
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
