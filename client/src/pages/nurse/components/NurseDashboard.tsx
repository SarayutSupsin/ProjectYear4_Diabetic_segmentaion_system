import { useState, useEffect } from 'react';
import styles from '../NursePage.module.css';
import { api } from '../../../services/api';
import type { Patient, Wound, WoundRecord, Appointment } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

interface NurseDashboardProps {
  onViewPatientWounds: (HN: string) => void;
  onSwitchTab: (tab: 'dashboard' | 'search' | 'upload' | 'detail') => void;
}

interface CalculatedPatientStatus {
  HN: string;
  name: string;
  woundsCount: number;
  status: 'ดีขึ้น' | 'แย่ลง' | 'คงที่';
}

export default function NurseDashboard({ onViewPatientWounds, onSwitchTab }: NurseDashboardProps) {
  const { logout } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientStatuses, setPatientStatuses] = useState<CalculatedPatientStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data dynamically and evaluate patient wound trends in parallel
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch base records from DB
      const [patientsList, appointmentsList] = await Promise.all([
        api.get<Patient[]>('/patients/'),
        api.get<Appointment[]>('/appointment/')
      ]);

      setPatients(patientsList);
      setAppointments(appointmentsList);

      // Fetch wounds and calculate progress dynamically for each patient
      const evaluatedStatuses: CalculatedPatientStatus[] = await Promise.all(
        patientsList.map(async (p) => {
          try {
            const patientWounds = await api.get<Wound[]>(`/wounds/patient/${p.HN}`);
            
            // Check status of latest wound changes
            let status: 'ดีขึ้น' | 'แย่ลง' | 'คงที่' = 'คงที่';
            
            // Analyze the records of each wound to see if any are worsening
            for (const w of patientWounds) {
              const records = await api.get<WoundRecord[]>(`/wounds/${w.wound_id}/records`);

              if (records.length >= 2) {
                // Sort records by date to compare the two latest measurements
                const sorted = [...records].sort(
                  (a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
                );
                const latest = sorted[sorted.length - 1];
                const previous = sorted[sorted.length - 2];

                if (latest.area_cm2 > previous.area_cm2) {
                  status = 'แย่ลง'; // Mark as worsening if area increased
                } else if (latest.area_cm2 < previous.area_cm2 && status !== 'แย่ลง') {
                  status = 'ดีขึ้น'; // Mark as improving if area decreased
                }
              }
            }

            return {
              HN: p.HN,
              name: `${p.first_name} ${p.last_name}`,
              woundsCount: patientWounds.length,
              status
            };
          } catch {
            return {
              HN: p.HN,
              name: `${p.first_name} ${p.last_name}`,
              woundsCount: 0,
              status: 'คงที่' as const
            };
          }
        })
      );

      setPatientStatuses(evaluatedStatuses);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Safe helper to get local date string (YYYY-MM-DD)
  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const todayStr = getLocalDateString();
  const todayAppointments = appointments.filter(app => app.appointment_date === todayStr);

  // Filter patients whose wound status has worsened (requires vigilance/เฝ้าระวัง)
  const vigilanceList = patientStatuses.filter(ps => ps.status === 'แย่ลง');

  if (loading) {
    return (
      <div className={styles.pageLoading}>
        <p>กำลังโหลดข้อมูลแดชบอร์ดพยาบาล...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageError}>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className={styles.retryBtn}>ลองใหม่</button>
      </div>
    );
  }

  return (
    <div className={styles.fadeUp}>
      {/* 4.2 Top banner design as shown in PDF Fig 4.10 */}
      <div className={styles.hospitalTopBanner}>
        <div className={styles.bannerInfo}>
          <span className={styles.greetingText}>สวัสดีตอนเช้า ☀️</span>
          <h2 className={styles.nurseProfileName}>พยาบาลผู้ดูแล</h2>
          <span className={styles.nurseSubRole}>พยาบาล · ห้องทำแผล</span>
        </div>
        <div className={styles.bannerRightBlock}>
          <button onClick={logout} className={styles.bannerLogoutBtn} title="ออกจากระบบ">
            ออกจากระบบ
          </button>
          <div className={styles.bannerAvatar}>N</div>
        </div>
      </div>

      {/* Metrics Row: Patients | Today's Appt | Vigilance cases */}
      <div className={styles.horizontalStatsBar}>
        <div className={styles.statMetric}>
          <span className={styles.metricVal}>{patients.length}</span>
          <span className={styles.metricLabel}>ผู้ป่วย</span>
        </div>
        <div className={styles.statMetric}>
          <span className={styles.metricVal}>{todayAppointments.length}</span>
          <span className={styles.metricLabel}>นัดวันนี้</span>
        </div>
        <div className={styles.statMetric}>
          <span className={`${styles.metricVal} ${vigilanceList.length > 0 ? styles.redText : ''}`}>
            {vigilanceList.length}
          </span>
          <span className={styles.metricLabel}>เฝ้าระวัง</span>
        </div>
      </div>

      {/* Vigilance Warning Cards (ต้องเฝ้าระวัง) */}
      {vigilanceList.length > 0 && (
        <div className={styles.alertCardContainer}>
          <h4 className={styles.alertTitle}>🚨 ต้องเฝ้าระวัง</h4>
          {vigilanceList.map(vigilance => (
            <div 
              key={vigilance.HN} 
              className={styles.alertItemCard}
              onClick={() => onViewPatientWounds(vigilance.HN)}
            >
              <div className={styles.alertContent}>
                <span className={styles.alertWarningSymbol}>⚠️</span>
                <span>{vigilance.name} - แผลแย่ลง</span>
              </div>
              <span className={styles.alertArrow}>➔</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Access Menu Link */}
      <div 
        className={styles.quickAnalyzeWoundCard}
        onClick={() => onSwitchTab('upload')}
      >
        <div className={styles.quickCardBody}>
          <span className={styles.quickCardIcon}>📸</span>
          <div>
            <h4>วิเคราะห์ภาพแผล</h4>
            <p>อัปโหลดภาพแผลใหม่พร้อม QR Code</p>
          </div>
        </div>
        <span className={styles.quickCardArrow}>➔</span>
      </div>

      {/* Recent Patients List Section */}
      <div className={styles.recentPatientsSection}>
        <h4 className={styles.sectionHeaderTitle}>ผู้ป่วยล่าสุด</h4>
        <div className={styles.recentPatientsList}>
          {patientStatuses.map(ps => (
            <div 
              key={ps.HN} 
              className={styles.recentPatientRowCard}
              onClick={() => onViewPatientWounds(ps.HN)}
            >
              <div className={styles.recentPatientMeta}>
                <div className={styles.letterAvatar}>{ps.name[0]}</div>
                <div>
                  <h4 className={styles.patientRowName}>{ps.name}</h4>
                  <span className={styles.patientRowHN}>HN: {ps.HN} · {ps.woundsCount} แผล</span>
                </div>
              </div>
              
              <span className={`${styles.statusBadgeRow} ${
                ps.status === 'ดีขึ้น' ? styles.statusGreen : 
                ps.status === 'แย่ลง' ? styles.statusRed : 
                styles.statusGray
              }`}>
                {ps.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
