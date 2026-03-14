import { useRef, useEffect, useState, useCallback } from 'react';
import {
    landmarksToCanvas,
    drawSkeleton,
    getScoreColor,
    getScoreLabel,
    formatFeedback
} from '../utils/landmarkUtils';

export default function CameraView({
    poseData,
    onFrame,
    isStreaming,
    frameInterval = 142
}) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const [cameraReady, setCameraReady] = useState(false);

    // Start camera
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setCameraReady(true);
            }
        } catch (error) {
            console.error('Camera error:', error);
        }
    }, []);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setCameraReady(false);
    }, []);

    // Capture and send frames
    useEffect(() => {
        if (!isStreaming || !cameraReady || !onFrame) return;

        const captureFrame = () => {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');

            if (!video || video.readyState < 2) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            canvas.toBlob((blob) => {
                if (blob) onFrame(blob);
            }, 'image/jpeg', 0.8);
        };

        timerRef.current = setInterval(captureFrame, frameInterval);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isStreaming, cameraReady, onFrame, frameInterval]);

    // Draw skeleton overlay
    useEffect(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!poseData?.detected) return;

        const width = canvas.width;
        const height = canvas.height;

        // Draw ghost skeleton (ideal pose)
        if (poseData.ghost_landmarks) {
            const ghostPoints = landmarksToCanvas(poseData.ghost_landmarks, width, height);
            drawSkeleton(ctx, ghostPoints, {
                color: '#22c55e',
                lineWidth: 4,
                dotRadius: 6,
                opacity: 0.4
            });
        }

        // Draw user skeleton
        if (poseData.user_landmarks) {
            const userPoints = landmarksToCanvas(poseData.user_landmarks, width, height);
            drawSkeleton(ctx, userPoints, {
                color: '#00BFFF',
                lineWidth: 3,
                dotRadius: 5,
                opacity: 1
            });
        }
    }, [poseData]);

    // Auto-start camera
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

    const score = poseData?.score ?? 0;
    const scoreColor = getScoreColor(score);
    const scoreLabel = getScoreLabel(score);
    const feedback = formatFeedback(poseData?.feedback);

    return (
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden">
            {/* Video feed */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
            />

            {/* Skeleton overlay canvas */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Score display */}
            <div className="absolute top-4 right-4 text-center">
                <div
                    className={`
            w-24 h-24 rounded-full flex items-center justify-center
            bg-white/90 shadow-lg backdrop-blur
            ${score >= 90 ? 'score-perfect' : ''}
          `}
                >
                    <div>
                        <div
                            className="text-3xl font-bold"
                            style={{ color: scoreColor }}
                        >
                            {Math.round(score)}
                        </div>
                        <div className="text-xs text-gray-500">{scoreLabel}</div>
                    </div>
                </div>
            </div>

            {/* Feedback panel */}
            <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-white/90 backdrop-blur rounded-lg p-4 shadow-lg">
                    <ul className="space-y-1">
                        {feedback.map((msg, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                {msg}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Balance warning */}
            {poseData?.balance_warning && (
                <div className="absolute top-4 left-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
                    {poseData.balance_warning}
                </div>
            )}

            {/* Fall detection */}
            {poseData?.fall_detected && (
                <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                    <div className="text-white text-center p-8">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold mb-2">Are you okay?</h2>
                        <p className="mb-4">{poseData.fall_message}</p>
                        <button className="px-6 py-3 bg-white text-red-600 rounded-lg font-medium">
                            I'm Fine
                        </button>
                    </div>
                </div>
            )}

            {/* Camera not ready */}
            {!cameraReady && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <div className="text-white text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4" />
                        <p>Starting camera...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
