import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/login/LoginPage';
import AdminPage from './pages/admin/AdminPage';
import NursePage from './pages/nurse/NursePage';
import PatientPage from './pages/patient/PatientPage';

type Role = 'ADMIN' | 'NURSE' | 'PATIENT';

// หน้าแรกของแต่ละสิทธิ์ (ใช้ redirect หลัง login)
const HOME: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  NURSE: '/nurse/dashboard',
  PATIENT: '/patient',
};

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontSize: '14px' }}>กำลังโหลดข้อมูลโปรไฟล์...</p>
      </div>
    </div>
  );
}

// ป้องกันหน้า: ต้อง login และมีสิทธิ์ตรงกับหน้านั้น
function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role_id !== role) return <Navigate to={HOME[user.role_id]} replace />;
  return <>{children}</>;
}

// หน้า /login: ถ้า login อยู่แล้วให้เด้งไปหน้าของตัวเอง
function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={HOME[user.role_id]} replace />;
  return <LoginPage />;
}

// หน้า / และ path ที่ไม่มีอยู่จริง
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return <Navigate to={user ? HOME[user.role_id] : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/:tab" element={<RequireRole role="ADMIN"><AdminPage /></RequireRole>} />

        <Route path="/nurse" element={<Navigate to="/nurse/dashboard" replace />} />
        <Route path="/nurse/:tab/:hn?" element={<RequireRole role="NURSE"><NursePage /></RequireRole>} />

        <Route path="/patient" element={<RequireRole role="PATIENT"><PatientPage /></RequireRole>} />

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </AuthProvider>
  );
}