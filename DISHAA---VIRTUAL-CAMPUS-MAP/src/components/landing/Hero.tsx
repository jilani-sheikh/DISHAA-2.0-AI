import { IconArrowRight, IconChat, IconLocation, IconNavigation, IconRoute, IconSparkle } from './icons';

const HERO_IMAGE = '/CLG.jpeg';

interface HeroProps {
  onLaunchMap: () => void;
  onAskAssistant: () => void;
  onFacultyPortal: () => void;
}

export function Hero({ onLaunchMap, onAskAssistant, onFacultyPortal }: HeroProps) {
  return (
    <section className="lp-hero" id="top">
      <div className="lp-container lp-hero-grid">
        <div className="lp-hero-copy">
          <span className="lp-badge">
            <IconSparkle size={15} />
            Smarter way to navigate
          </span>

          <h1 className="lp-hero-title lp-gradient-text">DISHAA</h1>
          <p className="lp-hero-sub">
            Your Smart Virtual <span className="lp-gradient-text">Campus Navigator</span>
          </p>
          <p className="lp-hero-desc">
            Explore the Raisoni Education campus with interactive maps, real-time pedestrian
            navigation, and AI-powered assistance built for G H Raisoni College of Engineering
            and Management.
          </p>

          <div className="lp-hero-actions">
            <button type="button" className="lp-btn lp-btn-primary" onClick={onLaunchMap}>
              Explore Campus Map
              <IconArrowRight size={19} />
            </button>
            <button type="button" className="lp-btn lp-btn-ghost" onClick={onAskAssistant}>
              <IconChat size={19} />
              Ask Assistant
            </button>
          </div>

          <button type="button" className="lp-hero-faculty" onClick={onFacultyPortal}>
            Are you faculty? <b>Open the Faculty Portal &rarr;</b>
          </button>
        </div>

        <div className="lp-hero-visual">
          <div className="lp-hero-frame">
            <img src={HERO_IMAGE || '/placeholder.svg'} alt="G H Raisoni College of Engineering and Management campus" />

            <svg className="lp-hero-route" viewBox="0 0 400 320" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="lpRouteGrad" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#c4b5fd" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
              <path className="lp-route-glow" d="M40 300 C 120 250, 120 190, 210 175 S 300 150, 316 132" />
              <path className="lp-route-line" d="M40 300 C 120 250, 120 190, 210 175 S 300 150, 316 132" />
            </svg>

            <span className="lp-hero-marker" aria-hidden="true">
              <IconLocation size={22} />
            </span>
          </div>

          <div className="lp-hero-chip chip-a" aria-hidden="true">
            <span className="lp-chip-icon"><IconNavigation size={17} /></span>
            <span>
              Live navigation
              <small>320 m &middot; 4 min walk</small>
            </span>
          </div>
          <div className="lp-hero-chip chip-b" aria-hidden="true">
            <span className="lp-chip-icon"><IconRoute size={17} /></span>
            <span>
              Route found
              <small>Main Gate &rarr; Library</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
