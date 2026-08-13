import { useEffect, useRef, useState } from 'react';

export type SpeechHook = {
  isSupported: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  lastTranscript: string | null;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  cancelSpeak: () => void;
};

export function useSpeech(): SpeechHook {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  const [isSupported] = useState(Boolean(SpeechRecognition));
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis || null;
    return () => {
      if (synthRef.current && utteranceRef.current) synthRef.current.cancel();
    };
  }, []);

  useEffect(() => {
    if (!SpeechRecognition) return;
    const recog = new SpeechRecognition();
    recog.lang = 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 1;

    recog.onresult = (event: any) => {
      const text = (event.results && event.results[0] && event.results[0][0] && event.results[0][0].transcript) || '';
      setLastTranscript(text);
    };

    recog.onerror = (ev: any) => {
      setError(ev?.error || 'speech-error');
      setIsListening(false);
    };

    recog.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recog;
    // Do not auto-start
  }, [SpeechRecognition]);

  const startListening = () => {
    setError(null);
    setLastTranscript(null);
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e: any) {
      setError(e?.message || String(e));
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) recognitionRef.current.stop();
    setIsListening(false);
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;
    try {
      if (utteranceRef.current) {
        synthRef.current.cancel();
        utteranceRef.current = null;
      }
      const u = new SpeechSynthesisUtterance(text);
      utteranceRef.current = u;
      setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      synthRef.current.speak(u);
    } catch (e) {
      setIsSpeaking(false);
    }
  };

  const cancelSpeak = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      utteranceRef.current = null;
      setIsSpeaking(false);
    }
  };

  return {
    isSupported,
    isListening,
    isSpeaking,
    lastTranscript,
    error,
    startListening,
    stopListening,
    speak,
    cancelSpeak,
  };
}
