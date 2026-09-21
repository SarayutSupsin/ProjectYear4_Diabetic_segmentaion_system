import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';
// Import CSS module styles
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      errors.username = 'กรุณากรอกชื่อผู้ใช้งาน';
    }
    if (!password) {
      errors.password = 'กรุณากรอกรหัสผ่าน';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setFieldErrors({});
      setLoading(true);
      await login(username, password);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('ชื่อผู้ใช้') || msg.includes('ผู้ใช้')) {
        setFieldErrors({ username: 'ชื่อผู้ใช้ไม่ถูกต้อง' });
      } else if (msg.includes('รหัสผ่าน')) {
        setFieldErrors({ password: 'รหัสผ่านไม่ถูกต้อง' });
      } else {
        setFieldErrors({ username: msg || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    // Apply CSS module container style
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
              className={`${styles.inputField} ${fieldErrors.username ? styles.inputError : ''}`}
              placeholder="กรอกชื่อผู้ใช้ หรือ รหัส HN"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
              }}
              disabled={loading}
            />
            {fieldErrors.username && (
              <span className={styles.fieldErrorText}>{fieldErrors.username}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>รหัสผ่าน</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`${styles.inputField} ${fieldErrors.password ? styles.inputError : ''}`}
                placeholder="กรอกรหัสผ่านเข้าใช้งาน"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                disabled={loading}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span className={styles.fieldErrorText}>{fieldErrors.password}</span>
            )}
          </div>

          <button 
            type="submit" 
            className={styles.loginBtn} 
            disabled={loading} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : <><span>เข้าสู่ระบบ</span> <LogIn size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
