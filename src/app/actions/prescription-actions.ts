// src/app/actions/prescription-actions.ts
'use server';

import { db } from '@/db';
import { prescriptions, clients } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';
import { revalidatePath } from 'next/cache';
import type { PrescriptionData } from '@/lib/prescription-validator';

export interface SavePrescriptionInput {
  clientId: string;
  imageUrl: string;
  prescriptionData: PrescriptionData;
  notes?: string;
}

/**
 * Save a new AI-scanned prescription
 */
export const savePrescription = secureAction(async (userId, user, input: SavePrescriptionInput) => {
  try {
    const clientIdNum = parseInt(input.clientId);
    
    // Verify client ownership
    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.id, clientIdNum),
        eq(clients.userId, userId)
      )
    });
    
    if (!client) {
      return { success: false, error: 'Client non trouvé' };
    }
    
    const { OD, OS, PD, doctorName, date } = input.prescriptionData;
    
    // Validate date
    let pDate = new Date();
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        pDate = parsedDate;
      }
    }

    const ensureNum = (val: any): number | null => {
      if (val === null || val === undefined || val === '') return null;
      const parsed = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(parsed) ? null : parsed;
    };

    const ensureInt = (val: any): number | null => {
      const num = ensureNum(val);
      return num !== null ? Math.round(num) : null;
    };

    const vals = {
      userId,
      clientId: clientIdNum,
      imageUrl: input.imageUrl,
      prescriptionDate: pDate,
      doctorName: doctorName || null,
      
      // OD
      odSph: ensureNum(OD.sph),
      odCyl: ensureNum(OD.cyl),
      odAxis: ensureInt(OD.axis),
      odAdd: ensureNum(OD.add),
      
      // OS
      osSph: ensureNum(OS.sph),
      osCyl: ensureNum(OS.cyl),
      osAxis: ensureInt(OS.axis),
      osAdd: ensureNum(OS.add),
      
      pd: ensureNum(PD),
      notes: input.notes || null,
      status: 'approved'
    };
    
    console.log('📝 Saving prescription with values:', JSON.stringify(vals, null, 2));

    const result = await db.insert(prescriptions).values(vals).returning();
    
    await logSuccess(userId, 'CREATE', 'prescriptions', result[0].id);
    
    revalidatePath(`/dashboard/clients/${input.clientId}`);
    
    return { 
      success: true, 
      id: result[0].id,
      message: 'Ordonnance enregistrée avec succès' 
    };
    
  } catch (error: any) {
    console.error('❌ Save prescription error:', error);
    await logFailure(userId, 'CREATE', 'prescriptions', error.message);
    return { success: false, error: 'Erreur lors de l\'enregistrement' };
  }
});
