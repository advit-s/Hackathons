import api from './api';

const routineService = {
    async createRoutine(name, description, poses, durationMinutes) {
        const response = await api.post('/api/routines', {
            name,
            description,
            poses,
            duration_minutes: durationMinutes,
        });
        return response.data;
    },

    async getRoutines() {
        const response = await api.get('/api/routines');
        return response.data;
    },
};

export default routineService;
