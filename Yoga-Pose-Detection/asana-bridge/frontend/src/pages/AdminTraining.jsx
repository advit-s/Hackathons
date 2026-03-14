import { useState } from 'react';
import {
    Upload, Play, CheckCircle, XCircle, Loader,
    FolderOpen, Settings, AlertTriangle
} from 'lucide-react';

export default function AdminTraining() {
    const [datasetPath, setDatasetPath] = useState('');
    const [modelName, setModelName] = useState('pose_classifier');
    const [epochs, setEpochs] = useState(50);
    const [batchSize, setBatchSize] = useState(32);
    const [training, setTraining] = useState(false);
    const [progress, setProgress] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const startTraining = async () => {
        setTraining(true);
        setError(null);
        setResult(null);
        setProgress({ status: 'Starting...', epoch: 0, total_epochs: epochs });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/admin/train', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    dataset_path: datasetPath,
                    model_name: modelName,
                    epochs: epochs,
                    batch_size: batchSize
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Training failed');
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setTraining(false);
            setProgress(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <Settings className="text-red-600" />
                    Admin Training Portal
                </h1>
                <p className="text-gray-500">Train custom pose classification models</p>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                    <h3 className="font-medium text-yellow-800">Admin Access Required</h3>
                    <p className="text-sm text-yellow-700">
                        This page is for administrators only. Training a new model will replace the current classifier.
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Configuration */}
                <div className="bg-white rounded-xl p-6 shadow-md">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FolderOpen size={20} className="text-gray-400" />
                        Training Configuration
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Dataset Path
                            </label>
                            <input
                                type="text"
                                value={datasetPath}
                                onChange={(e) => setDatasetPath(e.target.value)}
                                placeholder="./yoga_dataset"
                                disabled={training}
                                className="w-full px-4 py-2 border rounded-lg disabled:opacity-50"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Folder with subfolders for each pose class
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Model Name
                            </label>
                            <input
                                type="text"
                                value={modelName}
                                onChange={(e) => setModelName(e.target.value)}
                                disabled={training}
                                className="w-full px-4 py-2 border rounded-lg disabled:opacity-50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Epochs
                                </label>
                                <input
                                    type="number"
                                    value={epochs}
                                    onChange={(e) => setEpochs(Number(e.target.value))}
                                    min={1}
                                    max={200}
                                    disabled={training}
                                    className="w-full px-4 py-2 border rounded-lg disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Batch Size
                                </label>
                                <input
                                    type="number"
                                    value={batchSize}
                                    onChange={(e) => setBatchSize(Number(e.target.value))}
                                    min={8}
                                    max={128}
                                    disabled={training}
                                    className="w-full px-4 py-2 border rounded-lg disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <button
                            onClick={startTraining}
                            disabled={training || !datasetPath}
                            className={`
                w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2
                ${training
                                    ? 'bg-gray-300 text-gray-500'
                                    : 'bg-red-600 hover:bg-red-700 text-white'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
                        >
                            {training ? (
                                <>
                                    <Loader size={20} className="animate-spin" />
                                    Training in Progress...
                                </>
                            ) : (
                                <>
                                    <Play size={20} />
                                    Start Training
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Status */}
                <div className="space-y-4">
                    {/* Progress */}
                    {progress && (
                        <div className="bg-white rounded-xl p-6 shadow-md">
                            <h3 className="font-medium mb-3">Training Progress</h3>
                            <div className="mb-2 flex justify-between text-sm">
                                <span className="text-gray-500">{progress.status}</span>
                                <span className="font-medium">
                                    Epoch {progress.epoch}/{progress.total_epochs}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(progress.epoch / progress.total_epochs) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                            <div className="flex items-center gap-2 text-red-600 mb-2">
                                <XCircle size={20} />
                                <span className="font-medium">Training Failed</span>
                            </div>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Success */}
                    {result && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                            <div className="flex items-center gap-2 text-green-600 mb-3">
                                <CheckCircle size={20} />
                                <span className="font-medium">Training Complete!</span>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Model Path:</span>
                                    <span className="font-mono text-gray-800">{result.model_path}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Accuracy:</span>
                                    <span className="font-medium text-green-700">
                                        {(result.accuracy * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Classes:</span>
                                    <span className="font-medium">{result.num_classes}</span>
                                </div>
                                <div className="mt-3 pt-3 border-t">
                                    <span className="text-gray-600">Detected Poses:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {result.class_names?.map(name => (
                                            <span
                                                key={name}
                                                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                                            >
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="bg-gray-50 rounded-xl p-6">
                        <h3 className="font-medium text-gray-800 mb-3">📋 Dataset Structure</h3>
                        <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
                            {`yoga_dataset/
├── warrior_2/
│   ├── img001.jpg
│   ├── img002.jpg
│   └── ...
├── tree_pose/
│   └── ...
├── downward_dog/
│   └── ...
└── mountain_pose/
    └── ...`}
                        </pre>
                        <p className="text-xs text-gray-500 mt-3">
                            Each subfolder represents a pose class. Add 20+ images per class for best results.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
