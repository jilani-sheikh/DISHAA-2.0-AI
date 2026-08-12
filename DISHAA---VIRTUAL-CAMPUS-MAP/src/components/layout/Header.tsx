interface HeaderProps {
  isOnline: boolean | null;
  isLocating: boolean;
  onLocate: () => void;
  onOpenIndoorMaps: () => void;
}

export function Header({ isOnline, isLocating, onLocate, onOpenIndoorMaps }: HeaderProps) {
  const statusText = isOnline === null ? 'Connecting' : isOnline ? 'Service online' : 'Service unavailable';

  return (
    <header className="app-header">
      <a className="brand" href="/" aria-label="DISHAA home">
        <span className="brand-mark" aria-hidden="true">D</span>
        <span>
          <strong>DISHAA</strong>
          <small>Campus navigation</small>
        </span>
      </a>

      <div className="campus-name">
        <span className="campus-dot" aria-hidden="true" />
        <span>G H Raisoni College of Engineering and Management</span>
      </div>

      <div className="header-actions">
        <span className={`connection-status ${isOnline === true ? 'is-online' : isOnline === false ? 'is-offline' : ''}`}>
          {statusText}
        </span>
        <button
          className="icon-button"
          type="button"
          title="Use my current location"
          aria-label="Use my current location"
          onClick={onLocate}
          disabled={isLocating}
        >
          {isLocating ? '…' : '◎'}
        </button>
        <button className="text-button" type="button" onClick={onOpenIndoorMaps}>Indoor maps</button>
      </div>
    </header>
  );
}
