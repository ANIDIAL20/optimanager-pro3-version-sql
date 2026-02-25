// @ts-nocheck
// src/app/ordonnances/nouvelle/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PrescriptionScanner } from '@/components/prescriptions/prescription-scanner';
import { PrescriptionForm } from '@/components/prescriptions/prescription-form';
import { savePrescription } from '@/app/actions/prescription-actions';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function NouvellePrescriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  
  const [scannedData, setScannedData] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  
  const handleScanComplete = (result: any) => {
    setScannedData(result);
    // TODO: Upload image to storage and get URL
    setImageUrl('temp-url'); // Placeholder
  };
  
  const handleError = (error: string) => {
    console.error('Scan error:', error);
  };
  
  const handleSave = async (data: any, notes?: string) => {
    if (!clientId) {
      toast.error('Client ID manquant');
      return;
    }
    
    const result = await savePrescription({
      clientId,
      imageUrl: imageUrl || 'pending',
      prescriptionData: data,
      notes,
    });
    
    if (result.success) {
      toast.success('Ordonnance enregistrée avec succès!');
      router.push(`/dashboard/clients/${clientId}`);
    } else {
      toast.error(result.error || 'Échec de l\'enregistrement');
    }
  };
  
  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          asChild
        >
          <Link href={clientId ? `/dashboard/clients/${clientId}` : '/dashboard/clients'}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Nouvelle Ordonnance
          </h1>
          <p className="text-muted-foreground mt-1">
            Scannez ou téléchargez une ordonnance optique
          </p>
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-8">
        {!scannedData ? (
          /* Step 1: Scanner */
          <div className="bg-white rounded-lg border p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">
                Étape 1: Scanner l'ordonnance
              </h2>
              <p className="text-sm text-muted-foreground">
                Prenez une photo claire de l'ordonnance ou téléchargez-en une depuis votre appareil
              </p>
            </div>
            
            <PrescriptionScanner
              onScanComplete={handleScanComplete}
              onError={handleError}
            />
          </div>
        ) : (
          /* Step 2: Review & Edit */
          <div className="bg-white rounded-lg border p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">
                Étape 2: Vérifier et modifier
              </h2>
              <p className="text-sm text-muted-foreground">
                Vérifiez les valeurs détectées et corrigez si nécessaire
              </p>
              
              {scannedData.confidence && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                  Confiance: {scannedData.confidence === 'high' ? 'Élevée ✓' : 'Moyenne'}
                </div>
              )}
            </div>
            
            <PrescriptionForm
              initialData={scannedData.data}
              confidence={scannedData.confidence}
              onSave={handleSave}
            />
          </div>
        )}
      </div>
      
      {/* Help */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Conseils</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Assurez-vous que l'ordonnance est bien éclairée</li>
          <li>• Évitez les reflets sur le papier</li>
          <li>• Cadrez uniquement l'ordonnance (pas de fond)</li>
          <li>• Vérifiez toujours les valeurs détectées avant de sauvegarder</li>
        </ul>
      </div>
    </div>
  );
}

export default function NouvellePrescriptionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <NouvellePrescriptionContent />
    </Suspense>
  );
}
