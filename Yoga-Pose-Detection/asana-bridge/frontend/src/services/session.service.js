import api from './api';

const sessionService = {
    async createSession(routineId = null) {
        const response = await api.post('/api/sessions', {
            routine_id: routineId,
        });
        return response.data;
    },

    async getSessionReplay(sessionId) {
        const response = await api.get(`/api/sessions/${sessionId}/replay`);
        return response.data;
    },

    async getUserSessions(patientId, limit = 20) {
        // Note: This endpoint needs to be added to backend
        try {
            const response = await api.get(`/api/sessions`, {
                params: { patient_id: patientId, limit },
            });
            return response.data;
        } catch (error) {
            console.warn('Session list endpoint not available yet, using mock data');
            // Return mock data for now
            return generateMockSessions(limit);
        }
    },
};

function generateMockSessions(limit) {
    const poses = ['Chair Pose', 'Tree Pose', 'Warrior II', 'Downward Dog', 'Cobra Pose', 'Plank Pose'];
    const sessions = [];

    for (let i = 0; i < limit; i++) {
        const daysAgo = i;
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        sessions.push({
            id: i + 1,
            pose: poses[i % poses.length],
            score: Math.floor(Math.random() * 30) + 70, // 70-100
            date: date.toISOString().split('T')[0],
            duration: `${Math.floor(Math.random() * 3) + 3} min`,
            status: 'completed',
        });
    }

    return sessions;
}

export default sessionService;
