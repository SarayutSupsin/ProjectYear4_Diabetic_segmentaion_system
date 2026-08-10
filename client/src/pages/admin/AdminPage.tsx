import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Patient } from '../../types';
import styles from './AdminPage.module.css';
import AdminDashboard from './components/AdminDashboard';
import PatientList from './components/PatientList';
import NurseList from './components/NurseList';

interface NurseListItem {
  user_id: string;
  username: string;
  role_id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  department: string | null;
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<'dashboard' | 'patients' | 'nurses'>('dashboard');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [nursesList, setNursesList] = useState<NurseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const patientsData = await api.get<Patient[]>('/patients/');
      setPatientsList(patientsData);

      const response = await api.get<{ success: boolean; nurses: NurseListItem[] }>('/nurses/');
      if (response.success) {
        setNursesList(response.nurses);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ไม่สามารถโหลดข้อมูลระบบได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDateTH = (dateStr: string) => {
    if (!dateStr) return '-';
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0]) + 543;
    const m = months[parseInt(parts[1]) - 1];
    const d = parseInt(parts[2]);
    return `${d} ${m} ${y}`;
  };

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.adminSidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandLogo}>🔧</div>
          <h3>Admin Panel</h3>
        </div>
        <nav className={styles.sidebarNav}>
          <button className={`${styles.navItem} ${tab === 'dashboard' ? styles.activeNavItem : ''}`} onClick={() => setTab('dashboard')}>
            <span>📊</span> ภาพรวมระบบ
          </button>
          <button className={`${styles.navItem} ${tab === 'patients' ? styles.activeNavItem : ''}`} onClick={() => setTab('patients')}>
            <span>👥</span> รายชื่อผู้ป่วย
          </button>
          <button className={`${styles.navItem} ${tab === 'nurses' ? styles.activeNavItem : ''}`} onClick={() => setTab('nurses')}>
            <span>👩‍⚕️</span> บัญชีพยาบาล
          </button>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div 
              className={styles.avatar}
              onClick={() => setShowProfileModal(true)}
              style={{ cursor: 'pointer' }}
              title="คลิกเพื่อดูข้อมูลส่วนตัว"
            >A</div>
            <div>
              <div className={styles.name}>ผู้ดูแลระบบ</div>
              <div className={styles.role}>{user?.username}</div>
            </div>
          </div>
          <button onClick={logout} className={styles.logoutBtnNav}>ออกจากระบบ</button>
        </div>
      </aside>

      <main className={styles.adminMain}>
        {/* Mobile-only Top Banner (Rendered only on Dashboard tab, scrolls with content, no slide animations) */}
        {tab === 'dashboard' && (
          <div className={styles.mobileTopHeaderGlobal}>
            <div className={styles.bannerInfo}>
              <span className={styles.greetingText}>แผงควบคุมระบบ </span>
              <h2 className={styles.adminProfileName}>ผู้ดูแลระบบ (Admin)</h2>
              <span className={styles.adminSubRole}>ผู้ดูแลระบบ · ฝ่ายสารสนเทศ</span>
            </div>
            <div className={styles.bannerRightBlock}>
              <button onClick={logout} className={styles.bannerLogoutBtn} title="ออกจากระบบ">
                ออกจากระบบ
              </button>
              <div 
                className={styles.bannerAvatar}
                onClick={() => setShowProfileModal(true)}
                style={{ cursor: 'pointer' }}
                title="คลิกเพื่อดูข้อมูลส่วนตัว"
              >A</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className={styles.pageLoading}>
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        ) : error ? (
          <div className={styles.pageError}>
            <p>{error}</p>
            <button onClick={fetchData} className={styles.retryBtn}>ลองใหม่</button>
          </div>
        ) : (
          <>
            {tab === 'dashboard' && (
              <AdminDashboard
                patientsList={patientsList}
                nursesList={nursesList}
                formatDateTH={formatDateTH}
                onSwitchTab={(t) => setTab(t)}
              />
            )}

            {tab === 'patients' && (
              <PatientList
                patientsList={patientsList}
                fetchData={fetchData}
                formatDateTH={formatDateTH}
              />
            )}

            {tab === 'nurses' && (
              <NurseList
                nursesList={nursesList}
                fetchData={fetchData}
              />
            )}
          </>
        )}
      </main>

      <div className={styles.adminBottomNav}>
        <button onClick={() => setTab('dashboard')} className={`${styles.navBtnMobile} ${tab === 'dashboard' ? styles.activeBtn : ''}`}>
          <span className={styles.icon}>📊</span>
          <span>ภาพรวม</span>
        </button>
        <button onClick={() => setTab('patients')} className={`${styles.navBtnMobile} ${tab === 'patients' ? styles.activeBtn : ''}`}>
          <span className={styles.icon}>👥</span>
          <span>ผู้ป่วย</span>
        </button>
        <button onClick={() => setTab('nurses')} className={`${styles.navBtnMobile} ${tab === 'nurses' ? styles.activeBtn : ''}`}>
          <span className={styles.icon}>👩‍⚕️</span>
          <span>พยาบาล</span>
        </button>
      </div>

      {/* Admin Profile Details Modal Popup */}
      {showProfileModal && user && (
        <div className={styles.modalBackdrop} style={{ zIndex: 3000 }}>
          <div className={styles.modalCard} style={{ maxWidth: '360px', width: '95%', padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', textAlign: 'center', fontWeight: 700 }}>
              ข้อมูลบัญชีผู้ดูแลระบบ
            </h4>
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <strong style={{ color: '#64748b', fontWeight: 500 }}>สิทธิ์บัญชีผู้ใช้:</strong> 
                <span style={{ fontWeight: 600, color: '#3b82f6' }}>ผู้ดูแลระบบสูงสุด (Admin)</span>
              </p>
              <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <strong style={{ color: '#64748b', fontWeight: 500 }}>Username:</strong> 
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{user.username}</span>
              </p>
              {user.created_at && (
                <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <strong style={{ color: '#64748b', fontWeight: 500 }}>วันที่เข้าระบบ:</strong> 
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatDateTH(user.created_at)}</span>
                </p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <button 
                onClick={() => setShowProfileModal(false)} 
                className={styles.cancelBtn}
                style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 600 }}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
