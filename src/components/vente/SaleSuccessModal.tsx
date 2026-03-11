"use client";

import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Printer, Glasses, Home, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { printInPlace } from "@/lib/print-in-place";
import { LensOrderShareDialog } from "./LensOrderShareDialog";

interface SaleSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
  /** Pass the acompte/avance amount if one was collected — shows "Reçu d'Avance" button */
  avance?: number;
  /** Lens order IDs linked to this sale — populates "Bon de Labo" button(s) */
  lensOrderIds?: number[];
}

export function SaleSuccessModal({ isOpen, onClose, saleId, avance, lensOrderIds }: SaleSuccessModalProps) {
  const router = useRouter();
  const [showShareDialog, setShowShareDialog] = React.useState(false);

  const handlePrintInvoice = () => {
    printInPlace(`/print/facture/${saleId}`);
  };

  const handlePrintRecu = () => {
    printInPlace(`/print/recu/${saleId}`);
  };

  const handleFinish = () => {
    onClose();
    router.push("/dashboard/ventes");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleFinish()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
          {/* Header — green gradient */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center text-white">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 animate-bounce" />
            </div>
            <DialogTitle className="text-2xl font-black text-center">
              Vente Réussie !
            </DialogTitle>
            <p className="text-emerald-100 mt-2 text-sm">
              La vente a été enregistrée avec succès.
            </p>
          </div>

          <div className="p-6 flex flex-col gap-3 bg-white">
            {/* Primary: Facture */}
            <Button
              onClick={handlePrintInvoice}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-md font-bold"
            >
              <Printer className="mr-2 h-5 w-5" />
              Imprimer la Facture
            </Button>

            {/* Reçu d'Avance — only shown if avance was collected */}
            {avance != null && avance > 0 && (
              <Button
                variant="outline"
                onClick={handlePrintRecu}
                className="w-full h-12 border-2 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 text-md font-bold"
              >
                <Receipt className="mr-2 h-5 w-5" />
                Reçu d&apos;Avance ({avance.toFixed(2)} DH)
              </Button>
            )}

            {/* Bon de Commande (Logic from Sales Table) */}
            <Button
              variant="outline"
              onClick={() => setShowShareDialog(true)}
              className="w-full h-12 border-2 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 text-md font-bold"
            >
              <Glasses className="mr-2 h-5 w-5" />
              Bon de Commande
            </Button>

            <Button
              variant="ghost"
              onClick={handleFinish}
              className="w-full h-12 text-slate-500 hover:bg-slate-100 hover:text-slate-900 text-md font-bold mt-2"
            >
              <Home className="mr-2 h-5 w-5" />
              Terminer et revenir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lens Order Share Dialog — Same logic as table actions */}
      <LensOrderShareDialog
        saleId={saleId}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
      />
    </>
  );
}
