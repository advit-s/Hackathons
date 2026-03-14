import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import authService from './services/auth.service';

// Pages
import PatientDashboard from './pages/PatientDashboard';
import TrainerDashboard from './pages/TrainerDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminTraining from './pages/AdminTraining';
import Login from './pages/Login';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Auth Context
export const AuthContext = createContext(null);

export function useAuth() {
    return useContext(AuthContext);
}

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for stored user
        const storedUser = authService.getStoredUser();
        if (storedUser) {
            setUser(storedUser);
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const userData = await authService.login(email, password);
        setUser(userData);
        return userData;
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const register = async (email, password, role, fullName) => {
        const userData = await authService.register(email, password, role, fullName);
        setUser(userData);
        return userData;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-calm">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <AuthContext.Provider value={{ user, login, logout, register }}>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

                        <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
                            {/* Redirect based on role */}
                            <Route index element={
                                user?.role?.toLowerCase() === 'patient' ? <Navigate to="/patient" /> :
                                    user?.role?.toLowerCase() === 'trainer' ? <Navigate to="/trainer" /> :
                                        user?.role?.toLowerCase() === 'doctor' ? <Navigate to="/doctor" /> :
                                            user?.role?.toLowerCase() === 'admin' ? <Navigate to="/admin/train" /> :
                                                <Navigate to="/login" />
                            } />

                            {/* Patient Routes */}
                            <Route path="patient" element={<PatientDashboard />} />

                            {/* Trainer Routes */}
                            <Route path="trainer" element={<TrainerDashboard />} />

                            {/* Doctor Routes */}
                            <Route path="doctor" element={<DoctorDashboard />} />

                            {/* Admin Routes */}
                            <Route path="admin/train" element={<AdminTraining />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthContext.Provider>
        </ErrorBoundary>
    );
}

export default App;
