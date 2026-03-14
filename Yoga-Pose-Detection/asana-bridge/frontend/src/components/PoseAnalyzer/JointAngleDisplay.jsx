import { useMemo } from 'react';
import { formatAngle, getAngleQuality } from '../../utils/angleCalculations';

export default function JointAngleDisplay({ jointName, currentAngle, targetAngle, showTarget = true }) {
    const { quality, color, deviation } = useMemo(() => {
        if (targetAngle !== null && targetAngle !== undefined) {
            return getAngleQuality(currentAngle, targetAngle);
        }
        return { quality: 'unknown', color: '#9ca3af', deviation: 0 };
    }, [currentAngle, targetAngle]);

    const displayName = jointName.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    return (
        <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 flex-1">
                {/* Color Indicator */}
                <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                />

                {/* Joint Name */}
                <span className="text-sm font-medium text-gray-700 flex-grow">
                    {displayName}
                </span>
            </div>

            {/* Angle Values */}
            <div className="flex items-center gap-2">
                <span
                    className="text-lg font-bold font-mono"
                    style={{ color }}
                >
                    {formatAngle(currentAngle)}
                </span>

                {showTarget && targetAngle !== null && (
                    <>
                        <span className="text-xs text-gray-400">/</span>
                        <span className="text-sm text-gray-500 font-mono">
                            {formatAngle(targetAngle)}
                        </span>
                    </>
                )}
            </div>

            {/* Quality Badge */}
            {quality !== 'unknown' && (
                <div className="ml-3">
                    {quality === 'perfect' && <span className="text-green-600 text-xs">✓</span>}
                    {quality === 'poor' && <span className="text-red-600 text-xs">✗</span>}
                </div>
            )}
        </div>
    );
}
