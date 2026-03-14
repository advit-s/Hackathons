/**
 * Angle Calculation Utilities for MoveNet
 * Calculates joint angles from 17-keypoint MoveNet landmarks
 */

/**
 * Calculate angle between three points (A-B-C where B is the vertex)
 * @param {Object} pointA - {x, y, z}
 * @param {Object} pointB - {x, y, z} (vertex)
 * @param {Object} pointC - {x, y, z}
 * @returns {number} Angle in degrees (0-180)
 */
export function calculateAngle(pointA, pointB, pointC) {
    const vectorBA = {
        x: pointA.x - pointB.x,
        y: pointA.y - pointB.y,
        z: (pointA.z || 0) - (pointB.z || 0)
    };

    const vectorBC = {
        x: pointC.x - pointB.x,
        y: pointC.y - pointB.y,
        z: (pointC.z || 0) - (pointB.z || 0)
    };

    const dotProduct =
        vectorBA.x * vectorBC.x +
        vectorBA.y * vectorBC.y +
        vectorBA.z * vectorBC.z;

    const magnitudeBA = Math.sqrt(
        vectorBA.x ** 2 + vectorBA.y ** 2 + vectorBA.z ** 2
    );

    const magnitudeBC = Math.sqrt(
        vectorBC.x ** 2 + vectorBC.y ** 2 + vectorBC.z ** 2
    );

    if (magnitudeBA === 0 || magnitudeBC === 0) return 0;

    const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    const angleRadians = Math.acos(clampedCos);
    const angleDegrees = (angleRadians * 180) / Math.PI;

    return angleDegrees;
}

/**
 * MoveNet keypoint indices (17 keypoints)
 */
export const MOVENET_KEYPOINTS = {
    NOSE: 0,
    LEFT_EYE: 1,
    RIGHT_EYE: 2,
    LEFT_EAR: 3,
    RIGHT_EAR: 4,
    LEFT_SHOULDER: 5,
    RIGHT_SHOULDER: 6,
    LEFT_ELBOW: 7,
    RIGHT_ELBOW: 8,
    LEFT_WRIST: 9,
    RIGHT_WRIST: 10,
    LEFT_HIP: 11,
    RIGHT_HIP: 12,
    LEFT_KNEE: 13,
    RIGHT_KNEE: 14,
    LEFT_ANKLE: 15,
    RIGHT_ANKLE: 16
};

/**
 * Calculate all body angles from MoveNet landmarks
 * @param {Array} landmarks - Array of [x, y, z] coordinates (17 keypoints)
 * @returns {Object} Dictionary of joint angles
 */
export function calculateBodyAngles(landmarks) {
    if (!landmarks || landmarks.length < 17) {
        return {};
    }

    const kp = MOVENET_KEYPOINTS;

    // Convert landmarks array to point objects
    const points = landmarks.map(([x, y, z = 0]) => ({ x, y, z }));

    return {
        // Arms
        left_elbow: calculateAngle(
            points[kp.LEFT_SHOULDER],
            points[kp.LEFT_ELBOW],
            points[kp.LEFT_WRIST]
        ),
        right_elbow: calculateAngle(
            points[kp.RIGHT_SHOULDER],
            points[kp.RIGHT_ELBOW],
            points[kp.RIGHT_WRIST]
        ),

        // Shoulders
        left_shoulder: calculateAngle(
            points[kp.LEFT_HIP],
            points[kp.LEFT_SHOULDER],
            points[kp.LEFT_ELBOW]
        ),
        right_shoulder: calculateAngle(
            points[kp.RIGHT_HIP],
            points[kp.RIGHT_SHOULDER],
            points[kp.RIGHT_ELBOW]
        ),

        // Hips
        left_hip: calculateAngle(
            points[kp.LEFT_SHOULDER],
            points[kp.LEFT_HIP],
            points[kp.LEFT_KNEE]
        ),
        right_hip: calculateAngle(
            points[kp.RIGHT_SHOULDER],
            points[kp.RIGHT_HIP],
            points[kp.RIGHT_KNEE]
        ),

        // Knees
        left_knee: calculateAngle(
            points[kp.LEFT_HIP],
            points[kp.LEFT_KNEE],
            points[kp.LEFT_ANKLE]
        ),
        right_knee: calculateAngle(
            points[kp.RIGHT_HIP],
            points[kp.RIGHT_KNEE],
            points[kp.RIGHT_ANKLE]
        )
    };
}

/**
 * Get angle quality (perfect/good/needs_work/poor)
 * @param {number} currentAngle - Current joint angle
 * @param {number} targetAngle - Target/ideal angle
 * @returns {Object} {quality: string, color: string, deviation: number}
 */
export function getAngleQuality(currentAngle, targetAngle) {
    const deviation = Math.abs(currentAngle - targetAngle);

    let quality, color;

    if (deviation < 5) {
        quality = 'perfect';
        color = '#22c55e'; // Green
    } else if (deviation < 10) {
        quality = 'good';
        color = '#3b82f6'; // Blue
    } else if (deviation < 15) {
        quality = 'needs_work';
        color = '#f59e0b'; // Yellow
    } else {
        quality = 'poor';
        color = '#ef4444'; // Red
    }

    return { quality, color, deviation };
}

/**
 * Get feedback message for angle deviation
 * @param {string} jointName - Name of joint (e.g., 'left_knee')
 * @param {number} currentAngle - Current angle
 * @param {number} targetAngle - Target angle
 * @returns {string} Feedback message
 */
export function getAngleFeedback(jointName, currentAngle, targetAngle) {
    const deviation = currentAngle - targetAngle;
    const absDeviation = Math.abs(deviation);

    if (absDeviation < 5) {
        return null; // Perfect, no feedback needed
    }

    const jointDisplay = jointName.replace('_', ' ');
    const isJoint = jointName.includes('knee') || jointName.includes('elbow');

    if (deviation > 0) {
        // Current angle is larger than target
        return isJoint
            ? `Bend your ${jointDisplay} more`
            : `Lower your ${jointDisplay}`;
    } else {
        // Current angle is smaller than target
        return isJoint
            ? `Straighten your ${jointDisplay} more`
            : `Raise your ${jointDisplay}`;
    }
}

/**
 * Format angle for display
 * @param {number} angle - Angle in degrees
 * @returns {string} Formatted angle (e.g., "165.2°")
 */
export function formatAngle(angle) {
    return `${Math.round(angle * 10) / 10}°`;
}

/**
 * Check if landmark confidence is sufficient
 * @param {Array} landmarks - Array of [x, y, z, confidence]
 * @param {number} threshold - Minimum confidence (0-1)
 * @returns {boolean}
 */
export function hasGoodConfidence(landmarks, threshold = 0.3) {
    if (!landmarks || landmarks.length === 0) return false;

    const confidences = landmarks.map(lm => lm[3] || lm.confidence || 0);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

    return avgConfidence >= threshold;
}

/**
 * Get ideal angles for common yoga poses
 * @param {string} poseName - Name of pose
 * @returns {Object} Dictionary of ideal angles
 */
export function getIdealAngles(poseName) {
    const ideals = {
        tadasana: {
            left_elbow: 180,
            right_elbow: 180,
            left_shoulder: 90,
            right_shoulder: 90,
            left_hip: 180,
            right_hip: 180,
            left_knee: 180,
            right_knee: 180
        },
        vrikshasana: {
            left_elbow: 140,
            right_elbow: 140,
            left_shoulder: 180,
            right_shoulder: 180,
            left_hip: 180,
            right_hip: 90,
            left_knee: 180,
            right_knee: 45
        },
        chair: {
            left_elbow: 180,
            right_elbow: 180,
            left_shoulder: 180,
            right_shoulder: 180,
            left_hip: 90,
            right_hip: 90,
            left_knee: 90,
            right_knee: 90
        },
        warrior: {
            left_elbow: 180,
            right_elbow: 180,
            left_shoulder: 90,
            right_shoulder: 90,
            left_hip: 90,
            right_hip: 180,
            left_knee: 90,
            right_knee: 180
        },
        plank: {
            left_elbow: 180,
            right_elbow: 180,
            left_shoulder: 90,
            right_shoulder: 90,
            left_hip: 180,
            right_hip: 180,
            left_knee: 180,
            right_knee: 180
        },
        downdog: {
            left_elbow: 180,
            right_elbow: 180,
            left_shoulder: 60,
            right_shoulder: 60,
            left_hip: 120,
            right_hip: 120,
            left_knee: 180,
            right_knee: 180
        },
        cobra: {
            left_elbow: 150,
            right_elbow: 150,
            left_shoulder: 100,
            right_shoulder: 100,
            left_hip: 160,
            right_hip: 160,
            left_knee: 180,
            right_knee: 180
        }
    };

    return ideals[poseName] || ideals.tadasana;
}
