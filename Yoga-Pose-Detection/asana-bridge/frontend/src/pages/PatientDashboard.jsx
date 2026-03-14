import { useState, useCallback } from 'react';
import { Play, Square, History, TrendingUp, Activity } from 'lucide-react';
import CameraView from '../components/CameraView';
import { useWebSocket } from '../hooks/useWebSocket';
import Tabs from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import AngleTable from '../components/PoseAnalyzer/AngleTable';
import RealTimeFeedback from '../components/PoseAnalyzer/RealTimeFeedback';
import SessionList from '../components/SessionHistory/SessionList';
import ProgressChart from '../components/Charts/ProgressChart';

// 6 professionally trained yoga poses
const POSES = [
    { id: 'chair', name: 'Chair Pose', emoji: '🪑', difficulty: 'Beginner' },
    { id: 'cobra', name: 'Cobra Pose', emoji: '🐍', difficulty: 'Beginner' },
    { id: 'downdog', name: 'Downward Dog', emoji: '🐕', difficulty: 'Beginner' },
    { id: 'tree', name: 'Tree Pose', emoji: '🌳', difficulty: 'Intermediate' },
    { id: 'warrior', name: 'Warrior II', emoji: '⚔️', difficulty: 'Beginner' },
    { id: 'plank', name: 'Plank Pose', emoji: '💪', difficulty: 'Beginner' },
];

function PracticeTab({ selectedPose, setSelectedPose, isActive, setIsActive, connected, poseData, connect, disconnect, sendFrame, frameInterval }) {
    const handleStart = useCallback(() => {
        connect();
        setIsActive(true);
    }, [connect, setIsActive]);

    const handleStop = useCallback(() => {
        disconnect();
        setIsActive(false);
    }, [disconnect, setIsActive]);

    const handleFrame = useCallback((blob) => {
        sendFrame(blob);
    }, [sendFrame]);

    return (
        <div className="grid lg:grid-cols-3 gap-6">
            {/* Main camera view - 2/3 width */}
            <div className="lg:col-span-2 space-y-4">
                {/* Camera */}
                <div className="aspect-video w-full">
                    <CameraView
                        poseData={poseData}
                        onFrame={isActive ? handleFrame : null}
                        isStreaming={isActive && connected}
                        frameInterval={frameInterval}
                    />
                </div>

                {/* Real-time Feedback */}
                <RealTimeFeedback poseData={poseData} poseName={selectedPose.id} />
            </div>

            {/* Right sidebar - 1/3 width */}
            <div className="space-y-4">
                {/* Pose Selector */}
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            {selectedPose.emoji} Select Pose
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <select
                            value={selectedPose.id}
                            onChange={(e) => setSelectedPose(POSES.find(p => p.id === e.target.value))}
                            disabled={isActive}
                            className="w-full px-4 py-2.5 border-2 border-purple-200 rounded-lg appearance-none bg-white text-gray-900 disabled:opacity-50 focus:ring-2 focus:ring-purple-500 font-medium"
                        >
                            {POSES.map(pose => (
                                <option key={pose.id} value={pose.id}>
                                    {pose.emoji} {pose.name}
                                </option>
                            ))}
                        </select>

                        <div className="flex items-center justify-between text-sm">
                            <Badge variant={selectedPose.difficulty === 'Beginner' ? 'success' : 'warning'}>
                                {selectedPose.difficulty}
                            </Badge>
                            <Badge variant={connected ? 'success' : 'default'}>
                                {connected ? '🟢 Live' : '⚪ Ready'}
                            </Badge>
                        </div>

                        <Button
                            onClick={isActive ? handleStop : handleStart}
                            variant={isActive ? 'danger' : 'success'}
                            size="lg"
                            className="w-full"
                            icon={isActive ? Square : Play}
                        >
                            {isActive ? 'Stop Session' : 'Start Session'}
                        </Button>
                    </CardBody>
                </Card>

                {/* Live Score */}
                {poseData?.detected && (
                    <Card>
                        <CardBody>
                            <div className="text-center">
                                <div className="text-5xl font-bold mb-2" style={{
                                    color: poseData.score >= 85 ? '#22c55e' :
                                        poseData.score >= 70 ? '#3b82f6' :
                                            poseData.score >= 50 ? '#f59e0b' : '#ef4444'
                                }}>
                                    {Math.round(poseData.score)}
                                    <span className="text-2xl text-gray-400">/100</span>
                                </div>
                                <Badge
                                    variant={
                                        poseData.score >= 85 ? 'success' :
                                            poseData.score >= 70 ? 'info' :
                                                poseData.score >= 50 ? 'warning' : 'danger'
                                    }
                                    size="lg"
                                >
                                    {poseData.score >= 85 ? '🔥 Perfect!' :
                                        poseData.score >= 70 ? '✅ Good' :
                                            poseData.score >= 50 ? '⚠️ Keep Trying' : '❌ Needs Work'}
                                </Badge>
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* Joint Angles Analyzer */}
                <AngleTable poseData={poseData} poseName={selectedPose.id} />
            </div>
        </div>
    );
}

function HistoryTab() {
    // Mock session data - will be replaced with API call
    const mockSessions = [
        { id: 1, pose: 'Chair Pose (Utkatasana)', score: 85, date: '2024-01-24', duration: '5 min', status: 'completed' },
        { id: 2, pose: 'Tree Pose (Vrikshasana)', score: 78, date: '2024-01-23', duration: '4 min', status: 'completed' },
        { id: 3, pose: 'Warrior II', score: 92, date: '2024-01-22', duration: '6 min', status: 'completed' },
        { id: 4, pose: 'Downward Dog', score: 88, date: '2024-01-21', duration: '5 min', status: 'completed' },
        { id: 5, pose: 'Cobra Pose', score: 72, date: '2024-01-20', duration: '3 min', status: 'completed' },
    ];

    const handleSessionClick = (session) => {
        console.log('View session:', session);
        // TODO: Open session detail modal
    };

    return <SessionList sessions={mockSessions} onSessionClick={handleSessionClick} />;
}

function ProgressTab() {
    // Mock progress data - will be replaced with API call
    const progressData = {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
            {
                label: 'Average Score',
                data: [72, 78, 83, 88],
                borderColor: 'rgb(147, 51, 234)',
                backgroundColor: 'rgba(147, 51, 234, 0.1)',
                tension: 0.4,
                fill: true,
            }
        ]
    };

    const poseBreakdown = {
        labels: ['Chair', 'Tree', 'Warrior', 'Downdog', 'Cobra', 'Plank'],
        datasets: [
            {
                label: 'Best Score',
                data: [85, 78, 92, 88, 72, 81],
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4,
                fill: true,
            }
        ]
    };

    return (
        <div className="space-y-6">
            <ProgressChart data={progressData} title="Overall Progress" />
            <ProgressChart data={poseBreakdown} title="Performance by Pose" />

            {/* Stats Summary */}
            <div className="grid md:grid-cols-3 gap-4">
                <Card>
                    <CardBody className="text-center p-6">
                        <div className="text-4xl font-bold text-purple-600 mb-2">88</div>
                        <div className="text-sm text-gray-600">Current Average</div>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="text-center p-6">
                        <div className="text-4xl font-bold text-green-600 mb-2">+16</div>
                        <div className="text-sm text-gray-600">Improvement</div>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="text-center p-6">
                        <div className="text-4xl font-bold text-blue-600 mb-2">5</div>
                        <div className="text-sm text-gray-600">Total Sessions</div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}

export default function PatientDashboard() {
    const [selectedPose, setSelectedPose] = useState(POSES[0]);
    const [sessionId] = useState(() => Date.now());
    const [isActive, setIsActive] = useState(false);

    const {
        connected,
        poseData,
        connect,
        disconnect,
        sendFrame,
        frameInterval
    } = useWebSocket(sessionId, selectedPose.id);

    const tabs = [
        {
            label: 'Practice',
            icon: <Activity size={18} />,
            content: (
                <PracticeTab
                    selectedPose={selectedPose}
                    setSelectedPose={setSelectedPose}
                    isActive={isActive}
                    setIsActive={setIsActive}
                    connected={connected}
                    poseData={poseData}
                    sessionId={sessionId}
                    connect={connect}
                    disconnect={disconnect}
                    sendFrame={sendFrame}
                    frameInterval={frameInterval}
                />
            )
        },
        {
            label: 'History',
            icon: <History size={18} />,
            content: <HistoryTab />
        },
        {
            label: 'Progress',
            icon: <TrendingUp size={18} />,
            content: <ProgressTab />
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        🧘 Asana Practice Studio
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Real-time pose analysis with AI coaching
                    </p>
                </div>

                {/* Tabbed Interface */}
                <Tabs tabs={tabs} defaultTab={0} />
            </div>
        </div>
    );
}
