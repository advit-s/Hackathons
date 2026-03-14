import { useState } from 'react';
import {
    Users, Play, Star, Clock, Plus, Eye, MessageSquare,
    Activity, List, Calendar
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';

// Mock data
const mockPatients = [
    { id: 1, name: 'John Doe', lastSession: '2 hours ago', avgScore: 78, sessions: 12, status: 'active' },
    { id: 2, name: 'Jane Smith', lastSession: '1 day ago', avgScore: 85, sessions: 24, status: 'active' },
    { id: 3, name: 'Mike Johnson', lastSession: '3 days ago', avgScore: 62, sessions: 8, status: 'inactive' },
];

const mockSessions = [
    { id: 1, patient: 'John Doe', patientId: 1, pose: 'Warrior II', score: 82, date: '2024-01-24', duration: '5 min' },
    { id: 2, patient: 'Jane Smith', patientId: 2, pose: 'Tree Pose', score: 91, date: '2024-01-23', duration: '6 min' },
    { id: 3, patient: 'Mike Johnson', patientId: 3, pose: 'Downward Dog', score: 68, date: '2024-01-21', duration: '4 min' },
];

function StatsCard({ icon: Icon, value, label, color }) {
    return (
        <Card hover>
            <CardBody className="p-6">
                <div className="flex items-center gap-4">
                    <div className={`p-3 bg-${color}-100 rounded-xl`}>
                        <Icon className={`text-${color}-600`} size={28} />
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-800">{value}</div>
                        <div className="text-sm text-gray-500">{label}</div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

function PatientsTab({ patients }) {
    return (
        <div className="space-y-3">
            {
                patients.map(patient => (
                    <Card key={patient.id} hover>
                        <CardBody className="p-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                        <span className="text-white font-bold text-lg">
                                            {patient.name.split(' ').map(n => n[0]).join('')}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <div className="font-semibold text-gray-800 text-lg">{patient.name}</div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                            <Clock size={14} />
                                            {patient.lastSession}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-600">{patient.avgScore}</div>
                                        <div className="text-xs text-gray-500">Avg Score</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-700">{patient.sessions}</div>
                                        <div className="text-xs text-gray-500">Sessions</div>
                                    </div>
                                    <Badge variant={patient.status === 'active' ? 'success' : 'default'}>
                                        {patient.status}
                                    </Badge>

                                    <Button variant="ghost" size="sm">
                                        View Details
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                ))
            }
        </div>
    );
}

function SessionsTab({ sessions }) {
    const [selectedSession, setSelectedSession] = useState(null);

    return (
        <>
            <div className="space-y-3">
                {
                    sessions.map(session => (
                        <Card key={session.id} hover>
                            <CardBody className="p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-800">{session.patient}</div>
                                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                                            <span>{session.pose}</span>
                                            <span>•</span>
                                            <span>{session.duration}</span>
                                            <span>•</span>
                                            <span>{session.date}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant={
                                                session.score >= 85 ? 'success' :
                                                    session.score >= 70 ? 'info' :
                                                        session.score >= 50 ? 'warning' : 'danger'
                                            }
                                            size="lg"
                                        >
                                            Score: {session.score}
                                        </Badge>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            icon={Eye}
                                            onClick={() => setSelectedSession(session)}
                                        >
                                            Replay
                                        </Button>

                                        <Button variant="ghost" size="sm" icon={MessageSquare}>
                                            Review
                                        </Button>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))
                }
            </div>

            {/* Replay Modal */}
            {
                selectedSession && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedSession(null)}>
                        <Card className="max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-gray-800">Session Replay</h3>
                                    <Button variant="ghost" onClick={() => setSelectedSession(null)}>
                                        Close
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardBody className="space-y-4">
                                <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg flex items-center justify-center">
                                    <p className="text-gray-400">📹 Skeletal replay playback would appear here</p>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-sm text-gray-500 mb-1">Patient</div>
                                        <div className="font-semibold">{selectedSession.patient}</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-sm text-gray-500 mb-1">Pose</div>
                                        <div className="font-semibold">{selectedSession.pose}</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-sm text-gray-500 mb-1">Score</div>
                                        <div className="font-semibold text-purple-600">{selectedSession.score}/100</div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                )
            }
        </>
    );
}

function RoutinesTab() {
    return (
        <Card>
            <CardBody className="text-center py-16">
                <List className="mx-auto text-gray-300 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-600 mb-3">Routine Builder</h3>
                <p className="text-gray-500 mb-6">
                    Create custom yoga sequences for your patients
                </p>
                <Button variant="primary" icon={Plus} size="lg">
                    Create Your First Routine
                </Button>
            </CardBody>
        </Card>
    );
}

export default function TrainerDashboard() {
    const [patients] = useState(mockPatients);
    const [sessions] = useState(mockSessions);

    const avgScore = Math.round(
        patients.reduce((sum, p) => sum + p.avgScore, 0) / patients.length
    );

    const tabs = [
        {
            label: 'Patients',
            icon: <Users size={18} />,
            content: <PatientsTab patients={patients} />
        },
        {
            label: 'Sessions',
            icon: <Activity size={18} />,
            content: <SessionsTab sessions={sessions} />
        },
        {
            label: 'Routines',
            icon: <Calendar size={18} />,
            content: <RoutinesTab />
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        👨‍🏫 Trainer Dashboard
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Manage patients, review sessions, and create routines
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <StatsCard icon={Users} value={patients.length} label="Total Patients" color="blue" />
                    <StatsCard icon={Play} value={sessions.length} label="Total Sessions" color="green" />
                    <StatsCard icon={Star} value={avgScore} label="Avg Score" color="yellow" />
                    <StatsCard icon={Clock} value="5" label="Active Routines" color="purple" />
                </div>

                {/* Tabbed Interface */}
                <Tabs tabs={tabs} defaultTab={0} />
            </div>
        </div>
    );
}
