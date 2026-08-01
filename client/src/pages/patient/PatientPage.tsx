import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from '../nurse/NursePage.module.css'; // Re-use consistent layout styles
import { api } from '../../services/api';
import type { Patient, Wound, WoundRecord, Appointment } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { MdDateRange, MdTimer } from "react-icons/md";
import { IoDocument } from "react-icons/io5";

interface BodyPartItem {
  body_part_id: string;
  body_part_name: string;
}

export default function PatientPage() {
  const { user, logout } = useAuth();
  const HN = user?.username || ''; // The username for patient accounts is their Hospital Number (HN)

  const [patient, setPatient] = useState<Patient | null>(null);
  const [wounds, setWounds] = useState<Wound[]>([]);
  const [selectedWoundId, setSelectedWoundId] = useState<string>('');
  const [records, setRecords] = useState<WoundRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bodyParts, setBodyParts] = useState<BodyPartItem[]>([]);

  // Sub-tabs navigation for patient view (Fig 4.21 - 4.23)
  const [subTab, setSubTab] = useState<'info' | 'history' | 'graph'>('info');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all patient profile and treatment history details from backend
  const fetchPatientData = async () => {
    if (!HN) return;
    try {
      setLoading(true);
      setError(null);

      const [patientsData, woundsData, bodyPartsData, appointmentsList] = await Promise.all([
        api.get<Patient[]>('/patients/'),
        api.get<Wound[]>(`/wounds/patient/${HN}`),
        api.get<BodyPartItem[]>('/wounds/body-parts'),
        api.get<Appointment[]>('/appointment/')
      ]);

      const currentPatient = patientsData.find(p => p.HN === HN);
      if (!currentPatient) {
        throw new Error('ไม่พบข้อมูลประวัติคนไข้ของคุณในฐานข้อมูลโรงพยาบาล');
      }

      setPatient(currentPatient);
      setWounds(woundsData);
      setBodyParts(bodyPartsData);
      setAppointments(appointmentsList);

      if (woundsData.length > 0) {
        setSelectedWoundId(woundsData[0].wound_id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติของคุณ');
    } finally {
      setLoading(false);
    }
  };

  // Fetch wound photos and calibration records
  const fetchWoundRecords = async (woundId: string) => {
    try {
      const data = await api.get<WoundRecord[]>(`/wounds/${woundId}/records`);
      setRecords(data);
    } catch (err) {
      console.error('Failed to load records:', err);
    }
  };

  useEffect(() => {
    fetchPatientData();
  }, [HN]);

  useEffect(() => {
    if (selectedWoundId) {
      fetchWoundRecords(selectedWoundId);
    } else {
      setRecords([]);
    }
  }, [selectedWoundId]);

  // Helper to format dates to Thai style
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

  // Calculate age dynamically
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

  const getWoundStatus = (recordsList: WoundRecord[]) => {
    if (recordsList.length < 2) return 'คงที่';
    const sorted = [...recordsList].sort(
      (a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
    );
    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];
    if (latest.area_cm2 > previous.area_cm2) return 'แย่ลง';
    if (latest.area_cm2 < previous.area_cm2) return 'ดีขึ้น';
    return 'คงที่';
  };

  const activeWoundStatus = getWoundStatus(records);
  const activeWound = wounds.find(w => w.wound_id === selectedWoundId);

  // Map data to coordinates for line charting
  const chartData = records.map(r => ({
    dateStr: formatDateTH(r.record_date),
    size: r.area_cm2
  }));

  // Fetch only this patient's future clinic appointment schedules
  const myAppointments = appointments
    .filter(app => app.HN === HN)
    .sort((a, b) => new Date(a.appointment_date + 'T' + a.appointment_time).getTime() - new Date(b.appointment_date + 'T' + b.appointment_time).getTime());

  if (loading) {
    return (
      <div className={styles.pageLoading}>
        <p>กำลังโหลดประวัติส่วนตัวและประวัติแผลของคุณ...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className={styles.pageError}>
        <p>{error || 'ไม่พบข้อมูลประวัติคนไข้ของคุณ'}</p>
        <button onClick={logout} className={styles.retryBtn}>ออกจากระบบ</button>
      </div>
    );
  }

  const age = calculateAge(patient.birth_date);
  const overallStatus = wounds.length > 0 ? activeWoundStatus : 'คงที่';

  return (
    <div className={styles.fadeUp} style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', paddingBottom: '80px' }}>
      
      {/* Premium Patient top Welcome Banner (Consistent design layout) */}
      <div className={styles.detailPatientCard}>
        <div className={styles.detailPatientHeader}>
          <div className={styles.detailUserAvatar}>ค</div>
          <div>
            <h3 className={styles.detailPatientName}>คุณ{patient.first_name} {patient.last_name}</h3>
            <span className={styles.detailPatientSubtext}>
              HN: {patient.HN} · อายุ {age} ปี · {wounds.length} แผลรักษา
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <span className={`${styles.statusBadgeRow} ${
            overallStatus === 'ดีขึ้น' ? styles.statusGreen : 
            overallStatus === 'แย่ลง' ? styles.statusRed : 
            styles.statusGray
          }`}>
            {overallStatus}
          </span>
          <button 
            onClick={logout} 
            className={styles.mobileHeaderLogoutBtn}
            style={{ display: 'block' }}
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* Tabs navigation for patient */}
      <div className={styles.segmentedTabsBar}>
        <button 
          onClick={() => setSubTab('info')}
          className={`${styles.segmentTabBtn} ${subTab === 'info' ? styles.active : ''}`}
        >
          ข้อมูลแผล
        </button>
        <button 
          onClick={() => setSubTab('history')}
          className={`${styles.segmentTabBtn} ${subTab === 'history' ? styles.active : ''}`}
        >
          ประวัติแผล
        </button>
        <button 
          onClick={() => setSubTab('graph')}
          className={`${styles.segmentTabBtn} ${subTab === 'graph' ? styles.active : ''}`}
        >
          กราฟ
        </button>
      </div>

      {/* Active Wound Case selector */}
      <div className={styles.sectionCard}>
        <h4 className={styles.sectionTitle}>เลือกแผลเพื่อดูความคืบหน้า</h4>
        {wounds.length === 0 ? (
          <p className={styles.emptyText}>คุณยังไม่มีข้อมูลประวัติแผลจดทะเบียนในระบบโรงพยาบาล</p>
        ) : (
          <div className={styles.woundsGridSelector}>
            {wounds.map(w => (
              <div 
                key={w.wound_id}
                className={`${styles.woundSelectItemCard} ${selectedWoundId === w.wound_id ? styles.active : ''}`}
                onClick={() => setSelectedWoundId(w.wound_id)}
              >
                <div className={styles.woundSelectText}>
                  <span className={styles.woundSelectLoc}>
                    {w.body_part?.body_part_name || 'ไม่ระบุตำแหน่ง'} {w.side}
                  </span>
                  <span className={styles.woundSelectCase}>Case: {w.wound_id}</span>
                </div>
                <span className={`${styles.statusBadgeRow} ${
                  activeWoundStatus === 'ดีขึ้น' ? styles.statusGreen : 
                  activeWoundStatus === 'แย่ลง' ? styles.statusRed : 
                  styles.statusGray
                }`}>
                  {activeWoundStatus}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- TAB 1: ข้อมูลแผล & ตารางนัดหมาย --- */}
      {subTab === 'info' && selectedWoundId && activeWound && (
        <>
          <div className={styles.sectionCard}>
            <h4 className={styles.sectionTitle}>ข้อมูลแผลของคุณ</h4>
            <div className={styles.woundDataInfoBlock}>
              <div className={styles.infoMetaRow}>
                <span className={styles.infoMetaLabel}>ตำแหน่ง</span>
                <span className={styles.infoMetaVal}>
                  {activeWound.body_part?.body_part_name} ({activeWound.side})
                </span>
              </div>
              <div className={styles.infoMetaRow}>
                <span className={styles.infoMetaLabel}>ขนาดผิวแผลล่าสุด</span>
                <span className={styles.infoMetaVal}>
                  {records.length > 0 ? `${records[records.length - 1].area_cm2} cm²` : 'กำลังรอตรวจวิเคราะห์'}
                </span>
              </div>
              <div className={styles.infoMetaRow}>
                <span className={styles.infoMetaLabel}>วันที่ลงทะเบียนรักษา</span>
                <span className={styles.infoMetaVal}>{formatDateTH(patient.admit_date)}</span>
              </div>
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h4 className={styles.sectionTitle}><span> <MdDateRange /> </span> ตารางนัดล้างแผล/ติดตามผลของคุณ</h4>
            {myAppointments.length === 0 ? (
              <p className={styles.emptyText}>คุณไม่มีตารางนัดหมายล้างแผลช่วงนี้</p>
            ) : (
              <div className={styles.queueList}>
                {myAppointments.map(appt => (
                  <div key={appt.appointment_id} className={styles.queueItem} style={{ borderLeftColor: '#0d9488' }}>
                    <div className={styles.queueTime}><span> <MdTimer /> </span> {appt.appointment_time.slice(0, 5)} น.</div>
                    <div className={styles.queuePatient}>
                      <span className={styles.boldText} style={{ display: 'block', fontSize: '13px' }}>
                        <span> <MdDateRange /> </span> วันที่นัด: {formatDateTH(appt.appointment_date)}
                      </span>
                      {appt.note && (
                        <p className={styles.queueNote} style={{ marginTop: '4px' }}>
                          <span> <IoDocument /> </span> รายละเอียดนัด: {appt.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* --- TAB 2: แกลเลอรีประวัติแผล --- */}
      {subTab === 'history' && selectedWoundId && (
        <div className={styles.sectionCard}>
          <h4 className={styles.sectionTitle}>ประวัติภาพถ่ายแผล ({records.length})</h4>
          {records.length === 0 ? (
            <p className={styles.emptyText}>ยังไม่มีประวัติภาพถ่ายแผลสะสมในระบบ</p>
          ) : (
            <div className={styles.woundHistoryImagesGrid}>
              {records.map(record => (
                <div key={record.record_id} className={styles.historyThumbCard}>
                  <div className={styles.thumbImageWrapper}>
                    <img 
                      src={`http://localhost:8000/${record.image_path}`} 
                      alt="Wound history for patient" 
                      className={styles.thumbImg}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/180x180?text=No+Wound+Image';
                      }}
                    />
                  </div>
                  <div className={styles.thumbMetaInfo}>
                    <span className={styles.thumbAreaSize}>{record.area_cm2} cm²</span>
                    <span className={styles.thumbDate}>{formatDateTH(record.record_date)}</span>
                    {record.note && <p className={styles.thumbNote}>💡 บันทึกแพทย์: {record.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: กราฟขนาดแผลหดตัว --- */}
      {subTab === 'graph' && selectedWoundId && (
        <div className={styles.sectionCard}>
          <h4 className={styles.sectionTitle}>กราฟแสดงอัตราการรักษาตัวของแผล</h4>
          {records.length < 2 ? (
            <p className={styles.emptyText}>ต้องการประวัติการวัดขนาดแผลอย่างน้อย 2 ครั้งเพื่อวาดกราฟติดตามผล</p>
          ) : (
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dateStr" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Line 
                    type="monotone" 
                    dataKey="size" 
                    name="ขนาดแผล (ตร.ซม.)"
                    stroke="#0d9488" 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
