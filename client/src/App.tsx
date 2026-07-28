import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/login/LoginPage';
import AdminPage from './pages/admin/AdminPage';
import NursePage from './pages/nurse/NursePage';
import PatientPage from './pages/patient/PatientPage';

function MainAppContent() {
  const { user, loading, logout } = useAuth();

  // 1. Show loading state while validating JWT token on startup
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: '14px' }}>กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  // 2. Redirect to Login if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // 3. Render matching dashboard page based on user.role_id
  if (user.role_id === 'ADMIN') {
    return <AdminPage />;
  }

  if (user.role_id === 'NURSE') {
    return <NursePage />;
  }

  if (user.role_id === 'PATIENT') {
    return <PatientPage />;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>ไม่พบหน้าต่างสำหรับสิทธิ์การใช้งานนี้</h1>
      <button onClick={logout}>ออกจากระบบ</button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
