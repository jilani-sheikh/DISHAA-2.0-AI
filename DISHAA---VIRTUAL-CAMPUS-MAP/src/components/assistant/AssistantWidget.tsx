import { useEffect, useRef, useState } from 'react';
import { useAssistant, type AssistantActions } from '../../hooks/useAssistant';
import { categoryLabel } from '../../utils/categories';
import { IconClose, IconNavigation, IconPins, IconSend, IconSparkle } from '../landing/icons';
import { useSpeech } from '../../hooks/useSpeech';

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
  const [isMuted, setIsMuted] = useState(false);
  const isComposing = useRef(false);
  const { messages, isThinking, send, runQuickAction, showPlaceFromChat, navigateFromChat } = useAssistant(actions);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isSupported, isListening, lastTranscript, error: speechError, startListening, stopListening, clearTranscript, speak, isSpeaking, cancelSpeak } = useSpeech();

  useEffect(() => {
    if (!isOpen) return;
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isThinking, isOpen]);

  useEffect(() => {
    if (isOpen) window.setTimeout(() => inputRef.current?.focus(), 120);
  }, [isOpen]);

  // When voice recognition yields a transcript, send it as a user message.
  useEffect(() => {
    if (!lastTranscript) return;
    // Only auto-send when assistant panel is open to avoid unexpected messages.
    if (!isOpen) return;
    // Avoid sending transcripts picked up while the assistant is speaking (TTS feedback loop).
    if (isSpeaking) {
      return;
    }

    // Send once and clear the transcript to prevent duplicate sends.
    void (async () => {
      await send(lastTranscript);
      // clear transcript so the same text isn't sent again
      try { clearTranscript(); } catch (e) { /* ignore */ }
    })();
  }, [lastTranscript, isOpen, isSpeaking, send]);

  // Speak assistant responses unless muted.
  useEffect(() => {
    if (isMuted) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;
    // Small safety: don't speak the greeting automatically when the panel just opens.
    if (last.id === 'greeting' && messages.length === 1) return;
    speak(last.text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isMuted]);

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

          <div className="assistant-voice-controls">
            {/* Microphone button */}
            <button
              type="button"
              className={`assistant-mic ${isListening ? 'listening' : ''}`}
              title={isListening ? 'Stop listening' : 'Speak to DISHAA'}
              aria-pressed={isListening}
              onClick={() => {
                if (!isSupported) return;
                if (isListening) stopListening(); else startListening();
              }}
            >
              {isListening ? '🛑' : '🎤'}
            </button>

            {/* Speaker / mute toggle */}
            <button
              type="button"
              className={`assistant-mute ${isMuted ? 'muted' : ''}`}
              title={isMuted ? 'Unmute' : 'Speak responses'}
              onClick={() => {
                setIsMuted((v) => !v);
                if (!isMuted) cancelSpeak();
              }}
            >
              {isMuted ? '🔇' : isSpeaking ? '🔊' : '🔈'}
            </button>

            <button type="button" className="assistant-send" onClick={submitDraft} disabled={!draft.trim() || isThinking} aria-label="Send message">
              <IconSend size={18} />
            </button>
          </div>
        </div>

        {/* Informational hint when speech not supported or has error */}
        {!isSupported && (
          <div className="assistant-hint">Voice input not supported in this browser.</div>
        )}
        {speechError && (
          <div className="assistant-hint is-error">Speech error: {speechError}</div>
        )}
      </section>
    </>
  );
}
