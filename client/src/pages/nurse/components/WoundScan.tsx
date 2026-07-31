import { useState, useEffect, type FormEvent } from 'react';
import styles from '../NursePage.module.css';
import { api } from '../../../services/api';
import type { Patient, Wound, WoundRecord } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

import { MdOutlineEventNote } from "react-icons/md";


interface WoundScanProps {
  preselectedHN: string | null;
  onViewPatientWounds: (HN: string) => void;
}

interface BodyPartItem {
  body_part_id: string;
  body_part_name: string;
}

export default function WoundScan({ preselectedHN, onViewPatientWounds }: WoundScanProps) {
  const { logout } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [bodyParts, setBodyParts] = useState<BodyPartItem[]>([]);
  const [wounds, setWounds] = useState<Wound[]>([]);
  
  // Selection states
  const [selectedHN, setSelectedHN] = useState<string>('');
  const [selectedWoundId, setSelectedWoundId] = useState<string>('');
  
  // New wound case creation inside scanner view (Fig 4.18)
  const [isNewWound, setIsNewWound] = useState(false);
  const [newBodyPartId, setNewBodyPartId] = useState('');
  const [newSide, setNewSide] = useState<'เท้าซ้าย' | 'เท้าขวา'>('เท้าซ้าย');
  
  // Image file upload states
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  
  // Modal flow controls (Fig 4.19 - 4.20)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<WoundRecord | null>(null);

  // Fetch initial data from backend
  const fetchInitialData = async () => {
    try {
      const [patientsData, bodyPartsData] = await Promise.all([
        api.get<Patient[]>('/patients/'),
        api.get<BodyPartItem[]>('/wounds/body-parts')
      ]);
      setPatients(patientsData);
      setBodyParts(bodyPartsData);
      if (bodyPartsData.length > 0) {
        setNewBodyPartId(bodyPartsData[0].body_part_id);
      }

      // Pre-select patient if provided from detail view
      if (preselectedHN) {
        setSelectedHN(preselectedHN);
      } else if (patientsData.length > 0) {
        setSelectedHN(patientsData[0].HN);
      }
    } catch (err) {
      console.error('Failed to load initial scanner data:', err);
    }
  };

  // Fetch active wound list whenever selected HN changes
  const fetchPatientWounds = async (HN: string) => {
    if (!HN) return;
    try {
      const woundsList = await api.get<Wound[]>(`/wounds/patient/${HN}`);
      setWounds(woundsList);
      if (woundsList.length > 0) {
        setSelectedWoundId(woundsList[0].wound_id);
        setIsNewWound(false);
      } else {
        setSelectedWoundId('');
        setIsNewWound(true); // Default to new wound if patient has none
      }
    } catch (err) {
      console.error('Failed to fetch patient wounds:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [preselectedHN]);

  useEffect(() => {
    if (selectedHN) {
      fetchPatientWounds(selectedHN);
    }
  }, [selectedHN]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Submit flow to start segmentation process
  const triggerAnalysis = async () => {
    if (!file || !selectedHN) return;
    
    try {
      setLoading(true);
      setShowConfirmModal(false);
      
      let woundId = selectedWoundId;
      
      // If nurse selected '+ เพิ่มแผลใหม่' (Fig 4.18), create wound first
      if (isNewWound) {
        const sideString = newSide === 'เท้าซ้าย' ? 'เท้าซ้าย' : 'เท้าขวา';
        const newWound = await api.post<Wound>('/wounds/', {
          HN: selectedHN,
          body_part_id: newBodyPartId,
          side: sideString
        });
        woundId = newWound.wound_id;
      }

      // Upload image to backend for QR & UNet assessment
      const formData = new FormData();
      formData.append('file', file);
      if (note) {
        formData.append('note', note);
      }

      const result = await api.post<WoundRecord>(`/wounds/${woundId}/records`, formData);
      setAnalysisResult(result);
      setShowResultModal(true);
    } catch (err: any) {
      alert(err.message || 'วิเคราะห์แผลไม่สำเร็จ กรุณาตรวจสอบคุณภาพรูปถ่ายและคิวอาร์โค้ด');
    } finally {
      setLoading(false);
    }
  };

  // Get selected patient name
  const currentPatient = patients.find(p => p.HN === selectedHN);
  const patientDisplayName = currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : '';

  // Get selected wound text
  let woundDisplayName = '';
  if (isNewWound) {
    const part = bodyParts.find(b => b.body_part_id === newBodyPartId);
    woundDisplayName = `[แผลใหม่] ${part?.body_part_name || ''} (${newSide})`;
  } else {
    const wound = wounds.find(w => w.wound_id === selectedWoundId);
    woundDisplayName = wound ? `${wound.wound_id}: ${wound.body_part?.body_part_name || ''} (${wound.side})` : '';
  }

  return (
    <div className={styles.fadeUp}>
      {/* Page Header */}
      <header className={styles.pageHeader}>
        <h2>วิเคราะห์ภาพแผล</h2>
        <p>อัปโหลดภาพถ่ายบาดแผลพร้อม QR Code เพื่อคำนวณพื้นที่ผิวแผล</p>
      </header>

      <div className={styles.scannerContainer}>
        {/* Step 1: Image Upload Box */}
        <div className={styles.uploadBoxWrapper}>
          <label className={styles.uploadAreaLabel}>
            <input 
              type="file" 
              accept="image/png, image/jpeg" 
              onChange={handleFileChange}
              className={styles.hiddenFileInput}
            />
            {file ? (
              <div className={styles.uploadedFileState}>
                <span className={styles.checkmarkIcon}>✔</span>
                <span className={styles.fileNameText}>{file.name}</span>
                <span className={styles.changeFileLink}>แตะเพื่อเปลี่ยนไฟล์</span>
              </div>
            ) : (
              <div className={styles.emptyUploadState}>
                <span className={styles.cameraIconBig}>📷</span>
                <span className={styles.uploadMainText}>แตะเพื่อเลือกภาพแผล</span>
                <span className={styles.uploadSubText}>PNG, JPG · ขนาดไม่เกิน 10MB</span>
              </div>
            )}
          </label>
        </div>

        {/* Step 2: Patient and Wound Selection Forms */}
        <div className={styles.sectionCard}>
          <h4 className={styles.sectionTitle}> <MdOutlineEventNote /> ข้อมูลการบันทึก</h4>
          
          <div className={styles.formGroupCompact} style={{ marginBottom: '16px' }}>
            <label>ผู้ป่วย</label>
            <select 
              value={selectedHN} 
              onChange={e => setSelectedHN(e.target.value)}
              className={styles.selectField}
            >
              {patients.map(p => (
                <option key={p.HN} value={p.HN}>
                  {p.HN} - {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroupCompact} style={{ marginBottom: '16px' }}>
            <label>แผล</label>
            <select 
              value={isNewWound ? 'NEW_CASE' : selectedWoundId} 
              onChange={e => {
                if (e.target.value === 'NEW_CASE') {
                  setIsNewWound(true);
                } else {
                  setIsNewWound(false);
                  setSelectedWoundId(e.target.value);
                }
              }}
              className={styles.selectField}
            >
              {wounds.map(w => (
                <option key={w.wound_id} value={w.wound_id}>
                  {w.wound_id}: {w.body_part?.body_part_name || ''} ({w.side})
                </option>
              ))}
              <option value="NEW_CASE">+ เพิ่มแผลใหม่</option>
            </select>
          </div>

          {/* New wound case forms (Fig 4.18) */}
          {isNewWound && (
            <div className={styles.nestedFormCard} style={{ animation: 'fadeUp 0.3s' }}>
              <div className={styles.formGroupCompact} style={{ marginBottom: '12px' }}>
                <label>ตำแหน่งแผลใหม่</label>
                <div className={styles.pillsContainer}>
                  {bodyParts.map(bp => (
                    <button 
                      key={bp.body_part_id}
                      type="button"
                      className={`${styles.pillBtn} ${newBodyPartId === bp.body_part_id ? styles.active : ''}`}
                      onClick={() => setNewBodyPartId(bp.body_part_id)}
                    >
                      {bp.body_part_name.split(' (')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroupCompact} style={{ marginBottom: '12px' }}>
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
            </div>
          )}

          <div className={styles.formGroupCompact}>
            <label>บันทึกการดูแล (note)</label>
            <textarea
              placeholder="อาการ, การรักษา, หมายเหตุ..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className={styles.textareaField}
              rows={3}
            />
          </div>
        </div>

        {/* Start Analysis trigger button */}
        <button 
          onClick={() => setShowConfirmModal(true)} 
          disabled={!file || !selectedHN}
          className={styles.submitBookingBtn}
          style={{ backgroundColor: '#0d9488', marginTop: '16px' }}
        >
          เริ่มวิเคราะห์ภาพแผล
        </button>

        {/* Shoot instructions card */}
        <div className={styles.shootInstructionsCard}>
          <h5>ℹ️ คำแนะนำการถ่ายภาพ</h5>
          <ul>
            <li>วาง QR Code ข้างแผลทุกครั้งเพื่อเทียบขนาด</li>
            <li>ถ่ายในที่มีแสงสว่างเพียงพอ</li>
            <li>ถือกล้องให้ตั้งฉากกับตำแหน่งแผล</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal (Fig 4.19) */}
      {showConfirmModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCardCompact}>
            <h4>ยืนยันการวิเคราะห์</h4>
            <div className={styles.confirmModalDetails}>
              {file && (
                <img 
                  src={URL.createObjectURL(file)} 
                  alt="Wound thumbnail" 
                  className={styles.confirmThumbnail} 
                />
              )}
              <div className={styles.confirmMeta}>
                <p><strong>ผู้ป่วย:</strong> {patientDisplayName}</p>
                <p><strong>แผล:</strong> {woundDisplayName}</p>
                {note && <p><strong>บันทึก:</strong> {note}</p>}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className={styles.cancelBtn}
              >
                ยกเลิก
              </button>
              <button 
                onClick={triggerAnalysis} 
                className={styles.confirmBtn}
              >
                ยืนยัน วิเคราะห์เลย
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Result Modal (Fig 4.20) */}
      {showResultModal && analysisResult && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCardCompact}>
            <h4>ผลการวิเคราะห์</h4>
            <p className={styles.modalSubtitle}>วิเคราะห์เสร็จสิ้น · AI Segmentation</p>
            
            <div className={styles.resultImageContainer}>
              <img 
                src={`http://localhost:8000/${analysisResult.image_path}`} 
                alt="Wound segmentation mask result" 
                className={styles.resultImage} 
              />
            </div>
            
            <div className={styles.resultMetricsRow}>
              <div className={styles.resultMetricBlock}>
                <span className={styles.resultMetricVal}>{analysisResult.area_pixel.toLocaleString()}</span>
                <span className={styles.resultMetricLabel}>พื้นที่แผล (pixel)</span>
              </div>
              <div className={styles.resultMetricBlock}>
                <span className={styles.resultMetricVal}>{analysisResult.area_cm2}</span>
                <span className={styles.resultMetricLabel}>พื้นที่แผล (จริง) cm²</span>
              </div>
            </div>

            <button 
              onClick={() => {
                setShowResultModal(false);
                onViewPatientWounds(selectedHN); // Redirect to history graph view
              }} 
              className={styles.closeResultBtn}
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* Backdrop loading overlay */}
      {loading && (
        <div className={styles.modalBackdrop} style={{ zIndex: 1000 }}>
          <div className={styles.loadingSpinnerCard}>
            <div className={styles.spinner}></div>
            <p>ระบบกำลังวิเคราะห์ภาพแผลด้วยโมเดล Deep Learning...</p>
          </div>
        </div>
      )}
    </div>
  );
}
