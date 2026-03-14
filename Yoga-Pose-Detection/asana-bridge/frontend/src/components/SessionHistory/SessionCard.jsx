import { Clock, Award, Calendar } from 'lucide-react';
import Card, { CardBody } from '../ui/Card';
import Badge from '../ui/Badge';

export default function SessionCard({ session, onClick }) {
    const { id, pose, score, date, duration, status = 'completed' } = session;

    const getScoreVariant = (score) => {
        if (score >= 85) return 'success';
        if (score >= 70) return 'info';
        if (score >= 50) return 'warning';
        return 'danger';
    };

    const getScoreEmoji = (score) => {
        if (score >= 85) return '🔥';
        if (score >= 70) return '✅';
        if (score >= 50) return '⚠️';
        return '📈';
    };

    return (
        <Card hover onClick={onClick} className="cursor-pointer">
            <CardBody className="p-5">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-800">{pose}</h3>
                            <Badge variant={status === 'completed' ? 'success' : 'warning'} size="sm">
                                {status}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                <span>{date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock size={14} />
                                <span>{duration}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-center">
                            <div className="flex items-center gap-1">
                                <span className="text-2xl">{getScoreEmoji(score)}</span>
                                <Badge variant={getScoreVariant(score)} size="lg">
                                    {score}/100
                                </Badge>
                            </div>
                        </div>

                        <div className="px-3 py-2 bg-gray-50 rounded-lg">
                            <Award className="text-purple-600" size={24} />
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
