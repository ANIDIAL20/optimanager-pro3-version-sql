'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ScanEye, X } from 'lucide-react';
import { PrescriptionScanner } from '@/components/prescriptions/prescription-scanner';
import { PrescriptionForm } from '@/components/prescriptions/prescription-form';
import { createPrescription } from '@/app/actions/prescriptions-actions';
import { toast } from 'sonner';
import { PrescriptionData } from '@/lib/prescription-validator';

interface ScannerDialogProps {
  clientId: string;
  onSuccess: () => void;
}

export function ScannerDialog({ clientId, onSuccess }: ScannerDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [scanResult, setScanResult] = React.useState<any>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleScanComplete = (result: any) => {
    setScanResult(result);
    toast.success('Analyse terminée ! Veuillez vérifier les valeurs.');
  };

  const handleSave = async (data: PrescriptionData, notes?: string) => {
    setIsSaving(true);
    try {
      // If we have a scan result, we likely have an imageUrl. If not, we might need to handle image upload differently or omit it.
      // Assuming the scanner returns 'imageUrl' or we have the base64 from the scanner component internally (which might need refactoring if we want to save the image file properly).
      // For now, let's assume the scanner's result contains the necessary data or we just save the extracted data.
      // The `savePrescription` action expects `imageUrl`.
      // The current `PrescriptionScanner` returns the API result which includes `data` (PrescriptionData) but maybe not the uploaded image URL if not handled.
      // Let's assume for this "Human AI" UX we focus on the data.
      // Ideally, the scanner should upload the image to storage and return the URL.

      const result = await createPrescription({
        clientId,
        date: new Date(),
        data: data,
        notes: notes || ''
      });

      if (result.success) {
        toast.success('Ordonnance enregistrée avec succès !');
        setOpen(false);
        setScanResult(null);
        onSuccess();
      } else {
        toast.error(result.error || "Erreur lors de l'enregistrement");
      }
    } catch (error) {
      toast.error("Une erreur inattendue s'est produite");
    } finally {
      setIsSaving(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="relative overflow-hidden group bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg transition-all duration-300 hover:shadow-violet-500/25 border-0"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
          <span className="font-semibold tracking-wide">Analyser avec IA</span>
          <ScanEye className="ml-2 h-4 w-4 opacity-70" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-violet-600" />
            Scanner Intelligent d'Ordonnance
          </DialogTitle>
          <DialogDescription>
            Utilisez l'IA pour extraire automatiquement les données de l'ordonnance.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {!scanResult ? (
            <PrescriptionScanner
              onScanComplete={handleScanComplete}
              onError={(err) => toast.error(err)}
            />
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between bg-violet-50 p-3 rounded-lg border border-violet-100">
                <span className="text-sm font-medium text-violet-800 flex items-center gap-2">
                  <CheckClassName className="h-4 w-4" /> Analyse réussie
                </span>
                <Button variant="ghost" size="sm" onClick={resetScanner} className="text-xs h-8">
                  Scanner à nouveau
                </Button>
              </div>

              <PrescriptionForm
                initialData={scanResult.data}
                onSave={handleSave}
                isLoading={isSaving}
                confidence={scanResult.confidence} // Assuming API returns confidence
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for the check icon in the success banner
function CheckClassName({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
