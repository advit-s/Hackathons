import { useState, useEffect, useCallback, useRef } from 'react';

export function useTeacherVoice(enabled = true) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const lastSpokenRef = useRef(null);
    const lastSpeakTimeRef = useRef(0);
    const synth = window.speechSynthesis;

    const speak = useCallback((text) => {
        if (!enabled || !text || !synth) return;

        const now = Date.now();
        // Prevent repeating the same message too often (e.g., within 5 seconds)
        if (text === lastSpokenRef.current && now - lastSpeakTimeRef.current < 5000) {
            return;
        }

        // Prevent speaking if already speaking
        if (synth.speaking) {
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);

        // Select a pleasant voice (prefer female/Microsoft Zira/Google US English)
        const voices = synth.getVoices();
        const preferredVoice = voices.find(v =>
            v.name.includes('Zira') ||
            v.name.includes('Female') ||
            v.name.includes('Google US English')
        );
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            lastSpokenRef.current = text;
            lastSpeakTimeRef.current = Date.now();
        };

        synth.speak(utterance);
    }, [enabled]);

    const stop = useCallback(() => {
        if (synth) {
            synth.cancel();
            setIsSpeaking(false);
        }
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (synth) {
                synth.cancel();
            }
        };
    }, []);

    return { speak, stop, isSpeaking };
}
