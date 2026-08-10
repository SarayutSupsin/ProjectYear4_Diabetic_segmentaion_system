import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from '../nurse/NursePage.module.css'; // Re-use consistent layout styles
import { api, BACKEND_URL } from '../../services/api';
import type { Patient, Wound, WoundRecord, Appointment } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PatientPage() {
  const { user, logout } = useAuth();
  const HN = user?.username || ''; // The username for patient accounts is their Hospital Number (HN)

  const [patient, setPatient] = useState<Patient | null>(null);
  const [wounds, setWounds] = useState<Wound[]>([]);
  const [selectedWoundId, setSelectedWoundId] = useState<string>('');
  const [records, setRecords] = useState<WoundRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Sub-tabs navigation for patient view (Fig 4.21 - 4.23)
  const [subTab, setSubTab] = useState<'info' | 'history' | 'graph'>('info');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all patient profile and treatment history details from backend
  const fetchPatientData = async () => {
    if (!HN) return;
    try {
      setLoading(true);
      setError(null);

      const [patientData, woundsData, appointmentsList] = await Promise.all([
        api.get<Patient>(`/patients/${HN}`),
        api.get<Wound[]>(`/wounds/patient/${HN}`),
        api.get<Appointment[]>('/appointment/')
      ]);

      if (!patientData) {
        throw new Error('ไม่พบข้อมูลประวัติคนไข้ของคุณในฐานข้อมูลโรงพยาบาล');
      }

      setPatient(patientData);
      setWounds(woundsData);
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

  useEffect(() => {
    fetchPatientData();
  }, [HN]);

  useEffect(() => {
    if (selectedWoundId) {
      const activeW = wounds.find(w => w.wound_id === selectedWoundId);
      const sorted = activeW?.records
        ? [...activeW.records].sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime())
        : [];
      setRecords(sorted);
    } else {
      setRecords([]);
    }
  }, [selectedWoundId, wounds]);

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

  const activeWound = wounds.find(w => w.wound_id === selectedWoundId);


  // Get current local date in YYYY-MM-DD format
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Fetch only this patient's future clinic appointment schedules (today and future)
  const myAppointments = appointments
    .filter(app => app.HN === HN && app.appointment_date >= todayStr)
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



  return (
    <div className={styles.fadeUp} style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', paddingBottom: '80px' }}>
      
      {/* Hospital Top Banner for Patient (Clean minimal header) */}
      <div className={styles.patientTopBanner} style={{ margin: '-16px -16px 24px -16px', borderRadius: 0, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className={styles.nurseProfileName} style={{ fontSize: '18px', margin: 0 }}>คุณ{patient.first_name} {patient.last_name}</h2>
          <span style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px', display: 'block' }}>HN: {patient.HN}</span>
        </div>
        <div className={styles.bannerRightBlock}>
          <button onClick={logout} className={styles.bannerLogoutBtn} style={{ display: 'block' }} title="ออกจากระบบ">
            ออกจากระบบ
          </button>
          <div 
            className={styles.bannerAvatar}
            onClick={() => setShowProfileModal(true)}
            style={{ cursor: 'pointer' }}
            title="คลิกเพื่อดูข้อมูลส่วนตัว"
          >
            {(patient.first_name ? patient.first_name[0] : 'P').toUpperCase()}
          </div>
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
            {wounds.map(w => {
              const recordsList = w.records || [];
              let latestSize = 'ยังไม่มีประวัติ';
              if (recordsList.length > 0) {
                const sorted = [...recordsList].sort(
                  (a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
                );
                latestSize = `${sorted[sorted.length - 1].area_cm2} cm²`;
              }
              const woundStatus = getWoundStatus(recordsList);
              return (
                <div 
                  key={w.wound_id}
                  className={`${styles.woundSelectItemCard} ${selectedWoundId === w.wound_id ? styles.active : ''}`}
                  onClick={() => setSelectedWoundId(w.wound_id)}
                >
                  <div className={styles.woundSelectText}>
                    <span className={styles.woundSelectLoc}>
                      {w.body_part?.body_part_name || 'ไม่ระบุตำแหน่ง'} {w.side}
                    </span>
                    <span className={styles.woundSelectCase} style={{ fontSize: '11px', marginTop: '2px', color: '#64748b' }}>
                      ขนาดล่าสุด: {latestSize}
                    </span>
                  </div>
                  <span className={`${styles.statusBadgeRow} ${
                    woundStatus === 'ดีขึ้น' ? styles.statusGreen : 
                    woundStatus === 'แย่ลง' ? styles.statusRed : 
                    styles.statusGray
                  }`}>
                    {woundStatus}
                  </span>
                </div>
              );
            })}
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
                  <span className={`${styles.infoMetaVal} ${styles.locationVal}`}>
                    {activeWound.body_part?.body_part_name} ({activeWound.side})
                  </span>
                </div>
              <div className={styles.infoMetaRow}>
                <span className={styles.infoMetaLabel}>ขนาดผิวแผลล่าสุด</span>
                <span className={styles.infoMetaVal}>
                  {records.length > 0 ? `${records[0].area_cm2} cm²` : 'กำลังรอตรวจวิเคราะห์'}
                </span>
              </div>
              <div className={styles.infoMetaRow}>
                <span className={styles.infoMetaLabel}>วันที่ลงทะเบียนรักษา</span>
                <span className={styles.infoMetaVal}>{formatDateTH(patient.admit_date)}</span>
              </div>
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h4 className={styles.sectionTitle}>🗓️ ตารางการนัดหมายติดตามผล</h4>
            {myAppointments.length === 0 ? (
              <p className={styles.emptyText}>คุณไม่มีข้อมูลการนัดหมายในช่วงนี้</p>
            ) : (
              <div className={styles.queueList}>
                {myAppointments.map(appt => (
                  <div key={appt.appointment_id} className={styles.queueItem} style={{ borderLeftColor: '#0d9488' }}>
                    <div className={styles.queueTime}>⏱️ {appt.appointment_time.slice(0, 5)} น.</div>
                    <div className={styles.queuePatient}>
                      <span className={styles.boldText} style={{ display: 'block', fontSize: '13px' }}>
                        📅 วันที่นัด: {formatDateTH(appt.appointment_date)}
                      </span>
                      {appt.note && (
                        <p className={styles.queueNote} style={{ marginTop: '4px' }}>
                          🏥 รายละเอียดนัด: {appt.note}
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
            <div className={styles.woundHistoryImagesScrollRow}>
              {records.map(record => {
                const imageUrl = `${BACKEND_URL}/${record.image_path}`;
                return (
                  <div key={record.record_id} className={styles.historyThumbCard}>
                    <div 
                      className={styles.thumbImageWrapper}
                      style={{ position: 'relative' }}
                    >
                      <img 
                        src={imageUrl} 
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
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: กราฟ (Graph Tab - Fig 4.24 layout matching Nurse) --- */}
      {subTab === 'graph' && selectedWoundId && (
        <div className={styles.sectionCard}>
          <h4 className={styles.sectionTitle}>กราฟแนวโน้มการเปลี่ยนแปลงขนาดแผล</h4>
          {records.length < 2 ? (
            <p className={styles.emptyText}>ต้องการประวัติบันทึกแผลอย่างน้อย 2 ครั้ง เพื่อสร้างกราฟเปรียบเทียบแนวโน้ม</p>
          ) : (() => {
            const chronologicalRecords = [...records].reverse();
            const initialRec = chronologicalRecords[0];
            const latestRec = chronologicalRecords[chronologicalRecords.length - 1];
            const diff = latestRec.area_cm2 - initialRec.area_cm2;
            const percentChange = initialRec.area_cm2 > 0 
              ? ((Math.abs(diff) / initialRec.area_cm2) * 100).toFixed(1) 
              : '0.0';

            const chartCoordinates = chronologicalRecords.map(r => {
              const cleanDate = r.record_date.split('T')[0];
              const parts = cleanDate.split('-');
              let shortDate = r.record_date;
              if (parts.length === 3) {
                const yy = String(parseInt(parts[0]) + 543).slice(-2);
                const mm = parts[1];
                const dd = parts[2];
                shortDate = `${dd}/${mm}/${yy}`;
              }
              return {
                dateStr: shortDate,
                fullDateStr: formatDateTH(r.record_date),
                size: r.area_cm2
              };
            });

            return (
              <>
                <div className={styles.chartWrapper} style={{ marginBottom: '16px' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartCoordinates} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="dateStr" 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        angle={-45} 
                        textAnchor="end" 
                        height={60}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        label={{ value: 'ขนาด (cm²)', angle: -90, position: 'insideLeft', offset: 0, style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 } }}
                      />
                      <Tooltip 
                        labelFormatter={(label, items) => items[0]?.payload?.fullDateStr || label} 
                        contentStyle={{ fontSize: 12, borderRadius: 8 }} 
                      />
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

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '8px' }}>
                  <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                    สรุปประเมินพัฒนาการของแผล
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    
                    {/* บล็อกที่ 1: ขนาดแผลแรกเริ่ม */}
                    <div style={{ padding: '10px 8px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>ขนาดแผลแรกเริ่ม</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                        {initialRec.area_cm2} cm²
                      </div>
                      <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                        {formatDateTH(initialRec.record_date)}
                      </div>
                    </div>
                    
                    {/* บล็อกที่ 2: ขนาดแผลล่าสุด */}
                    <div style={{ padding: '10px 8px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>ขนาดแผลล่าสุด</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                        {latestRec.area_cm2} cm²
                      </div>
                      <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                        {formatDateTH(latestRec.record_date)}
                      </div>
                    </div>

                    {/* บล็อกที่ 3: แนวโน้มการรักษา */}
                    <div style={{ 
                      padding: '10px 8px', 
                      backgroundColor: diff < 0 ? '#f0fdf4' : diff > 0 ? '#fef2f2' : '#f8fafc', 
                      borderRadius: '8px', 
                      border: diff < 0 ? '1px solid #bbf7d0' : diff > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0'
                    }}>
                      <div style={{ 
                        fontSize: '10px', 
                        color: diff < 0 ? '#16a34a' : diff > 0 ? '#dc2626' : '#64748b', 
                        fontWeight: 600 
                      }}>
                        แนวโน้มการรักษา
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 700, 
                        color: diff < 0 ? '#15803d' : diff > 0 ? '#b91c1c' : '#475569', 
                        marginTop: '4px' 
                      }}>
                        {diff < 0 ? `ดีขึ้น ${percentChange}%` : diff > 0 ? `แย่ลง ${percentChange}%` : 'คงที่'}
                      </div>
                      <div style={{ 
                        fontSize: '9px', 
                        color: diff < 0 ? '#16a34a' : diff > 0 ? '#dc2626' : '#94a3b8', 
                        marginTop: '2px' 
                      }}>
                        
                      </div>
                    </div>

                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Patient Profile Details Modal Popup */}
      {showProfileModal && (
        <div className={styles.modalBackdrop} style={{ zIndex: 3000 }}>
          <div className={styles.modalCardCompact} style={{ maxWidth: '360px', width: '95%', padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', textAlign: 'center', fontWeight: 700 }}>
              ข้อมูลประจำตัวคนไข้
            </h4>
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <strong style={{ color: '#64748b', fontWeight: 500 }}>สิทธิ์บัญชีผู้ใช้:</strong> 
                <span style={{ fontWeight: 600, color: '#0d9488' }}>ผู้ป่วย (Patient)</span>
              </p>
              <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <strong style={{ color: '#64748b', fontWeight: 500 }}>รหัสผู้ป่วย (HN):</strong> 
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{patient.HN}</span>
              </p>
              <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <strong style={{ color: '#64748b', fontWeight: 500 }}>ชื่อ-นามสกุล:</strong> 
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{patient.first_name} {patient.last_name}</span>
              </p>
              <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <strong style={{ color: '#64748b', fontWeight: 500 }}>เพศ:</strong> 
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{patient.gender === 'Male' ? 'ชาย' : patient.gender === 'Female' ? 'หญิง' : patient.gender}</span>
              </p>
              <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <strong style={{ color: '#64748b', fontWeight: 500 }}>วันเกิด:</strong> 
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatDateTH(patient.birth_date)}</span>
              </p>
              <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <strong style={{ color: '#64748b', fontWeight: 500 }}>เบอร์โทรศัพท์:</strong> 
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{patient.phone || '-'}</span>
              </p>
              <p style={{ margin: 0, fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <strong style={{ color: '#64748b', fontWeight: 500 }}>วันที่เริ่มการรักษา:</strong> 
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatDateTH(patient.admit_date)}</span>
              </p>
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
