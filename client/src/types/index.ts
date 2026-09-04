export interface User {
  user_id: string;
  username: string;
  role_id: 'ADMIN' | 'NURSE' | 'PATIENT';
  role?: string;
  created_at?: string;
  first_name?: string;
  last_name?: string;
  department?: string;
}

export interface Nurse {
  user_id: string;
  first_name: string;
  last_name: string;
  department: string;
}

export interface Patient {
  HN: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: 'Male' | 'Female';
  phone: string;
  admit_date: string;
  user_id?: string;
}

export interface Wound {
  wound_id: string;
  HN: string;
  body_part_id: string;
  side: string;
  created_at?: string;
  is_active?: boolean;
  close_reason?: string;
  closed_at?: string;
  body_part?: {
    body_part_id: string;
    body_part_name: string;
  };
  records?: WoundRecord[];
}

export interface WoundRecord {
  record_id: number;
  wound_id: string;
  user_id: string;
  image_path: string;
  area_pixel: number;
  area_cm2: number;
  record_date: string;
  note?: string;
}

export interface Appointment {
  appointment_id: number;
  HN: string;
  nurse_user_id: string;
  appointment_date: string;
  appointment_time: string;
  note?: string;
  created_at?: string;
}
