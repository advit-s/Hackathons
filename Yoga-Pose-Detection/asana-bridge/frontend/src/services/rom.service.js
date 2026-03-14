import api from './api';

const romService = {
    async getROMHistory(patientId, jointName = null) {
        const response = await api.get(`/api/rom/${patientId}`, {
            params: jointName ? { joint_name: jointName } : {},
        });
        return response.data;
    },

    async recordROM(patientId, jointName, angleDegrees) {
        // Note: This endpoint needs to be added to backend
        try {
            const response = await api.post('/api/rom', {
                patient_id: patientId,
                joint_name: jointName,
                angle_degrees: angleDegrees,
            });
            return response.data;
        } catch (error) {
            console.warn('ROM recording endpoint not available yet');
            throw error;
        }
    },
};

export default romService;
