import { Component } from 'react';
import Card, { CardBody } from './ui/Card';
import Button from './ui/Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
                    <Card className="max-w-2xl w-full">
                        <CardBody className="p-8 text-center">
                            <AlertTriangle className="mx-auto text-red-500 mb-4" size={64} />
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">
                                Oops! Something went wrong
                            </h1>
                            <p className="text-gray-600 mb-6">
                                We encountered an unexpected error. Don't worry, your data is safe.
                            </p>

                            {this.state.error && (
                                <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
                                    <p className="font-mono text-sm text-red-600">
                                        {this.state.error.toString()}
                                    </p>
                                </div>
                            )}

                            <Button
                                variant="primary"
                                size="lg"
                                icon={RefreshCw}
                                onClick={this.handleReset}
                            >
                                Reload Application
                            </Button>
                        </CardBody>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
