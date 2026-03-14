import { useMemo, useState, useEffect } from 'react';
import { calculateBodyAngles, getAngleFeedback, getIdealAngles } from '../../utils/angleCalculations';
import { useTeacherVoice } from '../../hooks/useTeacherVoice';
import Card, { CardBody } from '../ui/Card';
import { MessageCircle, CheckCircle, AlertCircle, Volume2, VolumeX } from 'lucide-react';

export default function RealTimeFeedback({ poseData, poseName }) {
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const { speak, stop } = useTeacherVoice(voiceEnabled);

    const feedback = useMemo(() => {
        if (!poseData?.user_landmarks) {
            return [];
        }

        const angles = calculateBodyAngles(poseData.user_landmarks);
        const idealAngles = getIdealAngles(poseName || 'tadasana');

        // Generate feedback for all joints
        const suggestions = [];
        Object.keys(angles).forEach(joint => {
            const current = angles[joint];
            const target = idealAngles[joint];

            if (target !== undefined) {
                const message = getAngleFeedback(joint, current, target);
                if (message) {
                    const deviation = Math.abs(current - target);
                    suggestions.push({ message, deviation, joint });
                }
            }
        });

        // Sort by deviation (worst first) and take top 3
        return suggestions
            .sort((a, b) => b.deviation - a.deviation)
            .slice(0, 3)
            .map(s => s.message);
    }, [poseData, poseName]);

    // Speak the most critical feedback
    useEffect(() => {
        if (poseData?.detected && feedback.length > 0) {
            // Speak only the first (most critical) correction
            speak(feedback[0]);
        } else if (poseData?.score >= 90) {
            speak("Perfect form! Hold it.");
        }
    }, [feedback, poseData, speak]);

    const isPerfect = feedback.length === 0 && poseData?.detected;

    // Toggle voice wrapper to also stop current speech
    const toggleVoice = () => {
        if (voiceEnabled) stop();
        setVoiceEnabled(!voiceEnabled);
    };

    return (
        <Card>
            <CardBody>
                <div className="flex items-start gap-3">
                    {isPerfect ? (
                        <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                    ) : (
                        <MessageCircle className="text-purple-600 flex-shrink-0 mt-1" size={20} />
                    )}

                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-gray-800 mb-2">
                                {isPerfect ? '🎉 Perfect Form!' : 'Real-Time Coaching'}
                            </h3>
                            <button
                                onClick={toggleVoice}
                                className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${voiceEnabled ? 'text-purple-600' : 'text-gray-400'}`}
                                title={voiceEnabled ? "Mute Coaching" : "Enable Voice Coaching"}
                            >
                                {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                            </button>
                        </div>

                        {isPerfect ? (
                            <p className="text-green-700 text-sm">
                                Excellent! Hold this position steady.
                            </p>
                        ) : poseData?.detected ? (
                            <ul className="space-y-2">
                                {feedback.map((msg, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                        <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
                                        <span>{msg}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 text-sm">
                                Waiting for pose detection...
                            </p>
                        )}

                        {/* Show backend feedback if available */}
                        {poseData?.feedback && poseData.feedback.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Additional Tips:</p>
                                {poseData.feedback.map((tip, idx) => (
                                    <p key={idx} className="text-sm text-gray-600">• {tip}</p>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
