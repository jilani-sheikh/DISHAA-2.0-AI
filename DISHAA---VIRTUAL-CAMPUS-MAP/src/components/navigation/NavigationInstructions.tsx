import type { RouteInstruction } from '../../types';

export function NavigationInstructions({ instructions }: { instructions: RouteInstruction[] }) {
  if (!instructions.length) return null;

  return (
    <ol className="route-instructions" aria-label="Walking directions">
      {instructions.map((instruction, index) => <li key={`${instruction.instruction}-${index}`}>{instruction.instruction}</li>)}
    </ol>
  );
}
