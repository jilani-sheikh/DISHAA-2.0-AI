import type { ReactNode } from 'react';

interface BottomSheetProps {
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ children, className = '' }: BottomSheetProps) {
  return (
    <div className={`bottom-sheet ${className}`} role="dialog" aria-modal="false">
      <div className="bottom-sheet-handle" aria-hidden="true" />
      <div className="bottom-sheet-body">{children}</div>
    </div>
  );
}

export default BottomSheet;
