import { useState, useEffect } from 'react';
import styles from '../NursePage.module.css';
import { api } from '../../../services/api';
import type { Patient, Appointment } from '../../../types';

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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientStatuses, setPatientStatuses] = useState<CalculatedPatientStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVigilanceExpanded, setIsVigilanceExpanded] = useState(true);
  const [isAppointmentsExpanded, setIsAppointmentsExpanded] = useState(true);

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

      // Fetch consolidated patient wound statuses in one single request to prevent N+1 network flooding
      const evaluatedStatuses = await api.get<CalculatedPatientStatus[]>('/wounds/progress-statuses');

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
          <h4 
            className={styles.alertTitle}
            onClick={() => setIsVigilanceExpanded(!isVigilanceExpanded)}
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
          >
            <span>🚨 ต้องเฝ้าระวัง ({vigilanceList.length})</span>
            <span style={{ fontSize: '11px', transition: 'transform 0.2s', transform: isVigilanceExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block' }}>
              ▼
            </span>
          </h4>
          {isVigilanceExpanded && vigilanceList.map(vigilance => (
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

      {/* Today's Appointments List (รายชื่อคนไข้ที่มีนัดวันนี้) */}
      {todayAppointments.length > 0 && (
        <div className={styles.appointmentCardContainer}>
          <h4 
            className={styles.appointmentTitle}
            onClick={() => setIsAppointmentsExpanded(!isAppointmentsExpanded)}
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
          >
            <span>📅 รายชื่อผู้นัดหมายวันนี้ ({todayAppointments.length}) </span>
            <span style={{ fontSize: '11px', transition: 'transform 0.2s', transform: isAppointmentsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block' }}>
              ▼
            </span>
          </h4>
          {isAppointmentsExpanded && todayAppointments.map(appt => {
            const pt = patients.find(p => p.HN === appt.HN);
            const ptName = pt ? `${pt.first_name} ${pt.last_name}` : `HN: ${appt.HN}`;
            
            return (
              <div 
                key={appt.appointment_id} 
                className={styles.appointmentItemCard}
                onClick={() => onViewPatientWounds(appt.HN)}
              >
                <div className={styles.alertContent} style={{ color: '#1e40af' }}>
                  <span className={styles.alertWarningSymbol} style={{ color: '#2563eb' }}>⏱️</span>
                  <div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{ptName}</span>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      เวลานัด: <strong>{appt.appointment_time.slice(0, 5)} น.</strong> {appt.note && `· ${appt.note}`}
                    </div>
                  </div>
                </div>
                <span className={styles.appointmentArrow}>➔</span>
              </div>
            );
          })}
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
