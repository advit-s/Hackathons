import { useState } from 'react';
import { Users, TrendingUp, FileText, Download } from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

// Mock patient data
const mockPatients = [
    { id: 1, name: 'John Doe', age: 45, condition: 'Post-surgery rehabilitation', sessions: 12 },
    { id: 2, name: 'Jane Smith', age: 38, condition: 'Chronic back pain', sessions: 24 },
    { id: 3, name: 'Mike Johnson', age: 52, condition: 'Arthritis management', sessions: 8 },
];

// Mock ROM data
const mockROMData = {
    1: {
        hip: [
            { date: '2024-01-01', angle: 95 },
            { date: '2024-01-08', angle: 102 },
            { date: '2024-01-15', angle: 110 },
            { date: '2024-01-22', angle: 118 },
        ],
        knee: [
            { date: '2024-01-01', angle: 125 },
            { date: '2024-01-08', angle: 132 },
            { date: '2024-01-15', angle: 138 },
            { date: '2024-01-22', angle: 145 },
        ]
    }
};

function PatientCard({ patient, onSelect, isSelected }) {
    return (
        <Card
            hover
            onClick={() => onSelect(patient)}
            className={isSelected ? 'ring-2 ring-purple-500' : ''}
        >
            <CardBody className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">
                                {patient.name.split(' ').map(n => n[0]).join('')}
                            </span>
                        </div>
                        <div>
                            <div className="font-semibold text-gray-800">{patient.name}</div>
                            <div className="text-sm text-gray-500">Age: {patient.age}</div>
                        </div>
                    </div>
                    <Badge variant="info">{patient.sessions} sessions</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-2">{patient.condition}</p>
            </CardBody>
        </Card>
    );
}

function ROMChart({ joint, data }) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardBody className="text-center py-8">
                    <p className="text-gray-500">No data available</p>
                </CardBody>
            </Card>
        );
    }

    const latest = data[data.length - 1];
    const first = data[0];
    const improvement = latest.angle - first.angle;
    const trendColor = improvement > 0 ? 'text-green-600' : 'text-red-600';

    // Normal range for visualization
    const normalRange = joint === 'hip' ? { min: 110, max: 125 } : { min: 130, max: 145 };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 capitalize">
                        {joint} Flexion
                    </h3>
                    <Badge variant={improvement > 0 ? 'success' : 'warning'}>
                        {improvement > 0 ? '+' : ''}{improvement}°
                    </Badge>
                </div>
            </CardHeader>
            <CardBody className="space-y-4">
                {/* Simple bar visualization */}
                <div className="space-y-2">
                    {data.map((point, idx) => {
                        const percentage = ((point.angle - 50) / 100) * 100;
                        const isInRange = point.angle >= normalRange.min && point.angle <= normalRange.max;

                        return (
                            <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{point.date}</span>
                                    <span className={isInRange ? 'text-green-600 font-semibold' : ''}>
                                        {point.angle}°
                                    </span>
                                </div>
                                <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${isInRange ? 'bg-gradient-to-r from-green-400 to-green-600' :
                                                'bg-gradient-to-r from-yellow-400 to-orange-500'
                                            }`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
                    <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Latest</div>
                        <div className="text-lg font-bold text-gray-800">{latest.angle}°</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Normal Range</div>
                        <div className="text-sm font-semibold text-gray-700">
                            {normalRange.min}-{normalRange.max}°
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Trend</div>
                        <div className={`text-lg font-bold ${trendColor}`}>
                            {improvement > 0 ? '↗' : '↘'} {Math.abs(improvement)}°
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

export default function DoctorDashboard() {
    const [selectedPatient, setSelectedPatient] = useState(mockPatients[0]);
    const romData = mockROMData[selectedPatient.id];

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                        🩺 Doctor's Clinical Dashboard
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Range of Motion analysis and patient progress tracking
                    </p>
                </div>

                {/* Stats Row */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <Card>
                        <CardBody className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-xl">
                                    <Users className="text-blue-600" size={28} />
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-gray-800">{mockPatients.length}</div>
                                    <div className="text-sm text-gray-500">Total Patients</div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 rounded-xl">
                                    <TrendingUp className="text-green-600" size={28} />
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-gray-800">+15°</div>
                                    <div className="text-sm text-gray-500">Avg ROM Improvement</div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 rounded-xl">
                                    <FileText className="text-purple-600" size={28} />
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-gray-800">44</div>
                                    <div className="text-sm text-gray-500">Total Sessions</div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Patient List - 1/3 width */}
                    <div className="space-y-3">
                        <Card>
                            <CardHeader>
                                <h3 className="font-semibold text-gray-800">Patient List</h3>
                            </CardHeader>
                        </Card>

                        {mockPatients.map(patient => (
                            <PatientCard
                                key={patient.id}
                                patient={patient}
                                onSelect={setSelectedPatient}
                                isSelected={selectedPatient.id === patient.id}
                            />
                        ))}
                    </div>

                    {/* ROM Analysis - 2/3 width */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Patient Info Header */}
                        <Card>
                            <CardBody>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800 mb-1">
                                            {selectedPatient.name}
                                        </h2>
                                        <p className="text-gray-600">{selectedPatient.condition}</p>
                                    </div>
                                    <Button variant="primary" icon={Download}>
                                        Export Report
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>

                        {/* ROM Charts */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <ROMChart joint="hip" data={romData?.hip} />
                            <ROMChart joint="knee" data={romData?.knee} />
                        </div>

                        {/* Clinical Notes */}
                        <Card>
                            <CardHeader>
                                <h3 className="font-semibold text-gray-800">Clinical Notes</h3>
                            </CardHeader>
                            <CardBody>
                                <textarea
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
                                    placeholder="Add clinical observations, treatment notes, or recommendations..."
                                />
                                <div className="mt-3 flex justify-end">
                                    <Button variant="primary">Save Notes</Button>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
