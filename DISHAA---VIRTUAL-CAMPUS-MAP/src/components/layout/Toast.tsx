interface ToastProps {
  message: string | null;
  isError?: boolean;
}

export function Toast({ message, isError = false }: ToastProps) {
  if (!message) return null;
  return <div className={`toast ${isError ? 'is-error' : ''}`} role="alert">{message}</div>;
}
