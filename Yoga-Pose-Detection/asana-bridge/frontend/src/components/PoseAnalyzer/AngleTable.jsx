import { useMemo } from 'react';
import { calculateBodyAngles, getIdealAngles } from '../../utils/angleCalculations';
import JointAngleDisplay from './JointAngleDisplay';
import Card, { CardHeader, CardBody } from '../ui/Card';
import { Activity } from 'lucide-react';

export default function AngleTable({ poseData, poseName }) {
    const { angles, idealAngles } = useMemo(() => {
        if (!poseData?.user_landmarks) {
            return { angles: {}, idealAngles: {} };
        }

        const calculated = calculateBodyAngles(poseData.user_landmarks);
        const ideal = getIdealAngles(poseName || 'tadasana');

        return { angles: calculated, idealAngles: ideal };
    }, [poseData, poseName]);

    const jointGroups = {
        'Upper Body': ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow'],
        'Core & Hips': ['left_hip', 'right_hip'],
        'Lower Body': ['left_knee', 'right_knee']
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Activity className="text-purple-600" size={20} />
                    <h3 className="font-semibold text-gray-800">Joint Angles</h3>
                </div>
            </CardHeader>

            <CardBody className="space-y-4">
                {Object.entries(jointGroups).map(([groupName, joints]) => (
                    <div key={groupName}>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            {groupName}
                        </h4>
                        <div className="space-y-1">
                            {joints.map(joint => {
                                const currentAngle = angles[joint];
                                const targetAngle = idealAngles[joint];

                                if (currentAngle === undefined) return null;

                                return (
                                    <JointAngleDisplay
                                        key={joint}
                                        jointName={joint}
                                        currentAngle={currentAngle}
                                        targetAngle={targetAngle}
                                        showTarget={true}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}

                {Object.keys(angles).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                        <p>No pose detected yet</p>
                        <p className="text-sm mt-1">Start your session to see angles</p>
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
