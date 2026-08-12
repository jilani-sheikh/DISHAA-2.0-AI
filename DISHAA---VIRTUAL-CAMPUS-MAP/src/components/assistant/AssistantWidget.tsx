import { useEffect, useRef, useState } from 'react';
import { useAssistant, type AssistantActions } from '../../hooks/useAssistant';
import { categoryLabel } from '../../utils/categories';
import { IconClose, IconNavigation, IconPins, IconSend, IconSparkle } from '../landing/icons';

interface AssistantWidgetProps {
  actions: AssistantActions;
}

const QUICK_ACTIONS = [
  { id: 'search-library' as const, label: 'Where is the library?' },
  { id: 'find-nearby' as const, label: 'Find something near me' },
  { id: 'navigate-hint' as const, label: 'Navigate somewhere' },
];

export function AssistantWidget({ actions }: AssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const isComposing = useRef(false);
  const { messages, isThinking, send, runQuickAction, showPlaceFromChat, navigateFromChat } = useAssistant(actions);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isThinking, isOpen]);

  useEffect(() => {
    if (isOpen) window.setTimeout(() => inputRef.current?.focus(), 120);
  }, [isOpen]);

  const submitDraft = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void send(text);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    // Do not submit while a CJK IME is composing (incl. Safari's 229 quirk).
    if (isComposing.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    submitDraft();
  };

  const showOnlyGreeting = messages.length <= 1;

  return (
    <>
      {!isOpen && (
        <button type="button" className="assistant-launcher" onClick={() => setIsOpen(true)} aria-label="Open the DISHAA assistant">
          <IconSparkle size={17} />
          <span>Ask DISHAA</span>
        </button>
      )}

      <section className={`assistant-panel ${isOpen ? 'is-open' : ''}`} aria-hidden={!isOpen} aria-label="DISHAA assistant">
        <header className="assistant-head">
          <span className="assistant-avatar" aria-hidden="true"><IconSparkle size={18} /></span>
          <div className="assistant-title">
            <b>DISHAA Assistant</b>
            <span><i className="assistant-dot" aria-hidden="true" /> Campus guide</span>
          </div>
          <button type="button" className="assistant-close" onClick={() => setIsOpen(false)} aria-label="Close assistant">
            <IconClose size={18} />
          </button>
        </header>

        <div className="assistant-body" ref={bodyRef}>
          {messages.map((message) => (
            <div key={message.id} className={`assistant-msg assistant-msg-${message.role}`}>
              <p className="assistant-bubble">{message.text}</p>
              {message.kind === 'places' && message.places && message.places.length > 0 && (
                <ul className="assistant-places">
                  {message.places.map((place) => (
                    <li key={place.id} className="assistant-place">
                      <div className="assistant-place-info">
                        <strong>{place.name}</strong>
                        <small>{categoryLabel(place.category)}</small>
                      </div>
                      <div className="assistant-place-actions">
                        <button type="button" title={`Show ${place.name} on the map`} aria-label={`Show ${place.name} on the map`} onClick={() => showPlaceFromChat(place)}>
                          <IconPins size={15} />
                        </button>
                        <button type="button" className="is-primary" title={`Navigate to ${place.name}`} aria-label={`Navigate to ${place.name}`} onClick={() => void navigateFromChat(place)}>
                          <IconNavigation size={15} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="assistant-msg assistant-msg-assistant">
              <p className="assistant-bubble assistant-typing" aria-label="DISHAA is thinking">
                <span /><span /><span />
              </p>
            </div>
          )}

          {showOnlyGreeting && !isThinking && (
            <div className="assistant-suggestions">
              {QUICK_ACTIONS.map((action) => (
                <button key={action.id} type="button" className="assistant-suggestion" onClick={() => void runQuickAction(action.id)}>
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="assistant-input">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            placeholder="Ask DISHAA..."
            aria-label="Ask the DISHAA assistant"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onCompositionStart={() => { isComposing.current = true; }}
            onCompositionEnd={() => { isComposing.current = false; }}
          />
          <button type="button" className="assistant-send" onClick={submitDraft} disabled={!draft.trim() || isThinking} aria-label="Send message">
            <IconSend size={18} />
          </button>
        </div>
      </section>
    </>
  );
}
