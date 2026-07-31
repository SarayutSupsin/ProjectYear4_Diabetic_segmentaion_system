// นำเข้าสไตล์จากระดับโฟลเดอร์แม่มาใช้งานร่วมกัน
import styles from '../AdminPage.module.css';
import type { Patient } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

import { FaUserDoctor } from "react-icons/fa6";
import { IoMdPeople } from "react-icons/io";

interface NurseListItem {
  user_id: string;
  username: string;
  role_id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  department: string | null;
}

interface AdminDashboardProps {
  patientsList: Patient[];
  nursesList: NurseListItem[];
  formatDateTH: (dateStr: string) => string;
  onSwitchTab: (tab: 'dashboard' | 'patients' | 'nurses') => void;
}

export default function AdminDashboard({ patientsList, nursesList, formatDateTH, onSwitchTab }: AdminDashboardProps) {
  const { logout } = useAuth();

  // Calculate patient age dynamically
  const calculateAge = (birthDateStr: string) => {
    if (!birthDateStr) return 0;
    const today = new Date();
    const birthDate = new Date(birthDateStr);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className={`${styles.tabContent} ${styles.fadeUp}`}>
      <header className={styles.pageHeader}>
        <h2>ภาพรวมระบบติดตามแผลเบาหวาน DFU</h2>
        <p>ข้อมูลรายงานสถิติตัวแปรหลักภายในระบบ</p>
      </header>

      {/* Metric Cards (Total Patients & Total Nurses) */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.icon}> <IoMdPeople /> </div>
          <div className={styles.info}>
            <span className={styles.value}>{patientsList.length}</span>
            <span className={styles.label}>ผู้ป่วยทั้งหมด</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.icon}> <FaUserDoctor /> </div>
          <div className={styles.info}>
            <span className={styles.value}>{nursesList.length}</span>
            <span className={styles.label}>พยาบาลทั้งหมด</span>
          </div>
        </div>
      </div>

      {/* Two columns layout for Patients and Nurses lists (Fig 4.6 layout) */}
      <div className={styles.dashboardSectionsGrid}>

        {/* Column 1: Recent Patients */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardHeader}>
            <h4>ผู้ป่วยลงทะเบียนล่าสุด</h4>
            <span
              onClick={() => onSwitchTab('patients')}
              className={styles.viewAllLink}
            >
              ดูทั้งหมด →
            </span>
          </div>
          <div className={styles.recentList}>
            {patientsList.length === 0 ? (
              <p className={styles.emptyText}>ยังไม่มีข้อมูลผู้ป่วยในระบบ</p>
            ) : (
              patientsList.slice(-5).reverse().map(p => {
                const age = calculateAge(p.birth_date);
                return (
                  <div key={p.HN} className={styles.recentItem}>
                    <div className={styles.itemAvatar}>{p.first_name[0]}</div>
                    <div className={styles.itemMetaInfo}>
                      <h6 className={styles.itemTitle}>{p.first_name} {p.last_name}</h6>
                      <span className={styles.itemSubtitle}>
                        HN: {p.HN} · อายุ {age} ปี
                      </span>
                      <span className={styles.itemDateLabel}>
                        เข้ารักษา {formatDateTH(p.admit_date)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Active Nurses in system */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardHeader}>
            <h4>พยาบาลในระบบ</h4>
            <span
              onClick={() => onSwitchTab('nurses')}
              className={styles.viewAllLink}
            >
              ดูทั้งหมด →
            </span>
          </div>
          <div className={styles.recentList}>
            {nursesList.length === 0 ? (
              <p className={styles.emptyText}>ยังไม่มีรายชื่อบัญชีพยาบาลในระบบ</p>
            ) : (
              nursesList.slice(-5).reverse().map(n => (
                <div key={n.user_id} className={styles.recentItem}>
                  <div className={styles.itemAvatar} style={{ backgroundColor: '#e2e8f0', color: '#475569' }}>
                    {(n.first_name ? n.first_name[0] : n.username[0]).toUpperCase()}
                  </div>
                  <div className={styles.itemMetaInfo}>
                    <h6 className={styles.itemTitle}>
                      {n.first_name ? `${n.first_name} ${n.last_name || ''}` : n.username}
                    </h6>
                    <span className={styles.itemSubtitle}>
                      {n.department || 'ห้องทำแผล'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
