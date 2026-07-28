import { useState, useEffect } from 'react';
import styles from '../NursePage.module.css';
import { api } from '../../../services/api';
import type { Patient, Wound, WoundRecord } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

interface PatientSearchProps {
  onViewPatientWounds: (HN: string) => void;
}

interface EvaluatedPatient {
  HN: string;
  name: string;
  age: number;
  woundsCount: number;
  status: 'ดีขึ้น' | 'แย่ลง' | 'คงที่';
}

export default function PatientSearch({ onViewPatientWounds }: PatientSearchProps) {
  const { logout } = useAuth();
  const [evaluatedPatients, setEvaluatedPatients] = useState<EvaluatedPatient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch and calculate patient progress dynamically
  const fetchAndEvaluatePatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const patientsList = await api.get<Patient[]>('/patients/');

      // Calculate age, wounds count, and healing status for each patient
      const results: EvaluatedPatient[] = await Promise.all(
        patientsList.map(async (p) => {
          // Calculate age from birth_date (YYYY-MM-DD)
          let age = 0;
          if (p.birth_date) {
            const today = new Date();
            const birthDate = new Date(p.birth_date);
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
          }

          // Fetch patient wounds and records to calculate counts and status
          let woundsCount = 0;
          let status: 'ดีขึ้น' | 'แย่ลง' | 'คงที่' = 'คงที่';

          try {
            const patientWounds = await api.get<Wound[]>(`/wounds/patient/${p.HN}`);
            woundsCount = patientWounds.length;

            for (const w of patientWounds) {
              const records = await api.get<WoundRecord[]>(`/wounds/${w.wound_id}/records`);
              if (records.length >= 2) {
                // Sort chronologically by date
                const sorted = [...records].sort(
                  (a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
                );
                const latest = sorted[sorted.length - 1];
                const previous = sorted[sorted.length - 2];

                if (latest.area_cm2 > previous.area_cm2) {
                  status = 'แย่ลง'; // Mark worsening case
                } else if (latest.area_cm2 < previous.area_cm2 && status !== 'แย่ลง') {
                  status = 'ดีขึ้น'; // Mark improving case
                }
              }
            }
          } catch (err) {
            console.error(`Error loading wounds for patient HN: ${p.HN}`, err);
          }

          return {
            HN: p.HN,
            name: `${p.first_name} ${p.last_name}`,
            age,
            woundsCount,
            status
          };
        })
      );

      setEvaluatedPatients(results);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch patient list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndEvaluatePatients();
  }, []);

  // Filter patients by name or HN search input
  const filteredPatients = evaluatedPatients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.HN.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className={styles.pageLoading}>
        <p>กำลังโหลดรายชื่อผู้ป่วย...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageError}>
        <p>{error}</p>
        <button onClick={fetchAndEvaluatePatients} className={styles.retryBtn}>ลองใหม่</button>
      </div>
    );
  }

  return (
    <div className={styles.fadeUp}>
      {/* Search Input matching Fig 4.11 */}
      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="ค้นหาชื่อ, HN..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={styles.searchInputFull}
        />
      </div>

      {/* Patient rows matching Fig 4.11 */}
      <div className={styles.patientsListContainer}>
        {filteredPatients.length === 0 ? (
          <p className={styles.emptyText}>ไม่พบรายชื่อผู้ป่วยที่ค้นหา</p>
        ) : (
          filteredPatients.map(p => (
            <div 
              key={p.HN} 
              className={styles.patientRowCard}
              onClick={() => onViewPatientWounds(p.HN)}
            >
              <div className={styles.patientRowMeta}>
                <div className={styles.letterAvatar}>{p.name[0]}</div>
                <div>
                  <h4 className={styles.patientRowName}>{p.name}</h4>
                  <span className={styles.patientRowDetails}>
                    {p.HN} · อายุ {p.age} ปี · {p.woundsCount} แผล
                  </span>
                  <div style={{ marginTop: '6px' }}>
                    <span className={`${styles.statusBadgeRow} ${
                      p.status === 'ดีขึ้น' ? styles.statusGreen : 
                      p.status === 'แย่ลง' ? styles.statusRed : 
                      styles.statusGray
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              </div>
              <span className={styles.rowArrowIcon}>➔</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
