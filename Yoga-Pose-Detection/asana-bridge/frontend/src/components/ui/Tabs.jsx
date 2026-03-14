import { useState } from 'react';

export default function Tabs({ tabs, defaultTab = 0, onChange, className = '' }) {
    const [activeTab, setActiveTab] = useState(defaultTab);

    const handleTabChange = (index) => {
        setActiveTab(index);
        if (onChange) onChange(index);
    };

    return (
        <div className={className}>
            {/* Tab Headers */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6">
                {tabs.map((tab, index) => (
                    <button
                        key={index}
                        onClick={() => handleTabChange(index)}
                        className={`
                            flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200
                            ${activeTab === index
                                ? 'bg-white text-purple-700 shadow-md'
                                : 'text-gray-600 hover:text-gray-900'
                            }
                        `}
                    >
                        {tab.icon && (
                            <span className="inline-flex items-center gap-2">
                                {tab.icon}
                                {tab.label}
                            </span>
                        )}
                        {!tab.icon && tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div>
                {tabs[activeTab]?.content}
            </div>
        </div>
    );
}
