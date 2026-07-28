import { useState, useEffect, type FormEvent } from 'react';
import styles from '../NursePage.module.css';
import { api } from '../../../services/api';
import type { Patient, Wound, WoundRecord, Appointment } from '../../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WoundDetailProps {
  HN: string;
  onBackToSearch: () => void;
  onSwitchTab: (tab: 'dashboard' | 'search' | 'upload' | 'detail') => void;
}

interface BodyPartItem {
  body_part_id: string;
  body_part_name: string;
}

export default function WoundDetail({ HN, onBackToSearch, onSwitchTab }: WoundDetailProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [wounds, setWounds] = useState<Wound[]>([]);
  const [selectedWoundId, setSelectedWoundId] = useState<string>('');
  const [records, setRecords] = useState<WoundRecord[]>([]);
  const [bodyParts, setBodyParts] = useState<BodyPartItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Segment sub-tabs tracking (Fig 4.12 - 4.14)
  const [subTab, setSubTab] = useState<'info' | 'history' | 'graph'>('info');

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New wound case modal form states
  const [showCreateWound, setShowCreateWound] = useState(false);
  const [newBodyPartId, setNewBodyPartId] = useState('');
  const [newSide, setNewSide] = useState('ด้านบน');
  const [creatingWound, setCreatingWound] = useState(false);

  // Appointment states
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentNote, setAppointmentNote] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Fetch patient profile, wounds list, body parts list, and appointments from backend
  const fetchPatientAndWoundsData = async () => {
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
        throw new Error('ไม่พบข้อมูลประวัติคนไข้รายนี้');
      }

      setPatient(currentPatient);
      setWounds(woundsData);
      setBodyParts(bodyPartsData);
      setAppointments(appointmentsList);
      
      if (bodyPartsData.length > 0) {
        setNewBodyPartId(bodyPartsData[0].body_part_id);
      }
      
      // Auto-select the first wound if available
      if (woundsData.length > 0) {
        setSelectedWoundId(woundsData[0].wound_id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load patient wound details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch records of the selected wound
  const fetchWoundRecords = async (woundId: string) => {
    try {
      const data = await api.get<WoundRecord[]>(`/wounds/${woundId}/records`);
      setRecords(data);
    } catch (err: any) {
      console.error('Failed to load wound records:', err);
    }
  };

  useEffect(() => {
    fetchPatientAndWoundsData();
  }, [HN]);

  useEffect(() => {
    if (selectedWoundId) {
      fetchWoundRecords(selectedWoundId);
    } else {
      setRecords([]);
    }
  }, [selectedWoundId]);

  // Submit handler to open a new wound case
  const handleCreateWound = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBodyPartId) return;

    try {
      setCreatingWound(true);
      const newWound = await api.post<Wound>('/wounds/', {
        HN,
        body_part_id: newBodyPartId,
        side: newSide
      });
      setWounds(prev => [newWound, ...prev]);
      setSelectedWoundId(newWound.wound_id);
      setShowCreateWound(false);
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถเปิดเคสแผลใหม่ได้');
    } finally {
      setCreatingWound(false);
    }
  };

  // Submit handler to book the next appointment
  const handleBookAppointment = async (e: FormEvent) => {
    e.preventDefault();
    if (!appointmentDate || !appointmentTime) {
      alert('กรุณากรอกวันที่และเวลานัดหมาย');
      return;
    }

    try {
      setBookingStatus('loading');
      const newAppt = await api.post<Appointment>('/appointment/', {
        HN,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        note: appointmentNote
      });
      setAppointments(prev => [newAppt, ...prev]);
      setBookingStatus('success');
      setAppointmentDate('');
      setAppointmentTime('');
      setAppointmentNote('');
      setTimeout(() => setBookingStatus('idle'), 3000);
    } catch (err: any) {
      console.error(err);
      setBookingStatus('error');
    }
  };

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

  // Check the progress of a specific wound case (ดีขึ้น / แย่ลง / คงที่)
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

  // Get active wound details
  const activeWound = wounds.find(w => w.wound_id === selectedWoundId);
  const activeWoundStatus = getWoundStatus(records);

  // Map wound records to charting data coordinates
  const chartData = records.map(r => ({
    dateStr: formatDateTH(r.record_date),
    size: r.area_cm2
  }));

  // Fetch the latest booked appointment for this patient if any
  const latestAppointment = appointments
    .filter(app => app.HN === HN)
    .sort((a, b) => new Date(b.appointment_date + 'T' + b.appointment_time).getTime() - new Date(a.appointment_date + 'T' + a.appointment_time).getTime())[0];

  if (loading) {
    return (
      <div className={styles.pageLoading}>
        <p>กำลังโหลดรายละเอียดข้อมูลแผล...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className={styles.pageError}>
        <p>{error || 'ไม่พบข้อมูลคนไข้'}</p>
        <button onClick={onBackToSearch} className={styles.retryBtn}>กลับหน้าค้นหา</button>
      </div>
    );
  }

  // Calculate overall patient status based on all wound records
  const overallStatus = wounds.length > 0 ? activeWoundStatus : 'คงที่';
  const age = calculateAge(patient.birth_date);

  return (
    <div className={styles.fadeUp}>
      {/* Return button and Patient header */}
      <button onClick={onBackToSearch} className={styles.backBtn}>
        ⬅️ รายละเอียดผู้ป่วย
      </button>

      {/* Blue Header Card containing Patient profile (Fig 4.12 Mockup) */}
      <div className={styles.detailPatientCard}>
        <div className={styles.detailPatientHeader}>
          <div className={styles.detailUserAvatar}>ม</div>
          <div>
            <h3 className={styles.detailPatientName}>{patient.first_name} {patient.last_name}</h3>
            <span className={styles.detailPatientSubtext}>
              {patient.HN} · อายุ {age} ปี · {wounds.length} แผล
            </span>
          </div>
        </div>
        <span className={`${styles.statusBadgeRow} ${
          overallStatus === 'ดีขึ้น' ? styles.statusGreen : 
          overallStatus === 'แย่ลง' ? styles.statusRed : 
          styles.statusGray
        }`}>
          {overallStatus}
        </span>
      </div>

      {/* Sub-tabs segment navigation (Fig 4.12 - 4.14 tabs bar) */}
      <div className={styles.segmentedTabsBar}>
        <button 
          onClick={() => setSubTab('info')}
          className={`${styles.segmentTabBtn} ${subTab === 'info' ? styles.active : ''}`}
        >
          ข้อมูล
        </button>
        <button 
          onClick={() => setSubTab('history')}
          className={`${styles.segmentTabBtn} ${subTab === 'history' ? styles.active : ''}`}
        >
          ประวัติ
        </button>
        <button 
          onClick={() => setSubTab('graph')}
          className={`${styles.segmentTabBtn} ${subTab === 'graph' ? styles.active : ''}`}
        >
          กราฟ
        </button>
      </div>

      {/* --- Wound Case Selector (Common to all tabs) --- */}
      <div className={styles.sectionCard}>
        <div className={styles.cardHeaderFlex}>
          <h4 className={styles.sectionTitle}>เลือกแผล</h4>
          <button 
            onClick={() => setShowCreateWound(!showCreateWound)} 
            className={styles.addWoundBtn}
          >
            {showCreateWound ? '✖️ ยกเลิก' : '➕ เปิดเคสแผลใหม่'}
          </button>
        </div>

        {showCreateWound && (
          <form onSubmit={handleCreateWound} className={styles.createWoundForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroupCompact}>
                <label>ตำแหน่งอวัยวะ (ดึงจากฐานข้อมูล)</label>
                <select 
                  value={newBodyPartId} 
                  onChange={e => setNewBodyPartId(e.target.value)}
                  className={styles.selectField}
                >
                  {bodyParts.map(bp => (
                    <option key={bp.body_part_id} value={bp.body_part_id}>
                      {bp.body_part_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroupCompact}>
                <label>ด้าน/ข้าง</label>
                <select 
                  value={newSide} 
                  onChange={e => setNewSide(e.target.value)}
                  className={styles.selectField}
                >
                  <option value="ด้านบน">ด้านบน</option>
                  <option value="ด้านล่าง">ด้านล่าง</option>
                  <option value="ด้านใน">ด้านใน</option>
                  <option value="ด้านนอก">ด้านนอก</option>
                </select>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={creatingWound || bodyParts.length === 0} 
              className={styles.submitWoundBtn}
            >
              {creatingWound ? 'กำลังบันทึก...' : '💾 บันทึกเปิดเคสรักษา'}
            </button>
          </form>
        )}

        <div className={styles.woundSelectorContainer}>
          {wounds.length === 0 ? (
            <p className={styles.emptyText}>คนไข้รายนี้ยังไม่มีเคสแผลที่ลงทะเบียนไว้</p>
          ) : (
            <div className={styles.woundsGridSelector}>
              {wounds.map(w => (
                <div 
                  key={w.wound_id}
                  className={`${styles.woundSelectItemCard} ${selectedWoundId === w.wound_id ? styles.active : ''}`}
                  onClick={() => setSelectedWoundId(w.wound_id)}
                >
                  <div className={styles.woundSelectText}>
                    <span className={styles.woundSelectLoc}>{w.body_part?.body_part_name || 'ไม่ระบุตำแหน่ง'} {w.side}</span>
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
      </div>

      {/* --- TAB 1: ข้อมูล (Info Tab - Fig 4.12) --- */}
      {subTab === 'info' && selectedWoundId && activeWound && (
        <>
          {/* Wound info summary */}
          <div className={styles.sectionCard}>
            <h4 className={styles.sectionTitle}>ข้อมูลแผล</h4>
            <div className={styles.woundDataInfoBlock}>
              <div className={styles.infoMetaRow}>
                <span className={styles.infoMetaLabel}>ตำแหน่ง</span>
                <span className={styles.infoMetaVal}>{activeWound.body_part?.body_part_name} ({activeWound.side})</span>
              </div>
              <div className={styles.infoMetaRow}>
                <span className={styles.infoMetaLabel}>ขนาดล่าสุด</span>
                <span className={styles.infoMetaVal}>
                  {records.length > 0 ? `${records[records.length - 1].area_cm2} cm²` : 'ไม่มีประวัติคำนวณ'}
                </span>
              </div>
              <div className={styles.infoMetaRow}>
                <span className={styles.infoMetaLabel}>เข้ารับการรักษา</span>
                <span className={styles.infoMetaVal}>{formatDateTH(patient.admit_date)}</span>
              </div>
              <div className={styles.infoMetaRow}>
                <span className={styles.infoMetaLabel}>เบอร์โทร</span>
                <span className={styles.infoMetaVal}>{patient.phone}</span>
              </div>
            </div>
          </div>

          {/* Next Appointment section */}
          <div className={styles.sectionCard}>
            <h4 className={styles.sectionTitle}>นัดครั้งถัดไป</h4>
            {latestAppointment && (
              <div className={styles.currentAppointmentCard}>
                <span className={styles.apptLabel}>วันนัดปัจจุบัน</span>
                <h5 className={styles.apptDetails}>
                  📅 {formatDateTH(latestAppointment.appointment_date)} · ⏱️ {latestAppointment.appointment_time.slice(0, 5)} น.
                </h5>
                {latestAppointment.note && (
                  <p className={styles.apptNote}>💡 {latestAppointment.note}</p>
                )}
              </div>
            )}

            <form onSubmit={handleBookAppointment} className={styles.bookingForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroupCompact}>
                  <label>วันที่นัดหมาย</label>
                  <input 
                    type="date" 
                    value={appointmentDate}
                    onChange={e => setAppointmentDate(e.target.value)}
                    className={styles.inputFieldCompact}
                  />
                </div>
                <div className={styles.formGroupCompact}>
                  <label>เวลานัดหมาย</label>
                  <input 
                    type="time" 
                    value={appointmentTime}
                    onChange={e => setAppointmentTime(e.target.value)}
                    className={styles.inputFieldCompact}
                  />
                </div>
              </div>
              <div className={styles.formGroupCompact} style={{ marginTop: '12px' }}>
                <label>หมายเหตุการทำนัด</label>
                <input 
                  type="text" 
                  placeholder="ป้อนรายละเอียดนัด..."
                  value={appointmentNote}
                  onChange={e => setAppointmentNote(e.target.value)}
                  className={styles.inputFieldCompact}
                />
              </div>
              
              <button 
                type="submit" 
                disabled={bookingStatus === 'loading'}
                className={styles.submitBookingBtn}
              >
                {bookingStatus === 'loading' ? 'กำลังบันทึกนัดหมาย...' : 'บันทึกนัด'}
              </button>

              {bookingStatus === 'success' && (
                <p className={styles.successMessage}>✅ บันทึกนัดหมายสำเร็จ!</p>
              )}
              {bookingStatus === 'error' && (
                <p className={styles.errorMessage}>❌ ไม่สามารถบันทึกนัดหมายได้</p>
              )}
            </form>
          </div>

          {/* Large Action button to upload image */}
          <button 
            onClick={() => onSwitchTab('upload')}
            className={styles.giantUploadBtn}
          >
            อัปโหลดภาพแผลใหม่
          </button>
        </>
      )}

      {/* --- TAB 2: ประวัติ (History Tab - Fig 4.13) --- */}
      {subTab === 'history' && selectedWoundId && (
        <div className={styles.sectionCard}>
          <h4 className={styles.sectionTitle}>ประวัติแผล ({records.length})</h4>
          {records.length === 0 ? (
            <p className={styles.emptyText}>ยังไม่พบประวัติอัปเดตรูปภาพแผล</p>
          ) : (
            <div className={styles.woundHistoryImagesGrid}>
              {records.map(record => (
                <div key={record.record_id} className={styles.historyThumbCard}>
                  <div className={styles.thumbImageWrapper}>
                    <img 
                      src={`http://localhost:8000/${record.image_path}`} 
                      alt="Wound treatment track history" 
                      className={styles.thumbImg}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/180x180?text=No+Wound+Image';
                      }}
                    />
                  </div>
                  <div className={styles.thumbMetaInfo}>
                    <span className={styles.thumbAreaSize}>{record.area_cm2} cm²</span>
                    <span className={styles.thumbDate}>{formatDateTH(record.record_date)}</span>
                    {record.note && <p className={styles.thumbNote}>💡 {record.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: กราฟ (Graph Tab - Fig 4.14) --- */}
      {subTab === 'graph' && selectedWoundId && (
        <div className={styles.sectionCard}>
          <h4 className={styles.sectionTitle}>กราฟแนวโน้มการเปลี่ยนแปลงขนาดแผล</h4>
          {records.length < 2 ? (
            <p className={styles.emptyText}>ต้องการประวัติบันทึกแผลอย่างน้อย 2 ครั้ง เพื่อสร้างกราฟเปรียบเทียบแนวโน้ม</p>
          ) : (
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dateStr" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
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
