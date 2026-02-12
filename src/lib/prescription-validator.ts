// src/lib/prescription-validator.ts

export interface PrescriptionData {
  OD: {
    sph: number | null;
    cyl: number | null;
    axis: number | null;
    add: number | null;
  };
  OS: {
    sph: number | null;
    cyl: number | null;
    axis: number | null;
    add: number | null;
  };
  PD: number | null;
  doctorName?: string;
  date?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validatePrescription(data: PrescriptionData): {
  isValid: boolean;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];
  
  // OD validation
  if (data.OD.sph !== null && (data.OD.sph < -20 || data.OD.sph > 20)) {
    errors.push({ field: 'OD.sph', message: 'SPH (OD) doit être entre -20 et +20' });
  }
  
  if (data.OD.cyl !== null && (data.OD.cyl < -6 || data.OD.cyl > 6)) {
    errors.push({ field: 'OD.cyl', message: 'CYL (OD) doit être entre -6 et +6' });
  }
  
  if (data.OD.cyl !== null && data.OD.cyl !== 0) {
    if (data.OD.axis === null || data.OD.axis < 0 || data.OD.axis > 180) {
      errors.push({ field: 'OD.axis', message: 'AXIS (OD) requis quand CYL existe (0-180)' });
    }
  }
  
  if (data.OD.add !== null && (data.OD.add < 0 || data.OD.add > 4)) {
    errors.push({ field: 'OD.add', message: 'ADD (OD) doit être entre 0 et +4' });
  }
  
  // OS validation
  if (data.OS.sph !== null && (data.OS.sph < -20 || data.OS.sph > 20)) {
    errors.push({ field: 'OS.sph', message: 'SPH (OS) doit être entre -20 et +20' });
  }
  
  if (data.OS.cyl !== null && (data.OS.cyl < -6 || data.OS.cyl > 6)) {
    errors.push({ field: 'OS.cyl', message: 'CYL (OS) doit être entre -6 et +6' });
  }
  
  if (data.OS.cyl !== null && data.OS.cyl !== 0) {
    if (data.OS.axis === null || data.OS.axis < 0 || data.OS.axis > 180) {
      errors.push({ field: 'OS.axis', message: 'AXIS (OS) requis quand CYL existe (0-180)' });
    }
  }
  
  if (data.OS.add !== null && (data.OS.add < 0 || data.OS.add > 4)) {
    errors.push({ field: 'OS.add', message: 'ADD (OS) doit être entre 0 et +4' });
  }
  
  // PD validation
  if (data.PD !== null && (data.PD < 50 || data.PD > 80)) {
    errors.push({ field: 'PD', message: 'PD doit être entre 50 et 80 mm' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function roundToQuarter(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value * 4) / 4;
}

export function formatPrescriptionValue(value: number | null): string {
  if (value === null) return '-';
  const formatted = value.toFixed(2);
  return value > 0 ? '+' + formatted : formatted;
}
