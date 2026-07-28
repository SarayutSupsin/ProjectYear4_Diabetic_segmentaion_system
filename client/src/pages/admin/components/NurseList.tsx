import { useState, type FormEvent } from 'react'; // ใช้ type คลุม FormEvent อย่างถูกต้อง
import styles from '../AdminPage.module.css';
import { api } from '../../../services/api';

interface NurseListItem {
  user_id: string;
  username: string;
  role_id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  department: string | null;
}

interface NurseListProps {
  nursesList: NurseListItem[];
  fetchData: () => Promise<void>;
}

export default function NurseList({ nursesList, fetchData }: NurseListProps) {
  const [searchNurse, setSearchNurse] = useState('');
  const [showNurseModal, setShowNurseModal] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState<NurseListItem | null>(null);

  const [nurseForm, setNurseForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    department: 'ห้องทำแผล',
    password: ''
  });

  const [nurseToDelete, setNurseToDelete] = useState<NurseListItem | null>(null);

  const openAddNurse = () => {
    setSelectedNurse(null);
    setNurseForm({ username: '', first_name: '', last_name: '', department: 'ห้องทำแผล', password: '' });
    setShowNurseModal(true);
  };

  const openEditNurse = (n: NurseListItem) => {
    setSelectedNurse(n);
    setNurseForm({
      username: n.username,
      first_name: n.first_name || '',
      last_name: n.last_name || '',
      department: n.department || 'ห้องทำแผล',
      password: ''
    });
    setShowNurseModal(true);
  };

  const handleNurseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (selectedNurse) {
        const updateData: any = { ...nurseForm };
        if (!updateData.password) delete updateData.password;
        await api.put(`/nurses/${selectedNurse.user_id}`, updateData);
      } else {
        await api.post('/nurses/', nurseForm);
      }
      setShowNurseModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลพยาบาล');
    }
  };

  const handleNurseDelete = async () => {
    if (!nurseToDelete) return;
    try {
      await api.delete(`/nurses/${nurseToDelete.user_id}`);
      setNurseToDelete(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถลบบัญชีพยาบาลรายนี้ได้');
    }
  };

  const filteredNurses = nursesList.filter(n =>
    `${n.first_name || ''} ${n.last_name || ''}`.includes(searchNurse) || n.username.includes(searchNurse)
  );

  return (
    <div className={`${styles.tabContent} ${styles.fadeUp}`}>
      <div className={styles.contentHeader}>
        <div>
          <h2>จัดการบัญชีพยาบาล</h2>
          <p>กำหนดแผนก ค้นหา แก้ไขสิทธิ์ และลบผู้ใช้</p>
        </div>
        <button onClick={openAddNurse} className={styles.addBtn}>+ เพิ่มพยาบาลใหม่</button>
      </div>

      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="ค้นหาชื่อพยาบาล หรือ Username..."
          value={searchNurse}
          onChange={e => setSearchNurse(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Username (ล็อกอิน)</th>
              <th>ชื่อ - นามสกุล</th>
              <th>แผนกปฏิบัติงาน</th>
              <th>วันที่ลงทะเบียน</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredNurses.map(n => (
              <tr key={n.user_id}>
                <td className={styles.bold}>{n.username}</td>
                <td>{n.first_name && n.last_name ? `${n.first_name} ${n.last_name}` : 'ยังไม่ตั้งค่า'}</td>
                <td>{n.department || 'ไม่ระบุ'}</td>
                <td>{n.created_at ? new Date(n.created_at).toLocaleDateString('th-TH') : '-'}</td>
                <td className={styles.actions}>
                  <button onClick={() => openEditNurse(n)} className={styles.editAction}>แก้ไข</button>
                  <button onClick={() => setNurseToDelete(n)} className={styles.deleteAction}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile-first card list matching Fig 4.6 - 4.8 layout */}
      <div className={styles.mobileCardsList}>
        {filteredNurses.length === 0 ? (
          <p className={styles.emptyText}>ไม่พบข้อมูลบัญชีพยาบาลที่ค้นหา</p>
        ) : (
          filteredNurses.map(n => (
            <div key={n.user_id} className={styles.mobileItemCard}>
              <div className={styles.cardInfoRow}>
                <div className={styles.itemAvatar} style={{ backgroundColor: '#e2e8f0', color: '#475569' }}>
                  {(n.first_name ? n.first_name[0] : n.username[0]).toUpperCase()}
                </div>
                <div className={styles.cardMetaHeader}>
                  <h5 className={styles.cardPatientName}>
                    {n.first_name ? `${n.first_name} ${n.last_name || ''}` : 'ยังไม่ตั้งค่าชื่อจริง'}
                  </h5>
                  <span className={styles.cardPatientHn}>Username: {n.username}</span>
                </div>
              </div>
              <div className={styles.cardDetailsList}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>แผนกปฏิบัติงาน:</span>
                  <span className={styles.detailValue}>{n.department || 'ไม่ระบุ'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>วันที่ลงทะเบียน:</span>
                  <span className={styles.detailValue}>
                    {n.created_at ? new Date(n.created_at).toLocaleDateString('th-TH') : '-'}
                  </span>
                </div>
              </div>
              <div className={styles.cardActionsRow}>
                <button onClick={() => openEditNurse(n)} className={styles.editActionBtn}>แก้ไข</button>
                <button onClick={() => setNurseToDelete(n)} className={styles.deleteActionBtn}>ลบ</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ป็อปอัปแบบฟอร์มพยาบาล */}
      {showNurseModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard} style={{ animation: 'fadeUp 0.4s' }}>
            <h3>{selectedNurse ? 'แก้ไขบัญชีพยาบาล' : 'ลงทะเบียนพยาบาลใหม่'}</h3>
            <form onSubmit={handleNurseSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>ชื่อบัญชีเข้าใช้งาน (Username) *</label>
                <input
                  type="text"
                  required
                  disabled={!!selectedNurse}
                  value={nurseForm.username}
                  onChange={e => setNurseForm({ ...nurseForm, username: e.target.value })}
                  className={styles.inputField}
                  placeholder="เช่น nurse_somchai"
                />
              </div>

              <div className={styles.formGroup}>
                <label>รหัสผ่านเข้าใช้งาน *</label>
                <input
                  type="password"
                  required={!selectedNurse}
                  value={nurseForm.password}
                  onChange={e => setNurseForm({ ...nurseForm, password: e.target.value })}
                  className={styles.inputField}
                  placeholder={selectedNurse ? 'เว้นว่างหากไม่เปลี่ยน' : 'รหัสผ่านขั้นต่ำ 5 ตัว'}
                />
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label>ชื่อจริง *</label>
                  <input
                    type="text"
                    required
                    value={nurseForm.first_name}
                    onChange={e => setNurseForm({ ...nurseForm, first_name: e.target.value })}
                    className={styles.inputField}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={nurseForm.last_name}
                    onChange={e => setNurseForm({ ...nurseForm, last_name: e.target.value })}
                    className={styles.inputField}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>แผนกปฏิบัติงาน *</label>
                <input
                  type="text"
                  required
                  value={nurseForm.department}
                  onChange={e => setNurseForm({ ...nurseForm, department: e.target.value })}
                  className={styles.inputField}
                  placeholder="เช่น ห้องทำแผล"
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowNurseModal(false)} className={styles.cancelBtn}>ยกเลิก</button>
                <button type="submit" className={styles.saveBtn}>บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* กล่องยืนยันการลบพยาบาล */}
      {nurseToDelete && (
        <div className={styles.modalBackdrop}>
          <div className={`${styles.modalCard} ${styles.deleteCard}`}>
            <span className={styles.warnIcon}>⚠️</span>
            <h3>ลบบัญชีพยาบาล</h3>
            <p>คุณต้องการลบบัญชีพยาบาลของ <b>{nurseToDelete.first_name} {nurseToDelete.last_name}</b> (Username: {nurseToDelete.username}) ออกจากระบบใช่หรือไม่?</p>
            <div className={styles.modalActions}>
              <button onClick={() => setNurseToDelete(null)} className={styles.cancelBtn}>ยกเลิก</button>
              <button onClick={handleNurseDelete} className={styles.confirmDeleteBtn}>ยืนยันการลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
