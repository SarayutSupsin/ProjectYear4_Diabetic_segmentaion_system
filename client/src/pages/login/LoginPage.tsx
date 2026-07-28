import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
// 1. นำเข้า Object สไตล์เฉพาะหน้าล็อกอิน
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    try {
      setError(null);
      setLoading(true);
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    // 2. เรียกใช้คลาสผ่านตัวแปร styles.className
    <div className={styles.loginContainer}>
      <div className={`${styles.loginCard} ${styles.fadeUp}`}>
        <div className={styles.loginHeader}>
          <div className={styles.loginLogo}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h2>DFU Monitor</h2>
          <p>ระบบวิเคราะห์และติดตามขนาดแผลเบาหวานที่เท้า</p>
        </div>

        <form onSubmit={handleLogin} className={styles.loginForm}>
          <div className={styles.formGroup}>
            <label>ชื่อผู้ใช้งาน (HN / Username)</label>
            <input
              type="text"
              className={styles.inputField}
              placeholder="กรอกชื่อผู้ใช้ หรือ รหัส HN"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label>รหัสผ่าน</label>
            <input
              type="password"
              className={styles.inputField}
              placeholder="กรอกรหัสผ่านเข้าใช้งาน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button type="submit" className={styles.loginBtn} disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
}
