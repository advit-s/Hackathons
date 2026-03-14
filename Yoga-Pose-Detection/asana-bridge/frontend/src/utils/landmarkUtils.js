/**
 * Utility functions for landmark processing
 */

// MoveNet pose connections for skeleton drawing (17 keypoints)
export const POSE_CONNECTIONS = [
    // Face
    [0, 1], [0, 2],      // Nose to eyes
    [1, 3], [2, 4],      // Eyes to ears

    // Upper body 
    [5, 6],              // Shoulders
    [5, 7], [7, 9],      // Left arm
    [6, 8], [8, 10],     // Right arm

    // Torso
    [5, 11], [6, 12],    // Shoulder to hip
    [11, 12],            // Hips

    // Lower body
    [11, 13], [13, 15],  // Left leg
    [12, 14], [14, 16],  // Right leg
];

/**
 * Convert normalized landmarks (0-1) to canvas coordinates
 */
export function landmarksToCanvas(landmarks, width, height, flipX = true) {
    if (!landmarks || !Array.isArray(landmarks)) return [];

    return landmarks.map(point => {
        if (!point || point.length < 2) return null;

        const x = flipX ? (1 - point[0]) * width : point[0] * width;
        const y = point[1] * height;

        return { x, y, z: point[2] || 0 };
    }).filter(p => p !== null);
}

/**
 * Draw skeleton on canvas (MoveNet 17 keypoints)
 */
export function drawSkeleton(ctx, landmarks, options = {}) {
    const {
        color = '#00BFFF',
        lineWidth = 3,
        dotRadius = 5,
        opacity = 1
    } = options;

    if (!landmarks || landmarks.length < 17) return;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Draw connections
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [start, end] of POSE_CONNECTIONS) {
        const p1 = landmarks[start];
        const p2 = landmarks[end];

        if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }

    // Draw landmarks
    ctx.fillStyle = color;
    for (const point of landmarks) {
        if (point) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

/**
 * Get score color based on value
 */
export function getScoreColor(score) {
    if (score >= 90) return '#22c55e'; // Green
    if (score >= 75) return '#84cc16'; // Lime
    if (score >= 50) return '#eab308'; // Yellow
    if (score >= 25) return '#f97316'; // Orange
    return '#ef4444'; // Red
}

/**
 * Get score label
 */
export function getScoreLabel(score) {
    if (score >= 90) return 'Perfect!';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Keep Going';
    return 'Needs Work';
}

/**
 * Format feedback messages
 */
export function formatFeedback(feedback) {
    if (!feedback || feedback.length === 0) {
        return ['Ready to analyze your pose'];
    }
    return feedback;
}
