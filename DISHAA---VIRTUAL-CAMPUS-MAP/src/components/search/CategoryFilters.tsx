import { categories } from '../../utils/categories';

interface CategoryFiltersProps {
  category: string;
  onChange: (category: string) => void;
}

export function CategoryFilters({ category, onChange }: CategoryFiltersProps) {
  return (
    <section className="category-section" aria-label="Browse campus categories">
      <p className="eyebrow">Explore campus</p>
      <div className="category-chips">
        {categories.map((item) => (
          <button
            className={`category-chip ${item.value === category ? 'is-active' : ''}`}
            type="button"
            key={item.value || 'all'}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
