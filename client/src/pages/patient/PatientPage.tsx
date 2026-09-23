import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from '../nurse/NursePage.module.css'; // Re-use consistent layout styles
import { api, BACKEND_URL } from '../../services/api';
import type { Patient, Wound, WoundRecord, Appointment } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Maximize2, X, Calendar, Clock, ClipboardList } from 'lucide-react';

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
  const [previewRecord, setPreviewRecord] = useState<WoundRecord | null>(null);
  const [previewTab, setPreviewTab] = useState<'combined' | 'mask'>('combined');

  // Interactive Hybrid Calendar states
  const [apptViewMode, setApptViewMode] = useState<'calendar' | 'list'>('list');
  const [showAllAppts, setShowAllAppts] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [selectedInlineDate, setSelectedInlineDate] = useState<string | null>(null);

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

      const safeWounds = woundsData || [];
      const safeAppointments = appointmentsList || [];

      setPatient(patientData);
      setWounds(safeWounds);
      setAppointments(safeAppointments);

      if (safeWounds.length > 0) {
        setSelectedWoundId(safeWounds[0].wound_id);
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

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

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


  const getWoundStatus = (recordsList: WoundRecord[]) => {
    if (recordsList.length < 2) return 'คงที่';
    const sorted = [...recordsList].sort(
      (a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
    );
    const previous = sorted[sorted.length - 2]; // Second newest record
    const latest = sorted[sorted.length - 1]; // Newest record
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

  // Render helper for Wound Selector Card
  const renderWoundSelector = () => (
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

            let overallText = 'คงที่';
            if (recordsList.length >= 2) {
              const sorted = [...recordsList].sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());
              const initial = sorted[0];
              const latest = sorted[sorted.length - 1];
              const diff = latest.area_cm2 - initial.area_cm2;
              const pct = initial.area_cm2 > 0
                ? ((Math.abs(diff) / initial.area_cm2) * 100).toFixed(1)
                : '0.0';
              if (diff < -0.001) overallText = `ลดลง ${pct}%`;
              else if (diff > 0.001) overallText = `เพิ่มขึ้น ${pct}%`;
              else overallText = 'คงที่';
            }

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
                  <span style={{
                    fontSize: '10px',
                    marginTop: '2px',
                    fontWeight: 600,
                    color: overallText.includes('ลดลง') ? '#16a34a' : overallText.includes('เพิ่มขึ้น') ? '#dc2626' : '#64748b'
                  }}>
                    เทียบวันแรก: {overallText}
                  </span>
                </div>
                <span className={`${styles.statusBadgeRow} ${w.is_active === false ? styles.statusGray :
                  woundStatus === 'ดีขึ้น' ? styles.statusGreen :
                    woundStatus === 'แย่ลง' ? styles.statusRed :
                      styles.statusGray
                  }`}>
                  {w.is_active === false ? 'ปิดเคสแล้ว' : `เทียบครั้งก่อน: ${woundStatus}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render helper for Wound Info Details Card
  const renderWoundInfo = () => {
    if (!selectedWoundId || !activeWound) return null;

    const initialRec = records.length > 0 ? records[records.length - 1] : null;
    const firstDate = initialRec ? formatDateTH(initialRec.record_date) : 'ยังไม่มีการบันทึก'

    return (
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
            <span className={styles.infoMetaLabel}>วันที่เริ่มบันทึกแผล</span>
            <span className={styles.infoMetaVal}>{firstDate}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render helper for Appointments Card
  const renderAppointments = () => {
    const latestAppointment = myAppointments.length > 0 ? myAppointments[0] : null;

    return (
      <div className={styles.sectionCard}>
        <div className={styles.calendarHeaderRow}>
          <h4 className={styles.sectionTitle} style={{ margin: 0 }}>ตารางนัดหมาย</h4>
          <div className={styles.viewModeToggle}>
            <button
              type="button"
              className={`${styles.viewModeBtn} ${apptViewMode === 'calendar' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setApptViewMode('calendar')}
            >
              <Calendar size={13} /> ปฏิทิน
            </button>
            <button
              type="button"
              className={`${styles.viewModeBtn} ${apptViewMode === 'list' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setApptViewMode('list')}
            >
              <ClipboardList size={13} /> รายการ
            </button>
          </div>
        </div>

        {/* Upcoming Appointment Highlight Banner */}
        {latestAppointment ? (
          <div className={styles.currentAppointmentCard} style={{ marginBottom: '14px' }}>
            <span className={styles.apptLabel}>นัดครั้งถัดไป</span>
            <h5 className={styles.apptDetails} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} style={{ color: '#2563eb' }} /> {formatDateTH(latestAppointment.appointment_date)}  <Clock size={15} style={{ color: '#2563eb' }} /> {latestAppointment.appointment_time ? latestAppointment.appointment_time.slice(0, 5) : '09:00'} น.
            </h5>
            {latestAppointment.note && (
              <p className={styles.apptNote}>{latestAppointment.note}</p>
            )}
          </div>
        ) : (
          <p className={styles.emptyText} style={{ margin: '8px 0 14px 0', color: '#64748b', fontSize: '13px' }}>
            คุณไม่มีรายการนัดหมายในช่วงนี้
          </p>
        )}

        {/* VIEW MODE 1: Interactive Inline Calendar View */}
        {apptViewMode === 'calendar' && (
          <div className={styles.hybridCalendarSection}>
            <div className={styles.inlineCalendarCard}>
              <div className={styles.inlineMonthNavRow}>
                <button type="button" onClick={handlePrevMonth} className={styles.inlineMonthNavBtn}>◀</button>
                <span className={styles.inlineMonthTitle}>
                  {thaiMonths[currentCalendarMonth.getMonth()]} {currentCalendarMonth.getFullYear() + 543}
                </span>
                <button type="button" onClick={handleNextMonth} className={styles.inlineMonthNavBtn}>▶</button>
              </div>

              <div className={styles.inlineWeekdayGrid}>
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, idx) => (
                  <div key={idx} className={styles.inlineWeekdayLabel} style={{ color: idx === 0 ? '#ef4444' : '#64748b' }}>
                    {day}
                  </div>
                ))}
              </div>

              <div className={styles.inlineDaysGrid}>
                {generateCalendarDays().map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} style={{ aspectRatio: '1' }} />;
                  }

                  const dateStr = `${currentCalendarMonth.getFullYear()}-${String(currentCalendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const now = new Date();
                  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  const isToday = dateStr === todayStr;
                  const isSelected = selectedInlineDate === dateStr;

                  const dayAppts = (myAppointments || []).filter(a => a && a.appointment_date && a.appointment_date.startsWith(dateStr));
                  const hasAppt = dayAppts.length > 0;

                  return (
                    <button
                      key={`day-${day}`}
                      type="button"
                      onClick={() => {
                        setSelectedInlineDate(prev => prev === dateStr ? null : dateStr);
                      }}
                      className={`${styles.inlineDayBtn} ${isToday ? styles.inlineDayToday : ''} ${isSelected ? styles.inlineDayActive : ''}`}
                    >
                      <span>{day}</span>
                      {hasAppt && <span className={styles.calendarDot} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Details Panel */}
            {selectedInlineDate && (() => {
              const dayAppts = (myAppointments || []).filter(a => a && a.appointment_date && a.appointment_date.startsWith(selectedInlineDate));
              return (
                <div className={styles.selectedDayDetailsPanel}>
                  <div className={styles.selectedDayHeader}>
                    <span className={styles.selectedDayTitle}>
                      คิวนัดวันที่ {formatDateTH(selectedInlineDate)}
                    </span>
                  </div>
                  {dayAppts.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      ไม่มีรายการนัดหมายในวันนี้
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {dayAppts.map(appt => (
                        <div key={appt.appointment_id} style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
                            เวลา: {appt.appointment_time ? appt.appointment_time.slice(0, 5) : '09:00'} น.
                          </div>
                          {appt.note && (
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                              หมายเหตุ: {appt.note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* VIEW MODE 2: Collapsible List View */}
        {apptViewMode === 'list' && (
          <div style={{ animation: 'fadeUp 0.3s' }}>
            {myAppointments.length > 1 && (
              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '12px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginBottom: showAllAppts ? '12px' : '16px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => setShowAllAppts(!showAllAppts)}
              >
                {showAllAppts
                  ? 'ซ่อนรายการนัดหมายเพิ่มเติม'
                  : `ดูรายการนัดหมายเพิ่มเติมอีก (${myAppointments.length - 1})`
                }
              </button>
            )}

            {showAllAppts && myAppointments.length > 1 && (
              <div className={styles.queueList} style={{ marginBottom: '16px', animation: 'fadeUp 0.25s' }}>
                {myAppointments.slice(1).map((appt) => (
                  <div key={appt.appointment_id} className={styles.queueItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        วันที่นัด: {formatDateTH(appt.appointment_date)}
                      </span>
                      <div className={styles.queueTime}>
                        เวลา: {appt.appointment_time ? appt.appointment_time.slice(0, 5) : '09:00'} น.
                      </div>
                    </div>
                    {appt.note && (
                      <div style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px dashed #cbd5e1', marginTop: '2px' }}>
                        หมายเหตุ: {appt.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render helper for Wound History Cards Grid
  const renderHistory = () => {
    if (!selectedWoundId) return null;
    return (
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
                    onClick={() => {
                      setPreviewRecord(record);
                      setPreviewTab('combined');
                    }}
                    style={{ cursor: 'pointer', position: 'relative' }}
                    title="คลิกเพื่อขยายดูภาพใหญ่"
                  >
                    <img
                      src={imageUrl}
                      alt="Wound history for patient"
                      className={styles.thumbImg}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/180x180?text=No+Wound+Image';
                      }}
                    />
                    <span className={styles.zoomOverlayBadge}>
                      <Maximize2 size={13} />
                    </span>
                  </div>
                  <div className={styles.thumbMetaInfo}>
                    <span className={styles.thumbAreaSize}>{record.area_cm2} cm²</span>
                    <span className={styles.thumbDate}>{formatDateTH(record.record_date)}</span>
                    {record.note && <p className={styles.thumbNote}>บันทึกการดูแล: {record.note}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render helper for Graph Component
  const renderGraph = () => {
    if (!selectedWoundId) return null;
    return (
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
            const cleanDate = r?.record_date ? r.record_date.split('T')[0] : '';
            const parts = cleanDate ? cleanDate.split('-') : [];
            let shortDate = r?.record_date || '-';
            if (parts.length === 3) {
              const yy = String(parseInt(parts[0]) + 543).slice(-2);
              const mm = parts[1];
              const dd = parts[2];
              shortDate = `${dd}/${mm}/${yy}`;
            }
            return {
              id: r.record_id,
              dateStr: shortDate,
              fullDateStr: formatDateTH(r?.record_date),
              size: r.area_cm2
            };
          });

          const parseSafeDate = (dStr?: string) => {
            if (!dStr) return null;
            const normalized = dStr.includes(' ') ? dStr.replace(' ', 'T') : dStr;
            const d = new Date(normalized);
            return isNaN(d.getTime()) ? null : d;
          };

          const activeWoundObj = wounds.find(w => w.wound_id === selectedWoundId);
          const startD = parseSafeDate(initialRec?.record_date) || parseSafeDate(activeWoundObj?.created_at) || new Date();
          let endD: Date;
          if (activeWoundObj?.is_active === false && activeWoundObj?.closed_at) {
            endD = parseSafeDate(activeWoundObj.closed_at) || parseSafeDate(latestRec?.record_date) || new Date();
          } else {
            endD = parseSafeDate(latestRec?.record_date) || new Date();
          }

          const diffMs = endD.getTime() - startD.getTime();
          const treatmentDurationDays = (isNaN(diffMs) || diffMs < 0) ? 1 : Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

          return (
            <>
              <div className={styles.chartWrapper} style={{ marginBottom: '16px' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartCoordinates} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                    <XAxis
                      dataKey="id"
                      tickFormatter={(value) => {
                        const coord = chartCoordinates.find(c => c.id === value);
                        return coord ? coord.dateStr : '';
                      }}
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
                      labelFormatter={(label, items) => {
                        const item = items[0]?.payload;
                        return item ? item.fullDateStr : label;
                      }}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '6px' }}>
                  <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: 0, letterSpacing: '-0.01em', whiteSpace: 'nowrap', flexShrink: 1 }}>
                    สรุปพัฒนาการแผล
                  </h5>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}>
                    <Calendar size={13} style={{ color: '#0f172a' }} />
                    <span>ระยะเวลารักษา:</span>
                    <strong style={{ color: '#0f172a', fontWeight: 700 }}>{treatmentDurationDays} วัน</strong>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>

                  {/* บล็อกที่ 1: ขนาดแผลแรกเริ่ม */}
                  <div style={{ padding: '12px 10px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ขนาดแผลแรกเริ่ม</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '4px', letterSpacing: '-0.02em' }}>
                      {initialRec.area_cm2} <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>cm²</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                      {formatDateTH(initialRec.record_date)}
                    </div>
                  </div>

                  {/* บล็อกที่ 2: ขนาดแผลล่าสุด */}
                  <div style={{ padding: '12px 10px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ขนาดแผลล่าสุด</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '4px', letterSpacing: '-0.02em' }}>
                      {latestRec.area_cm2} <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>cm²</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                      {formatDateTH(latestRec.record_date)}
                    </div>
                  </div>

                  {/* บล็อกที่ 3: แนวโน้มการรักษา */}
                  <div style={{
                    padding: '12px 10px',
                    backgroundColor: diff < 0 ? '#f0fdf4' : diff > 0 ? '#fef2f2' : '#f8fafc',
                    borderRadius: '10px',
                    border: diff < 0 ? '1px solid #bbf7d0' : diff > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0'
                  }}>
                    <div style={{
                      fontSize: '11px',
                      color: diff < 0 ? '#16a34a' : diff > 0 ? '#dc2626' : '#64748b',
                      fontWeight: 600
                    }}>
                      แนวโน้มการรักษา (เทียบวันแรก)
                    </div>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: diff < 0 ? '#15803d' : diff > 0 ? '#b91c1c' : '#0f172a',
                      marginTop: '4px',
                      letterSpacing: '-0.02em'
                    }}>
                      {diff < 0 ? `ดีขึ้น ${percentChange}%` : diff > 0 ? `แย่ลง ${percentChange}%` : 'คงที่'}
                    </div>
                    {diff > 0 && (
                      <div style={{ fontSize: '9px', color: '#dc2626', marginTop: '4px', fontWeight: 500, lineHeight: '1.2' }}>
                        * ขนาดแผลขยายตัวใหญ่กว่าวันแรกที่ลงทะเบียนตรวจรักษา
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </>
          );
        })()}
      </div>
    );
  };

  return (
    <div className={`${styles.fadeUp} ${styles.patientPage}`}>

      {/* Hospital Top Banner for Patient (Clean minimal header) */}
      <div className={styles.patientTopBanner}>
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
      {renderWoundSelector()}

      {/* --- TAB 1: ข้อมูลแผล & ตารางนัดหมาย --- */}
      {subTab === 'info' && (
        <div className={styles.patientInfoGrid}>
          {selectedWoundId && activeWound && renderWoundInfo()}
          {renderAppointments()}
        </div>
      )}

      {/* --- TAB 2: แกลเลอรีประวัติแผล --- */}
      {subTab === 'history' && selectedWoundId && renderHistory()}

      {/* --- TAB 3: กราฟ --- */}
      {subTab === 'graph' && selectedWoundId && renderGraph()}

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

      {/* Full-Screen Image Lightbox Modal Pop-Up */}
      {previewRecord && (
        <div
          className={styles.modalBackdrop}
          style={{ zIndex: 4000 }}
          onClick={() => setPreviewRecord(null)}
        >
          <div
            className={styles.lightboxModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.lightboxHeader}>
              <div>
                <h4>รายละเอียดภาพถ่ายแผล</h4>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  วันที่บันทึก: {formatDateTH(previewRecord.record_date)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className={styles.lightboxCloseBtn}
                title="ปิดหน้าต่าง"
              >
                <X size={20} />
              </button>
            </div>

            {/* Large Enlarged Image View */}
            <div className={styles.lightboxImageWrapper}>
              <img
                src={`${BACKEND_URL}/${previewRecord.image_path}`}
                alt="Enlarged wound inspection preview"
                className={styles.lightboxImg}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=No+Wound+Image';
                }}
              />
            </div>

            {/* Detailed Metric Banner */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '14px 18px',
              borderRadius: '12px',
              margin: '16px 0 12px 0'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                ขนาดพื้นที่แผลจริง
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#0d9488', letterSpacing: '-0.02em' }}>
                {previewRecord.area_cm2} cm²
              </span>
            </div>

            {previewRecord.note && (
              <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                  บันทึกการดูแลรักษา:
                </span>
                <p style={{ margin: 0, fontSize: '13px', color: '#1e293b' }}>
                  {previewRecord.note}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

