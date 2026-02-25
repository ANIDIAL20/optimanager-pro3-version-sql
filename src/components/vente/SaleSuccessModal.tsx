"use client";

import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Printer, Glasses, Home } from "lucide-react";
import { useRouter } from "next/navigation";

interface SaleSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
}

export function SaleSuccessModal({ isOpen, onClose, saleId }: SaleSuccessModalProps) {
  const router = useRouter();

  const handlePrintInvoice = () => {
    window.open(`/print/facture/${saleId}`, "_blank");
  };

  const handlePrintLabOrder = () => {
    window.open(`/dashboard/lens-orders/${saleId}/print`, "_blank");
  };

  const handleFinish = () => {
    onClose();
    router.push("/dashboard/ventes"); // كيرجعك لصفحة المبيعات
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleFinish()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
        {/* هاد الجزء الفوقاني بالأخضر */}
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

        {/* هادو هما 3 ديال الأزرار اللي تفهمنا عليهم */}
        <div className="p-6 flex flex-col gap-3 bg-white">
          
          <Button 
            onClick={handlePrintInvoice} 
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-md font-bold"
          >
            <Printer className="mr-2 h-5 w-5" />
            Imprimer le Reçu (Facture)
          </Button>

          <Button 
            variant="outline" 
            onClick={handlePrintLabOrder} 
            className="w-full h-12 border-2 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 text-md font-bold"
          >
            <Glasses className="mr-2 h-5 w-5" />
            Bon de Labo (Verres)
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
  );
}
