"use client";
import React from "react";
import { Eye, Info, MessageSquareText } from "lucide-react";

interface MesureEye {
  sphere: string;
  cylindre: string;
  axe: string;
  addition: string;
}

interface Mesures {
  od: MesureEye;
  og: MesureEye;
  remarques: string;
}

interface Props {
  mesures: Mesures;
  onChange: (mesures: Mesures) => void;
}

const FIELDS = [
  { key: "sphere",   label: "Sphère (SPH)",    placeholder: "-1.50",  tip: "تصحيح قِصَر أو بُعد النظر" },
  { key: "cylindre", label: "Cylindre (CYL)",  placeholder: "-0.50",  tip: "تصحيح الاستجماتيزم" },
  { key: "axe",      label: "Axe (AXE)",       placeholder: "90",     tip: "اتجاه الاستجماتيزم (0-180°)" },
  { key: "addition", label: "Addition (ADD)",  placeholder: "+2.00",  tip: "للنظارات المتعددة البؤر (Presbytie)" },
] as const;

export default function Step2Mesures({ mesures, onChange }: Props) {
  const handleChange = (eye: "od" | "og", field: keyof MesureEye, value: string) => {
    onChange({
      ...mesures,
      [eye]: { ...mesures[eye], [field]: value },
    });
  };

  const EyeForm = ({ eye, label, iconColor }: { eye: "od" | "og"; label: string; iconColor: string }) => (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-6">
         <div className={`p-2 rounded-xl bg-${iconColor}-50 text-${iconColor}-600`}>
            <Eye className="h-5 w-5" />
         </div>
         <h3 className="font-extrabold text-slate-800 tracking-tight">{label}</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map(({ key, label: fLabel, placeholder, tip }) => (
          <div className="space-y-1.5" key={key}>
            <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              {fLabel}
              <Info className="h-3 w-3 cursor-help text-slate-300" title={tip} />
            </label>
            <input
              type="text"
              placeholder={placeholder}
              value={mesures[eye][key]}
              onChange={(e) => handleChange(eye, key, e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
         <div className="bg-blue-600 text-white rounded-lg p-1 mt-0.5">
            <Info className="h-4 w-4" />
         </div>
         <p className="text-sm text-blue-800 font-medium">💡 أدخل المقاسات من وصفة الطبيب. الحقول غير المملوءة ستبقى فارغة في السجل.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EyeForm eye="od" label="👁️ OD — العين اليمنى" iconColor="blue" />
        <EyeForm eye="og" label="👁️ OG — العين اليسرى" iconColor="indigo" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
           <MessageSquareText className="h-4 w-4 text-slate-400" />
           ملاحظات إضافية
        </label>
        <textarea
          placeholder="مثلاً: العميل يفضل عدسات مضادة للانعكاس..."
          value={mesures.remarques}
          onChange={(e) => onChange({ ...mesures, remarques: e.target.value })}
          className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          rows={3}
        />
      </div>
    </div>
  );
}
