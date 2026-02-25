"use client";
import React from "react";
import { Eye, Info, MessageSquareText, HelpCircle, Copy } from "lucide-react";

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
  { key: "sphere",   label: "Sphère (SPH)",    placeholder: "+2.00",  tip: "Puissance de la lentille (+ pour loin, - pour près)" },
  { key: "cylindre", label: "Cylindre (CYL)",  placeholder: "-0.50",  tip: "Correction de l'astigmatisme" },
  { key: "axe",      label: "Axe (AXE)",       placeholder: "90",     tip: "Direction de l'astigmatisme (0-180°)" },
  { key: "addition", label: "Addition (ADD)",  placeholder: "+1.50",  tip: "Pour la lecture (progressive ou bifocale)" },
] as const;

export default function Step2Mesures({ mesures, onChange }: Props) {
  const handleChange = (eye: "od" | "og", field: keyof MesureEye, value: string) => {
    onChange({
      ...mesures,
      [eye]: { ...mesures[eye], [field]: value },
    });
  };

  const copyOdToOg = () => {
    onChange({
      ...mesures,
      og: { ...mesures.od },
    });
  };

  const EyeForm = ({ eye, label, iconColor }: { eye: "od" | "og"; label: string; iconColor: string }) => (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-${iconColor}-50 opacity-20 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform`} />
      
      <div className="flex items-center gap-3 mb-6 relative">
         <div className={`p-2.5 rounded-xl bg-${iconColor}-50 text-${iconColor}-600`}>
            <Eye className="h-5 w-5" />
         </div>
         <div>
            <h3 className="font-extrabold text-slate-800 tracking-tight leading-none">{label}</h3>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">{eye === 'od' ? 'Oculus Dexter' : 'Oculus Sinister'}</p>
         </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 relative">
        {FIELDS.map(({ key, label: fLabel, placeholder, tip }) => (
          <div className="space-y-1.5" key={key}>
            <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 px-0.5">
              {fLabel}
              <HelpCircle className="h-3 w-3 cursor-help text-slate-300 hover:text-blue-500 transition-colors" />
            </label>
            <input
              type="text"
              placeholder={placeholder}
              value={mesures[eye][key]}
              onChange={(e) => handleChange(eye, key, e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border-2 border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none placeholder:text-slate-300"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
         <div className="bg-blue-600 text-white rounded-lg p-1.5 shadow-md shadow-blue-100">
            <Info className="h-4 w-4" />
         </div>
         <p className="text-sm text-blue-800 font-medium leading-relaxed">💡 Saisissez les mesures de l'ordonnance. Utilisez le bouton copier pour dupliquer l'œil droit vers l'œil gauche rapidement.</p>
      </div>

      <div className="flex flex-col gap-6">
        <EyeForm eye="od" label="👁️ OD — Œil Droit" iconColor="blue" />
        
        {/* Copy Button Divider */}
        <div className="flex items-center gap-4 py-2">
           <div className="h-px flex-1 bg-slate-100" />
           <button 
             type="button"
             onClick={copyOdToOg}
             className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-full text-xs font-extrabold text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all shadow-sm"
           >
             <Copy className="h-3.5 w-3.5" />
             Copier OD vers OG
           </button>
           <div className="h-px flex-1 bg-slate-100" />
        </div>

        <EyeForm eye="og" label="👁️ OG — Œil Gauche" iconColor="indigo" />
      </div>

      <div className="space-y-3 pt-4">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
           <MessageSquareText className="h-4 w-4 text-blue-500" />
           Remarques additionnelles (Optionnel)
        </label>
        <textarea
          placeholder="Ex : Sensibilité à la lumière, préfère les verres Transitions..."
          value={mesures.remarques}
          onChange={(e) => onChange({ ...mesures, remarques: e.target.value })}
          className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-3xl text-sm font-medium focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none min-h-[120px]"
          rows={3}
        />
      </div>
    </div>
  );
}
