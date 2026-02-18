"use client";
import React from "react";
import { Banknote, CreditCard, ChevronRight, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

interface PaiementInfo {
  mode: "complet" | "acompte";
  montantPaye: number;
  remarques: string;
}

interface Props {
  total: number;
  paiement: PaiementInfo;
  onChange: (paiement: PaiementInfo) => void;
}

export default function Step4Paiement({ total, paiement, onChange }: Props) {
  const reste = total - (paiement.montantPaye || 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Total Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-100">
        <div className="relative z-10">
           <div className="flex items-center gap-2 mb-2 text-blue-100">
              <div className="h-6 w-6 bg-white/20 rounded-lg flex items-center justify-center">
                 <Tag className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">المبلغ المطلوب استخلاصه</span>
           </div>
           <h4 className="text-4xl font-black">{total.toFixed(2)} <span className="text-xl font-medium">MAD</span></h4>
        </div>
        
        {/* Decorative Circle */}
        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-32 h-32 bg-blue-400/20 rounded-full blur-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Options */}
        <div className="space-y-4">
           <h3 className="font-extrabold text-slate-800 flex items-center gap-2 px-2">
              <Banknote className="h-5 w-5 text-emerald-500" /> طريقة الأداء
           </h3>
           
           <div className="grid gap-3">
              <label 
                className={`relative flex items-center p-5 rounded-3xl border-2 cursor-pointer transition-all group ${
                  paiement.mode === "complet" ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  className="hidden"
                  value="complet"
                  checked={paiement.mode === "complet"}
                  onChange={() => onChange({ ...paiement, mode: "complet", montantPaye: total })}
                />
                <div className="flex-1 flex items-center gap-4">
                   <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${paiement.mode === "complet" ? "border-emerald-500" : "border-slate-200"}`}>
                      {paiement.mode === "complet" && <div className="h-3 w-3 rounded-full bg-emerald-500" />}
                   </div>
                   <div className="space-y-0.5">
                      <p className="font-extrabold text-slate-900 leading-none">دفع كامل (Total)</p>
                      <p className="text-[10px] text-slate-400 font-medium">العميل أدى المبلغ بالكامل الآن</p>
                   </div>
                </div>
                {paiement.mode === "complet" && <CheckCircle className="h-5 w-5 text-emerald-500" />}
              </label>

              <label 
                className={`relative flex items-center p-5 rounded-3xl border-2 cursor-pointer transition-all group ${
                  paiement.mode === "acompte" ? "border-amber-500 bg-amber-50/50" : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  className="hidden"
                  value="acompte"
                  checked={paiement.mode === "acompte"}
                  onChange={() => onChange({ ...paiement, mode: "acompte", montantPaye: 0 })}
                />
                <div className="flex-1 flex items-center gap-4">
                   <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${paiement.mode === "acompte" ? "border-amber-500" : "border-slate-200"}`}>
                      {paiement.mode === "acompte" && <div className="h-3 w-3 rounded-full bg-amber-500" />}
                   </div>
                   <div className="space-y-0.5">
                      <p className="font-extrabold text-slate-900 leading-none">تسبيق (Acompte)</p>
                      <p className="text-[10px] text-slate-400 font-medium">دفع جزء من المبلغ والباقي دين</p>
                   </div>
                </div>
                {paiement.mode === "acompte" && <AlertCircle className="h-5 w-5 text-amber-500" />}
              </label>
           </div>
        </div>

        {/* Amount Input */}
        <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 space-y-4 h-full">
           <AnimatePresence mode="wait">
             {paiement.mode === "acompte" ? (
               <motion.div 
                 key="acompte-input"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="space-y-4"
               >
                 <label className="text-sm font-bold text-slate-700">المبلغ المدفوع الآن (MAD)</label>
                 <div className="relative group">
                    <input
                      type="number"
                      autoFocus
                      placeholder="0.00"
                      className="w-full h-14 pl-14 pr-6 bg-white border-2 border-slate-100 rounded-2xl text-2xl font-black focus:border-amber-500 focus:ring-0 transition-all outline-none"
                      value={paiement.montantPaye || ""}
                      onChange={(e) => onChange({ ...paiement, montantPaye: parseFloat(e.target.value) || 0 })}
                    />
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black">MAD</div>
                 </div>
                 
                 <div className="bg-amber-100 overflow-hidden relative rounded-2xl p-4 flex justify-between items-center shadow-sm">
                    <span className="text-amber-900 font-bold text-xs uppercase tracking-wider">الباقي (Dette):</span>
                    <strong className="text-xl font-black text-amber-700">{reste.toFixed(2)} MAD</strong>
                 </div>
               </motion.div>
             ) : (
               <motion.div 
                 key="complet-msg"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="h-full flex flex-col items-center justify-center text-center space-y-3"
               >
                  <div className="h-16 w-16 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600">
                     <CheckCircle className="h-8 w-8" />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">سيتم تسجيل العملية كدفع كامل بقيمة <br/><strong className="text-slate-900">{total.toFixed(2)} MAD</strong></p>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      {/* Remarks */}
      <div className="space-y-2">
         <label className="text-sm font-bold text-slate-700 px-2 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-slate-400" /> ملاحظات أو مرجع الدفع
         </label>
         <textarea
            placeholder="مثلاً: الشيك رقم 12345، أو تحويل بنكي..."
            className="w-full p-5 bg-slate-50 border-none rounded-3xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            rows={2}
            value={paiement.remarques}
            onChange={(e) => onChange({ ...paiement, remarques: e.target.value })}
         />
      </div>
    </div>
  );
}

// Missing import fix
import { Tag } from "lucide-react";
