import { useState, useEffect } from 'react';
import styles from '../NursePage.module.css';
import { api } from '../../../services/api';
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
  const [evaluatedPatients, setEvaluatedPatients] = useState<EvaluatedPatient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch and calculate patient progress dynamically
  const fetchAndEvaluatePatients = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all patient details along with calculated statuses and age in a single backend query
      const results = await api.get<EvaluatedPatient[]>('/wounds/progress-statuses');

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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter patients by name or HN search input
  const filteredPatients = evaluatedPatients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.HN.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirstItem, indexOfLastItem);

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
      {/* 4.11 Desktop Page Header */}
      <header className={styles.pageHeader}>
        <h2>ผู้ป่วยทั้งหมด</h2>
        <p>รายชื่อผู้ป่วยเบาหวานที่ลงทะเบียนในระบบ</p>
      </header>

      {/* Search Input matching Fig 4.11 */}
      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="ค้นหาชื่อ, HN..."
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className={styles.searchInputFull}
        />
      </div>

      {/* Patient rows matching Fig 4.11 */}
      <div className={styles.patientsListContainer}>
        {currentPatients.length === 0 ? (
          <p className={styles.emptyText}>ไม่พบรายชื่อผู้ป่วยที่ค้นหา</p>
        ) : (
          currentPatients.map(p => (
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
                </div>
              </div>

              {/* Right side block containing status badge and arrow icon side-by-side */}
              <div className={styles.patientRowRight}>
                <span className={`${styles.statusBadgeRow} ${p.status === 'ดีขึ้น' ? styles.statusGreen :
                    p.status === 'แย่ลง' ? styles.statusRed :
                      styles.statusGray
                  }`}>
                  {p.status}
                </span>
                <span className={styles.rowArrowIcon}>➔</span>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.paginationRow}>
          <button
            disabled={activePage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className={styles.pageBtn}
          >
            ก่อนหน้า
          </button>
          <span className={styles.pageInfo}>
            หน้า {activePage} จาก {totalPages}
          </span>
          <button
            disabled={activePage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className={styles.pageBtn}
          >
            ถัดไป
          </button>
        </div>
      )}
    </div>
  );
}
