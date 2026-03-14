import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import {
    Home, User, Users, Stethoscope, Settings, LogOut,
    Activity, Camera, BarChart3, Menu, X
} from 'lucide-react';
import { useState } from 'react';

const roleConfig = {
    patient: {
        color: 'bg-blue-500',
        icon: User,
        label: 'Patient',
        nav: [
            { path: '/patient', icon: Camera, label: 'Practice' },
        ]
    },
    trainer: {
        color: 'bg-green-500',
        icon: Users,
        label: 'Trainer',
        nav: [
            { path: '/trainer', icon: Activity, label: 'Dashboard' },
        ]
    },
    doctor: {
        color: 'bg-purple-500',
        icon: Stethoscope,
        label: 'Doctor',
        nav: [
            { path: '/doctor', icon: BarChart3, label: 'Analytics' },
        ]
    },
    admin: {
        color: 'bg-red-500',
        icon: Settings,
        label: 'Admin',
        nav: [
            { path: '/admin/train', icon: Settings, label: 'Train Model' },
        ]
    }
};

export default function Layout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const userRole = user?.role?.toLowerCase() || 'patient';
    const config = roleConfig[userRole] || roleConfig.patient;
    const RoleIcon = config.icon;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile menu button */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-lg bg-white shadow-md"
                >
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b">
                        <h1 className="text-2xl font-bold gradient-yoga bg-clip-text text-bold">
                            🧘 Asana-Bridge
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Real-Time Pose Correction</p>
                    </div>

                    {/* User info */}
                    <div className="p-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${config.color} text-white`}>
                                <RoleIcon size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">{user?.full_name}</p>
                                <p className="text-xs text-gray-500 capitalize">{config.label}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4">
                        <ul className="space-y-2">
                            {config.nav.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;

                                return (
                                    <li key={item.path}>
                                        <Link
                                            to={item.path}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                        ${isActive
                                                    ? 'bg-primary-100 text-primary-700'
                                                    : 'text-gray-600 hover:bg-gray-100'}
                      `}
                                        >
                                            <Icon size={20} />
                                            <span>{item.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t">
                        <button
                            onClick={logout}
                            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="lg:ml-64 min-h-screen">
                <div className="p-6">
                    <Outlet />
                </div>
            </main>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
