import { useState, type FormEvent } from 'react';
import styles from '../AdminPage.module.css';
import { api } from '../../../services/api';
import type { Patient } from '../../../types';

interface PatientListProps {
  patientsList: Patient[];
  fetchData: () => Promise<void>;
  formatDateTH: (dateStr: string) => string;
}

export default function PatientList({ patientsList, fetchData, formatDateTH }: PatientListProps) {
  const [searchPatient, setSearchPatient] = useState('');
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [patientForm, setPatientForm] = useState({
    HN: '',
    first_name: '',
    last_name: '',
    birth_date: '',
    gender: 'Male',
    phone: '',
    admit_date: '',
    password: ''
  });

  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  const openAddPatient = () => {
    setSelectedPatient(null);
    setPatientForm({ HN: '', first_name: '', last_name: '', birth_date: '', gender: 'Male', phone: '', admit_date: '', password: '' });
    setShowPatientModal(true);
  };

  const openEditPatient = (p: Patient) => {
    setSelectedPatient(p);
    setPatientForm({
      HN: p.HN,
      first_name: p.first_name,
      last_name: p.last_name,
      birth_date: p.birth_date,
      gender: p.gender,
      phone: p.phone,
      admit_date: p.admit_date,
      password: ''
    });
    setShowPatientModal(true);
  };

  const handlePatientSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (selectedPatient) {
        const updateData: any = { ...patientForm };
        if (!updateData.password) delete updateData.password;
        await api.put(`/patients/${selectedPatient.HN}`, updateData);
      } else {
        await api.post('/patients/', patientForm);
      }
      setShowPatientModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ป่วย');
    }
  };

  const handlePatientDelete = async () => {
    if (!patientToDelete) return;
    try {
      await api.delete(`/patients/${patientToDelete.HN}`);
      setPatientToDelete(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถลบผู้ป่วยรายนี้ได้');
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredPatients = patientsList.filter(p =>
    `${p.first_name} ${p.last_name}`.includes(searchPatient) || p.HN.includes(searchPatient)
  );

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className={`${styles.tabContent} ${styles.fadeUp}`}>
      <div className={styles.contentHeader}>
        <div>
          <h2>จัดการข้อมูลผู้ป่วย</h2>
          <p>ลงทะเบียน ค้นหา แก้ไข และลบประวัติเวชระเบียนคนไข้</p>
        </div>
      </div>

      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="ค้นหาด้วยชื่อ-นามสกุล หรือ รหัส HN..."
          value={searchPatient}
          onChange={e => {
            setSearchPatient(e.target.value);
            setCurrentPage(1);
          }}
          className={styles.searchInput}
        />
        <button onClick={openAddPatient} className={styles.addBtn}>
          <span className={styles.desktopBtnText}>+ ลงทะเบียนผู้ป่วยใหม่</span>
          <span className={styles.mobileBtnText}>+ ลงทะเบียน</span>
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>รหัส HN</th>
              <th>ชื่อ - นามสกุล</th>
              <th>วันเกิด</th>
              <th>เพศ</th>
              <th>เบอร์โทรศัพท์</th>
              <th>วันที่เข้ารักษา</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {currentPatients.map(p => (
              <tr key={p.HN}>
                <td className={styles.bold}>{p.HN}</td>
                <td>{p.first_name} {p.last_name}</td>
                <td>{formatDateTH(p.birth_date)}</td>
                <td>{p.gender === 'Male' ? 'ชาย' : 'หญิง'}</td>
                <td>{p.phone}</td>
                <td>{formatDateTH(p.admit_date)}</td>
                <td className={styles.actions}>
                  <button onClick={() => openEditPatient(p)} className={styles.editAction}>แก้ไข</button>
                  <button onClick={() => setPatientToDelete(p)} className={styles.deleteAction}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile-first card list matching Fig 4.3 - 4.5 layout */}
      <div className={styles.mobileCardsList}>
        {currentPatients.length === 0 ? (
          <p className={styles.emptyText}>ไม่พบข้อมูลคนไข้ที่ค้นหา</p>
        ) : (
          currentPatients.map(p => {
            const today = new Date();
            const birth = new Date(p.birth_date);
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
              age--;
            }
            return (
              <div key={p.HN} className={styles.mobileItemCard}>
                <div className={styles.cardInfoRow}>
                  <div className={styles.itemAvatar}>{p.first_name[0]}</div>
                  <div className={styles.cardMetaHeader}>
                    <h5 className={styles.cardPatientName}>{p.first_name} {p.last_name}</h5>
                    <span className={styles.cardPatientHn}>HN: {p.HN} · อายุ {age} ปี</span>
                  </div>
                </div>
                <div className={styles.cardDetailsList}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>เพศ:</span>
                    <span className={styles.detailValue}>{p.gender === 'Male' ? 'ชาย' : 'หญิง'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>เบอร์โทร:</span>
                    <span className={styles.detailValue}>{p.phone || '-'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>เข้ารักษา:</span>
                    <span className={styles.detailValue}>{formatDateTH(p.admit_date)}</span>
                  </div>
                </div>
                <div className={styles.cardActionsRow}>
                  <button onClick={() => openEditPatient(p)} className={styles.editActionBtn}>แก้ไข</button>
                  <button onClick={() => setPatientToDelete(p)} className={styles.deleteActionBtn}>ลบ</button>
                </div>
              </div>
            );
          })
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

      {/* ป็อปอัปแบบฟอร์มผู้ป่วย */}
      {showPatientModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard} style={{ animation: 'fadeUp 0.4s' }}>
            <h3>{selectedPatient ? 'แก้ไขข้อมูลผู้ป่วย' : 'ลงทะเบียนผู้ป่วยใหม่'}</h3>
            <form onSubmit={handlePatientSubmit} className={styles.modalForm}>
              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label>รหัส HN *</label>
                  <input
                    type="text"
                    required
                    disabled={!!selectedPatient}
                    value={patientForm.HN}
                    onChange={e => setPatientForm({ ...patientForm, HN: e.target.value })}
                    className={styles.inputField}
                    placeholder="เช่น 3-123"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>รหัสผ่านเข้าใช้งาน *</label>
                  <input
                    type="text"
                    required={!selectedPatient}
                    value={patientForm.password}
                    onChange={e => setPatientForm({ ...patientForm, password: e.target.value })}
                    className={styles.inputField}
                    placeholder={selectedPatient ? 'เว้นว่างหากไม่เปลี่ยน' : 'รหัสผ่านขั้นต่ำ 5 ตัว'}
                  />
                </div>
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label>ชื่อจริง *</label>
                  <input
                    type="text"
                    required
                    value={patientForm.first_name}
                    onChange={e => setPatientForm({ ...patientForm, first_name: e.target.value })}
                    className={styles.inputField}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={patientForm.last_name}
                    onChange={e => setPatientForm({ ...patientForm, last_name: e.target.value })}
                    className={styles.inputField}
                  />
                </div>
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label>วันเกิด *</label>
                  <input
                    type="date"
                    required
                    value={patientForm.birth_date}
                    onChange={e => setPatientForm({ ...patientForm, birth_date: e.target.value })}
                    className={styles.inputField}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>เพศ *</label>
                  <div className={styles.genderToggle}>
                    <button type="button" onClick={() => setPatientForm({ ...patientForm, gender: 'Male' })} className={`${styles.genderBtn} ${patientForm.gender === 'Male' ? styles.active : ''}`}>ชาย</button>
                    <button type="button" onClick={() => setPatientForm({ ...patientForm, gender: 'Female' })} className={`${styles.genderBtn} ${patientForm.gender === 'Female' ? styles.active : ''}`}>หญิง</button>
                  </div>
                </div>
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label>เบอร์โทรศัพท์ *</label>
                  <input
                    type="text"
                    required
                    value={patientForm.phone}
                    onChange={e => setPatientForm({ ...patientForm, phone: e.target.value })}
                    className={styles.inputField}
                    placeholder="เช่น 0812345678"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>วันที่เริ่มเข้ารับการรักษา *</label>
                  <input
                    type="date"
                    required
                    value={patientForm.admit_date}
                    onChange={e => setPatientForm({ ...patientForm, admit_date: e.target.value })}
                    className={styles.inputField}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowPatientModal(false)} className={styles.cancelBtn}>ยกเลิก</button>
                <button type="submit" className={styles.saveBtn}>บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* กล่องยืนยันการลบผู้ป่วย */}
      {patientToDelete && (
        <div className={styles.modalBackdrop}>
          <div className={`${styles.modalCard} ${styles.deleteCard}`}>
            <span className={styles.warnIcon}>⚠️</span>
            <h3>ลบประวัติผู้ป่วย</h3>
            <p>คุณต้องการลบข้อมูลผู้ป่วยรหัส HN: <b>{patientToDelete.HN}</b> ({patientToDelete.first_name} {patientToDelete.last_name}) ออกจากระบบใช่หรือไม่?</p>
            <p className={styles.dangerNotice}>การกระทำนี้จะลบบัญชีและประวัติแผลทั้งหมด ซึ่งไม่สามารถกู้คืนได้</p>
            <div className={styles.modalActions}>
              <button onClick={() => setPatientToDelete(null)} className={styles.cancelBtn}>ยกเลิก</button>
              <button onClick={handlePatientDelete} className={styles.confirmDeleteBtn}>ยืนยันการลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
