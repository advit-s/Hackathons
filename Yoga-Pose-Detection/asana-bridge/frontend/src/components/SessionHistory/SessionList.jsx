import { useState } from 'react';
import SessionCard from './SessionCard';
import Card, { CardBody } from '../ui/Card';
import Button from '../ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function SessionList({ sessions = [], onSessionClick }) {
    const [currentPage, setCurrentPage] = useState(1);
    const sessionsPerPage = 5;

    // Calculate pagination
    const indexOfLastSession = currentPage * sessionsPerPage;
    const indexOfFirstSession = indexOfLastSession - sessionsPerPage;
    const currentSessions = sessions.slice(indexOfFirstSession, indexOfLastSession);
    const totalPages = Math.ceil(sessions.length / sessionsPerPage);

    if (sessions.length === 0) {
        return (
            <Card>
                <CardBody className="text-center py-16">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No Sessions Yet</h3>
                    <p className="text-gray-500 mb-6">
                        Complete your first practice session to see it here
                    </p>
                    <p className="text-sm text-gray-400">
                        Your session history will include scores, duration, and replay options
                    </p>
                </CardBody>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Session Cards */}
            <div className="space-y-3">
                {currentSessions.map((session) => (
                    <SessionCard
                        key={session.id}
                        session={session}
                        onClick={() => onSessionClick && onSessionClick(session)}
                    />
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-gray-600">
                        Showing {indexOfFirstSession + 1}-{Math.min(indexOfLastSession, sessions.length)} of {sessions.length} sessions
                    </p>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            icon={ChevronLeft}
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        >
                            Previous
                        </Button>

                        <span className="px-3 py-1 text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            icon={ChevronRight}
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
