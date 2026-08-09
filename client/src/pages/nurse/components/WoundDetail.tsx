import { useState, useEffect, type FormEvent } from 'react';
import styles from '../NursePage.module.css';
import { api, BACKEND_URL } from '../../../services/api';
import type { Patient, Wound, WoundRecord, Appointment } from '../../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WoundDetailProps {
  HN: string;
  onBackToSearch: () => void;
  onSwitchTab: (tab: 'dashboard' | 'search' | 'upload' | 'detail') => void;
  activeTab: string;
}

interface BodyPartItem {
  body_part_id: string;
  body_part_name: string;
}

export default function WoundDetail({ HN, onBackToSearch, onSwitchTab, activeTab }: WoundDetailProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [wounds, setWounds] = useState<Wound[]>([]);
  const [selectedWoundId, setSelectedWoundId] = useState<string>('');
  const [records, setRecords] = useState<WoundRecord[]>([]);
  const [bodyParts, setBodyParts] = useState<BodyPartItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [woundsLatestSizes, setWoundsLatestSizes] = useState<{ [woundId: string]: string }>({});

  // Segment sub-tabs tracking (Fig 4.12 - 4.14)
  const [subTab, setSubTab] = useState<'info' | 'history' | 'graph'>('info');

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New wound case modal form states
  const [showCreateWound, setShowCreateWound] = useState(false);
  const [newBodyPartId, setNewBodyPartId] = useState('');
  const [newSide, setNewSide] = useState('เท้าซ้าย');
  const [creatingWound, setCreatingWound] = useState(false);
  const [showMaskRecordIds, setShowMaskRecordIds] = useState<number[]>([]);

  const [appointmentDate, setAppointmentDate] = useState('');
  const [hourInput, setHourInput] = useState('00');
  const [minuteInput, setMinuteInput] = useState('00');
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [appointmentNote, setAppointmentNote] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Derived appointmentTime format string (eliminates redundant state & sync useEffect)
  const appointmentTime = `${hourInput}:${minuteInput}`;

  // Thai months array for custom calendar
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Helper function to build calendar days matrix
  const generateCalendarDays = () => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const daysArr: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      daysArr.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      daysArr.push(i);
    }
    return daysArr;
  };

  const handlePrevMonth = () => {
    setCurrentCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const year = currentCalendarMonth.getFullYear();
    const month = String(currentCalendarMonth.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    setAppointmentDate(`${year}-${month}-${d}`);
    setShowDatePickerModal(false);
  };

  // Fetch patient profile, wounds list, body parts list, and appointments from backend in a single request
  const fetchPatientAndWoundsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.get<any>(`/patients/${HN}/detail`);

      setPatient(data.patient);
      setWounds(data.wounds);
      setBodyParts(data.body_parts);
      setAppointments(data.appointments);

      // Calculate latest size for each wound instantly from memory (0ms)
      const sizesMap: { [woundId: string]: string } = {};
      data.wounds.forEach((w: any) => {
        const recordsList = w.records || [];
        if (recordsList.length > 0) {
          const sorted = [...recordsList].sort(
            (a: any, b: any) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
          );
          sizesMap[w.wound_id] = `${sorted[sorted.length - 1].area_cm2} cm²`;
        } else {
          sizesMap[w.wound_id] = 'ยังไม่มีประวัติ';
        }
      });
      setWoundsLatestSizes(sizesMap);

      if (data.body_parts.length > 0) {
        setNewBodyPartId(data.body_parts[0].body_part_id);
      }

      if (data.wounds.length > 0) {
        setSelectedWoundId(data.wounds[0].wound_id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load patient wound details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'detail') {
      fetchPatientAndWoundsData();
    }
  }, [HN, activeTab]);

  // Retrieve records for the selected wound from in-memory state
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
      setWoundsLatestSizes(prev => ({
        ...prev,
        [newWound.wound_id]: 'ยังไม่มีประวัติ'
      }));
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
      setHourInput('09');
      setMinuteInput('00');
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

  // Fetch the next upcoming appointment for this patient (closest to today)
  const latestAppointment = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Midnight today boundary

    const patientAppts = appointments.filter(app => app.HN === HN);
    if (patientAppts.length === 0) return undefined;

    // Safe parser helper to prevent NaN sort breaks
    const parseApptDateTime = (dateStr: string, timeStr?: string) => {
      if (!dateStr) return 0;
      const cleanTime = timeStr ? timeStr.slice(0, 5) : '00:00';
      const parsed = new Date(`${dateStr}T${cleanTime}`);
      return isNaN(parsed.getTime()) ? new Date(dateStr).getTime() : parsed.getTime();
    };

    const upcomingAppts = patientAppts.filter(app => {
      const apptMs = parseApptDateTime(app.appointment_date, app.appointment_time);
      return apptMs >= today.getTime();
    });

    if (upcomingAppts.length === 0) {
      // Fallback: Show the most recent past appointment (descending sort)
      return patientAppts.sort((a, b) => 
        parseApptDateTime(b.appointment_date, b.appointment_time) - 
        parseApptDateTime(a.appointment_date, a.appointment_time)
      )[0];
    }

    // Upcoming appointments present: sort ascending to get the closest one
    return upcomingAppts.sort((a, b) => 
      parseApptDateTime(a.appointment_date, a.appointment_time) - 
      parseApptDateTime(b.appointment_date, b.appointment_time)
    )[0];
  })();

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
  const overallStatus = wounds.length > 0 ? getWoundStatus(records) : 'คงที่';
  const age = calculateAge(patient.birth_date);

  return (
    <div className={styles.fadeUp}>
      {/* Return button and Patient header */}
      <button onClick={onBackToSearch} className={styles.backBtn}>
        ← ย้อนกลับ
      </button>

      {/* Blue Header Card containing Patient profile (Fig 4.12 Mockup) */}
      <div className={styles.detailPatientCard}>
        <div className={styles.detailPatientHeader}>
          <div className={styles.detailUserAvatar}>
            {(patient.first_name ? patient.first_name[0] : 'P').toUpperCase()}
          </div>
          <div>
            <h3 className={styles.detailPatientName}>{patient.first_name} {patient.last_name}</h3>
            <span className={styles.detailPatientSubtext}>
              {patient.HN} · อายุ {age} ปี · {wounds.length} แผล
            </span>
          </div>
        </div>
        <span className={`${styles.statusBadgeRow} ${overallStatus === 'ดีขึ้น' ? styles.statusGreen :
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
            <div className={styles.formGroupCompact} style={{ marginBottom: '12px' }}>
              <label>ตำแหน่งแผล</label>
              <div className={styles.pillsContainer}>
                {bodyParts.map(bp => {
                  const thName = bp.body_part_name.split(' (')[0];
                  const enName = bp.body_part_name.includes(' (') 
                    ? bp.body_part_name.split(' (')[1].replace(')', '') 
                    : '';
                  return (
                    <button 
                      key={bp.body_part_id}
                      type="button"
                      className={`${styles.pillBtn} ${newBodyPartId === bp.body_part_id ? styles.active : ''}`}
                      onClick={() => setNewBodyPartId(bp.body_part_id)}
                    >
                      <span className={styles.pillThText}>{thName}</span>
                      {enName && <span className={styles.pillEnText}>{enName}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.formGroupCompact} style={{ marginBottom: '16px' }}>
              <label>ข้าง</label>
              <div className={styles.sideButtonsRow}>
                <button
                  type="button"
                  className={`${styles.sideSelectBtn} ${styles.leftFoot} ${newSide === 'เท้าซ้าย' ? styles.active : ''}`}
                  onClick={() => setNewSide('เท้าซ้าย')}
                >
                  เท้าซ้าย
                </button>
                <button
                  type="button"
                  className={`${styles.sideSelectBtn} ${styles.rightFoot} ${newSide === 'เท้าขวา' ? styles.active : ''}`}
                  onClick={() => setNewSide('เท้าขวา')}
                >
                  เท้าขวา
                </button>
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
              {wounds.map(w => {
                const statusOfWound = getWoundStatus(w.records || []);
                return (
                  <div
                    key={w.wound_id}
                    className={`${styles.woundSelectItemCard} ${selectedWoundId === w.wound_id ? styles.active : ''}`}
                    onClick={() => setSelectedWoundId(w.wound_id)}
                  >
                    <div className={styles.woundSelectText}>
                      <span className={styles.woundSelectLoc}>{w.body_part?.body_part_name || 'ไม่ระบุตำแหน่ง'} {w.side}</span>
                      <span className={styles.woundSelectCase} style={{ fontSize: '11px', marginTop: '2px', color: '#64748b' }}>
                        ขนาดล่าสุด: {woundsLatestSizes[w.wound_id] || 'กำลังโหลด...'}
                      </span>
                    </div>
                    <span className={`${styles.statusBadgeRow} ${statusOfWound === 'ดีขึ้น' ? styles.statusGreen :
                      statusOfWound === 'แย่ลง' ? styles.statusRed :
                        styles.statusGray
                      }`}>
                      {statusOfWound}
                    </span>
                  </div>
                );
              })}
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
                  {records.length > 0 ? `${records[0].area_cm2} cm²` : 'ไม่มีประวัติคำนวณ'}
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
                <span className={styles.apptLabel}>วันนัด</span>
                <h5 className={styles.apptDetails}>
                  📅 {formatDateTH(latestAppointment.appointment_date)} · ⏱️ {latestAppointment.appointment_time.slice(0, 5)} น.
                </h5>
                {latestAppointment.note && (
                  <p className={styles.apptNote}>{latestAppointment.note}</p>
                )}
              </div>
            )}

            <form onSubmit={handleBookAppointment} className={styles.bookingForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroupCompact}>
                  <label>วันที่นัดหมาย</label>
                  <button
                    type="button"
                    onClick={() => setShowDatePickerModal(true)}
                    className={styles.datePickerButtonDisplay}
                  >
                    📅 {appointmentDate ? formatDateTH(appointmentDate) : 'เลือกวันที่...'}
                  </button>
                </div>
                <div className={styles.formGroupCompact}>
                  <label>เวลานัดหมาย</label>
                  <button
                    type="button"
                    onClick={() => setShowTimePickerModal(true)}
                    className={styles.timePickerButtonDisplay}
                  >
                    ⏱️ {hourInput}:{minuteInput} น.
                  </button>
                </div>
              </div>
              <div className={styles.formGroupCompact} style={{ marginTop: '12px' }}>
                <label>หมายเหตุการนัด</label>
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
            <div className={styles.woundHistoryImagesScrollRow}>
              {records.map(record => {
                const isMask = showMaskRecordIds.includes(record.record_id);
                const imageUrl = isMask
                  ? `${BACKEND_URL}/${record.image_path.replace('/combined/', '/mask/').replace('_combined.jpg', '_mask.png')}`
                  : `${BACKEND_URL}/${record.image_path}`;
                return (
                  <div key={record.record_id} className={styles.historyThumbCard}>
                    <div 
                      className={styles.thumbImageWrapper}
                      onClick={() => {
                        setShowMaskRecordIds(prev => 
                          prev.includes(record.record_id) 
                            ? prev.filter(id => id !== record.record_id) 
                            : [...prev, record.record_id]
                        );
                      }}
                      style={{ cursor: 'pointer', position: 'relative' }}
                    >
                      <img
                        src={imageUrl}
                        alt="Wound treatment track history"
                        className={styles.thumbImg}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/180x180?text=No+Wound+Image';
                        }}
                      />
                      <span style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '4px',
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        color: '#ffffff',
                        fontSize: '8px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        pointerEvents: 'none'
                      }}>
                        {isMask ? 'Mask' : 'ภาพวิเคราะห์'}
                      </span>
                    </div>
                  <div className={styles.thumbMetaInfo}>
                    <span className={styles.thumbAreaSize}>{record.area_cm2} cm²</span>
                    <span className={styles.thumbDate}>{formatDateTH(record.record_date)}</span>
                    {record.note && <p className={styles.thumbNote}>📝 บันทึกอาการ: {record.note}</p>}
                  </div>
                </div>
              );
            })}
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
          ) : (() => {
            const chronologicalRecords = [...records].sort(
              (a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
            );
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
                        {diff < 0 ? `ลดลง ${percentChange}%` : diff > 0 ? `เพิ่มขึ้น ${percentChange}%` : 'คงที่'}
                      </div>
                      <div style={{ 
                        fontSize: '9px', 
                        color: diff < 0 ? '#16a34a' : diff > 0 ? '#dc2626' : '#94a3b8', 
                        marginTop: '2px' 
                      }}>
                        {diff < 0 ? 'ดีขึ้น' : diff > 0 ? 'แย่ลง' : 'ไม่มีการเปลี่ยนแปลง'}
                      </div>
                    </div>

                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
      {/* Custom Time Picker Modal overlay */}
      {showTimePickerModal && (
        <div className={styles.customTimePickerOverlay}>
          <div className={styles.customTimePickerModalCard}>
            <h4>เลือกเวลานัดหมาย</h4>
            
            <div className={styles.customTimePickerColumns}>
              {/* Hour Column */}
              <div className={styles.customTimePickerColumn}>
                <div className={styles.columnLabel}>ชั่วโมง</div>
                <div className={styles.columnScrollList}>
                  {Array.from({ length: 24 }, (_, i) => i < 10 ? '0' + i : String(i)).map(h => (
                    <div
                      key={h}
                      onClick={() => setHourInput(h)}
                      className={`${styles.customTimePickerItem} ${hourInput === h ? styles.active : ''}`}
                    >
                      {h}
                    </div>
                  ))}
                </div>
              </div>

              <span className={styles.pickerColonSeparator}>:</span>

              {/* Minute Column */}
              <div className={styles.customTimePickerColumn}>
                <div className={styles.columnLabel}>นาที</div>
                <div className={styles.columnScrollList}>
                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                    <div
                      key={m}
                      onClick={() => setMinuteInput(m)}
                      className={`${styles.customTimePickerItem} ${minuteInput === m ? styles.active : ''}`}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.customTimePickerActions}>
              <button
                type="button"
                className={styles.pickerCancelBtn}
                onClick={() => setShowTimePickerModal(false)}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className={styles.pickerConfirmBtn}
                onClick={() => setShowTimePickerModal(false)}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Calendar Date Picker Modal overlay */}
      {showDatePickerModal && (
        <div className={styles.customDatePickerOverlay}>
          <div className={styles.customDatePickerModalCard}>
            <div className={styles.calendarHeader}>
              <button type="button" onClick={handlePrevMonth} className={styles.calendarNavBtn}>◀</button>
              <span className={styles.calendarMonthTitle}>
                {thaiMonths[currentCalendarMonth.getMonth()]} {currentCalendarMonth.getFullYear() + 543}
              </span>
              <button type="button" onClick={handleNextMonth} className={styles.calendarNavBtn}>▶</button>
            </div>
            
            <div className={styles.calendarWeekdaysGrid}>
              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, idx) => (
                <div key={idx} className={styles.weekdayLabel} style={{ color: idx === 0 ? '#ef4444' : '#64748b' }}>
                  {day}
                </div>
              ))}
            </div>

            <div className={styles.calendarDaysGrid}>
              {generateCalendarDays().map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className={styles.emptyDayCell} />;
                }
                
                const formattedDate = `${currentCalendarMonth.getFullYear()}-${String(currentCalendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = appointmentDate === formattedDate;
                
                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`${styles.calendarDayBtn} ${isSelected ? styles.active : ''}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className={styles.calendarCloseBtn}
              onClick={() => setShowDatePickerModal(false)}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
