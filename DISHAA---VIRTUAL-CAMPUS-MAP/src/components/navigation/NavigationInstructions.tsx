import type { RouteInstruction } from '../../types';

export function NavigationInstructions({ instructions }: { instructions: RouteInstruction[] }) {
  if (!instructions || !instructions.length) return null;

  return (
    <div className="clean-directions-container">
      <div className="directions-heading">Turn-by-Turn Guidance</div>
      <ol className="clean-route-instructions" aria-label="Turn by turn walking directions">
        {instructions.map((instruction, index) => (
          <li key={`${instruction.instruction}-${index}`} className="instruction-step">
            <span className="step-number">{index + 1}</span>
            <div className="step-details">
              <span className="step-text">{instruction.instruction}</span>
              {instruction.distanceKm > 0 && (
                <small className="step-distance">
                  {instruction.distanceKm < 1
                    ? `${Math.round(instruction.distanceKm * 1000)} m`
                    : `${instruction.distanceKm.toFixed(2)} km`}
                </small>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
