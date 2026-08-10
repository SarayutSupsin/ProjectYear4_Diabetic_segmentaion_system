import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './NursePage.module.css';
import NurseDashboard from './components/NurseDashboard';
import PatientSearch from './components/PatientSearch';
import WoundDetail from './components/WoundDetail';
import WoundScan from './components/WoundScan';

export default function NursePage() {
    const { user, logout } = useAuth();
    // State to manage current tab selection
    const [tab, setTab] = useState<'dashboard' | 'search' | 'upload' | 'detail'>('dashboard');
    // State to keep track of the currently selected patient's Hospital Number (HN)
    const [selectedHN, setSelectedHN] = useState<string | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);

    const formatDateTH = (dateStr?: string) => {
        if (!dateStr) return '-';
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length !== 3) return dateStr;
        const y = parseInt(parts[0]) + 543;
        const m = months[parseInt(parts[1]) - 1];
        const d = parseInt(parts[2]);
        return `${d} ${m} ${y}`;
    };

    // Callback to switch tab to details view and set selected HN
    const onViewPatientWounds = (HN: string) => {
        setSelectedHN(HN);
        setTab('detail');
    };

    return (
        <div className={styles.nurseLayout}>
            {/* Sidebar Navigation for Desktop view */}
            <aside className={styles.nurseSidebar}>
                <div className={styles.sidebarBrand}>
                    <div className={styles.brandLogo}>🩺</div>
                    <h3>ระบบพยาบาล</h3>
                </div>
                <nav className={styles.sidebarNav}>
                    <button
                        className={`${styles.navItem} ${tab === 'dashboard' ? styles.activeNavItem : ''}`}
                        onClick={() => setTab('dashboard')}
                    >
                        <span>📊</span> ภาพรวมระบบ
                    </button>
                    <button
                        className={`${styles.navItem} ${tab === 'search' ? styles.activeNavItem : ''}`}
                        onClick={() => setTab('search')}
                    >
                        <span>🔍</span> ค้นหาผู้ป่วย
                    </button>
                    <button
                        className={`${styles.navItem} ${tab === 'upload' ? styles.activeNavItem : ''}`}
                        onClick={() => setTab('upload')}
                    >
                        <span>📸</span> สแกนวิเคราะห์แผล
                    </button>
                </nav>
                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <div 
                            className={styles.avatar}
                            onClick={() => setShowProfileModal(true)}
                            style={{ cursor: 'pointer' }}
                            title="คลิกเพื่อดูข้อมูลส่วนตัว"
                        >
                            {(user?.first_name ? user.first_name[0] : user?.username[0] || 'N').toUpperCase()}
                        </div>
                        <div>
                            <div className={styles.name}>
                                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'พยาบาลผู้ดูแล'}
                            </div>
                            <div className={styles.role}>{user?.username}</div>
                        </div>
                    </div>
                    <button onClick={logout} className={styles.logoutBtnNav}>ออกจากระบบ</button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={styles.nurseMain}>
                {/* Global Welcome Banner (Rendered only on Dashboard tab, scrolls with content, stays static on tab switch) */}
                {tab === 'dashboard' && (
                    <div className={styles.hospitalTopBanner}>
                        <div className={styles.bannerInfo}>
                            <h2 className={styles.nurseProfileName}>
                                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'พยาบาลผู้ดูแล'}
                            </h2>
                            <span className={styles.nurseSubRole}>
                                พยาบาล · {user?.department || 'ห้องทำแผล'}
                            </span>
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
                            >
                                {(user?.first_name ? user.first_name[0] : user?.username[0] || 'N').toUpperCase()}
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.fadeUp}>
                    {/* ภาพรวม */}
                    <div style={{ display: tab === 'dashboard' ? 'block' : 'none' }}>
                        <NurseDashboard
                            onViewPatientWounds={onViewPatientWounds}
                            onSwitchTab={(t) => setTab(t)}
                            activeTab={tab}
                        />
                    </div>

                    {/* ค้นหา */}
                    <div style={{ display: tab === 'search' ? 'block' : 'none' }}>
                        <PatientSearch 
                            onViewPatientWounds={onViewPatientWounds} 
                            activeTab={tab}
                        />
                    </div>

                    {/* สแกน/อัปโหลดแผล */}
                    <div style={{ display: tab === 'upload' ? 'block' : 'none' }}>
                        <WoundScan
                            preselectedHN={selectedHN}
                            onViewPatientWounds={onViewPatientWounds}
                        />
                    </div>

                    {/* รายละเอียดการรักษา */}
                    <div style={{ display: tab === 'detail' ? 'block' : 'none' }}>
                        {selectedHN ? (
                            <WoundDetail
                                HN={selectedHN}
                                onBackToSearch={() => setTab('search')}
                                onSwitchTab={(t) => setTab(t)}
                                activeTab={tab}
                            />
                        ) : (
                            <div>
                                <h2>รายละเอียดการรักษา</h2>
                                <p style={{ color: '#64748b' }}>กรุณาค้นหาและเลือกผู้ป่วยจากหน้าค้นหาก่อน เพื่อเข้าดูประวัติและบันทึกแผล</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Floating Bottom Navigation bar for mobile view */}
            <div className={styles.nurseBottomNav}>
                <button
                    onClick={() => setTab('dashboard')}
                    className={`${styles.navBtnMobile} ${tab === 'dashboard' ? styles.activeBtn : ''}`}
                >
                    <span className={styles.icon}>📊</span>
                    <span>ภาพรวม</span>
                </button>
                <button
                    onClick={() => setTab('search')}
                    className={`${styles.navBtnMobile} ${tab === 'search' ? styles.activeBtn : ''}`}
                >
                    <span className={styles.icon}>🔍</span>
                    <span>ค้นหา</span>
                </button>
                <button
                    onClick={() => setTab('upload')}
                    className={`${styles.navBtnMobile} ${tab === 'upload' ? styles.activeBtn : ''}`}
                >
                    <span className={styles.icon}>📸</span>
                    <span>สแกนแผล</span>
                </button>
            </div>

            {/* Nurse Profile Details Modal Popup */}
            {showProfileModal && user && (
                <div className={styles.modalBackdrop} style={{ zIndex: 3000 }}>
                    <div className={styles.modalCardCompact} style={{ maxWidth: '360px', width: '95%', padding: '24px' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', textAlign: 'center', fontWeight: 700 }}>
                            ข้อมูลบัญชีพยาบาล
                        </h4>
                        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                <strong style={{ color: '#64748b', fontWeight: 500 }}>สิทธิ์บัญชีผู้ใช้:</strong> 
                                <span style={{ fontWeight: 600, color: '#0d9488' }}>พยาบาล (Nurse)</span>
                            </p>
                            <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                <strong style={{ color: '#64748b', fontWeight: 500 }}>Username:</strong> 
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{user.username}</span>
                            </p>
                            <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                <strong style={{ color: '#64748b', fontWeight: 500 }}>ชื่อจริง-นามสกุล:</strong> 
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{user.first_name ? `${user.first_name} ${user.last_name || ''}` : 'ไม่ระบุ'}</span>
                            </p>
                            <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                <strong style={{ color: '#64748b', fontWeight: 500 }}>แผนกปฏิบัติงาน:</strong> 
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{user.department || 'ไม่ระบุ'}</span>
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
