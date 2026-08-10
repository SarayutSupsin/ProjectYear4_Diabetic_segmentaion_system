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
                        <div className={styles.avatar}>
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
                            <div className={styles.bannerAvatar}>
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
        </div>
    );
}
