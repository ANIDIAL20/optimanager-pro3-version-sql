"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createSale } from "@/features/sales/actions";
import { useToast } from "@/hooks/use-toast";
import Step1Client from "./Step1Client";
import Step2Mesures from "./Step2Mesures";
import Step3Produits from "./Step3Produits";
import Step4Paiement from "./Step4Paiement";
import WizardProgress from "./WizardProgress";
import "@/styles/wizard.css";

const STEPS = [
  { id: 1, title: 'العميل', subtitle: 'من غيشري؟', icon: '👤' },
  { id: 2, title: 'المقاسات', subtitle: 'قياس النظر', icon: '👓' },
  { id: 3, title: 'المنتجات', subtitle: 'شنو غيشري؟', icon: '📦' },
  { id: 4, title: 'الدفع', subtitle: 'التأكيد والدفع', icon: '💰' },
];

const initMesures = {
  od: { sphere: "", cylindre: "", axe: "", addition: "" },
  og: { sphere: "", cylindre: "", axe: "", addition: "" },
  remarques: "",
};

export default function QuickSaleWizard({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [client, setClient] = useState<any>(null);
  const [mesures, setMesures] = useState(initMesures);
  const [lignes, setLignes] = useState<any[]>([]);
  const [paiement, setPaiement] = useState({ 
    mode: "complet" as "complet" | "acompte", 
    montantPaye: 0, 
    remarques: "" 
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const totalTTC = lignes.reduce((s: number, l: any) => s + l.prixUnitaire * l.quantite, 0);

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleClientSelected = (c: any) => {
    setClient(c);
    nextStep();
  };

  const validerVente = async () => {
    setLoading(true);
    try {
      const saleData = {
        clientId: client.id,
        clientName: client.nom,
        items: lignes.map((l, index) => ({
          productId: l.produit.id.toString(),
          name: l.produit.nomProduit,
          quantity: l.quantite,
          price: l.prixUnitaire,
          total: l.prixUnitaire * l.quantite,
          brand: l.produit.brand,
          reference: l.produit.reference,
          lensDetails: index === 0 ? [
            {
              eye: 'OD' as const,
              sphere: mesures.od.sphere,
              cylinder: mesures.od.cylindre,
              axis: mesures.od.axe,
              addition: mesures.od.addition
            },
            {
              eye: 'OG' as const,
              sphere: mesures.og.sphere,
              cylinder: mesures.og.cylindre,
              axis: mesures.og.axe,
              addition: mesures.og.addition
            }
          ] : undefined
        })),
        totalHT: totalTTC / 1.2,
        totalTVA: totalTTC - (totalTTC / 1.2),
        totalTTC: totalTTC,
        totalPaid: paiement.mode === "complet" ? totalTTC : (paiement.montantPaye || 0),
        paymentMethod: 'ESPECES' as const,
        notes: `${paiement.remarques} ${mesures.remarques}`.trim(),
        status: (paiement.mode === "complet" || (paiement.montantPaye || 0) >= totalTTC) ? "PAYE" : "PARTIEL" as any
      };

      const result = await createSale(saleData);
      
      if (result) {
        setDone(true);
        toast({ title: "✅ تم الحفظ", description: "تمت عملية البيع بنجاح." });
      }
    } catch (e: any) {
      console.error(e);
      toast({ 
        title: "❌ خطأ", 
        description: e.message || "حدث خطأ غير متوقع. حاول مجدداً.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="wizard-overlay flex items-center justify-center p-4">
       <motion.div 
         initial={{ scale: 0.9, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         className="wizard-modal max-w-md w-full p-8 md:p-12 flex flex-col items-center text-center space-y-6 bg-white rounded-3xl shadow-2xl"
       >
          <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-inner">
             <motion.svg 
               initial={{ pathLength: 0 }}
               animate={{ pathLength: 1 }}
               className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"
             >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
             </motion.svg>
          </div>
          <div className="space-y-2">
             <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">تم البيع بنجاح!</h2>
             <p className="text-slate-500 font-medium italic">تم تسجيل العملية وخصم المخزون.</p>
             <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-full font-bold text-sm mt-2">
                فاتورة رقم: #S-{Math.floor(Math.random() * 9000) + 1000}
             </div>
          </div>
          <div className="w-full h-px bg-slate-100" />
          <div className="space-y-1">
             <p className="text-slate-500 text-sm">العميل: <strong className="text-slate-900">{client?.nom}</strong></p>
             <p className="text-slate-500 text-sm">المجموع: <strong className="text-blue-600 font-extrabold">{totalTTC.toFixed(2)} MAD</strong></p>
          </div>
          <div className="flex gap-3 w-full">
             <button className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all border border-slate-200" onClick={onClose}>إغلاق</button>
             <button className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-extrabold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">🖨️ طباعة</button>
          </div>
       </motion.div>
    </div>
  );

  return (
    <div className="wizard-overlay flex items-center justify-center p-2 md:p-4">
      <div className="wizard-modal flex flex-col w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[600px] max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 bg-white border-b border-slate-50">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
             </div>
             <div>
                <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">بيع سريــع (Wizard)</h2>
                <p className="text-xs text-slate-400 font-medium">خطوات بسيطة وسريعة لإتمام العملية</p>
             </div>
          </div>
          <button className="h-10 w-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors text-slate-400" onClick={onClose}>✕</button>
        </div>

        {/* Progress */}
        <WizardProgress steps={STEPS} currentStep={currentStep} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {currentStep === 1 && (
                <Step1Client 
                  selectedClient={client} 
                  onNext={handleClientSelected} 
                />
              )}
              {currentStep === 2 && (
                <Step2Mesures 
                  mesures={mesures} 
                  onChange={setMesures} 
                />
              )}
              {currentStep === 3 && (
                <Step3Produits 
                  lignes={lignes} 
                  onChange={setLignes} 
                />
              )}
              {currentStep === 4 && (
                <Step4Paiement 
                  total={totalTTC} 
                  paiement={paiement} 
                  onChange={setPaiement} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-4">
          {currentStep > 1 && (
            <button 
              className="h-12 px-6 rounded-2xl bg-white text-slate-600 font-bold hover:bg-slate-100 transition-all border border-slate-200 flex items-center gap-2" 
              onClick={prevStep}
            >
             <span>←</span> رجوع
            </button>
          )}
          
          <div className="flex-1" />

          {currentStep < 4 ? (
            <button 
              className="h-12 px-10 rounded-2xl bg-blue-600 text-white font-extrabold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50" 
              onClick={nextStep} 
              disabled={(currentStep === 1 && !client) || (currentStep === 3 && lignes.length === 0)}
            >
              متابعة <span>→</span>
            </button>
          ) : (
            <button 
              className="h-12 px-12 rounded-2xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50" 
              onClick={validerVente} 
              disabled={loading || lignes.length === 0}
            >
              {loading ? "جاري الحفظ..." : "تأكيد وإتمام البيع ✓"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
