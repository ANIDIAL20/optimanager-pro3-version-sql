'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Accès Non Autorisé</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Désolé, vous n'avez pas les permissions nécessaires pour accéder à cette page. 
          Veuillez contacter l'administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>

        <div className="grid grid-cols-1 gap-3">
          <Link 
            href="/dashboard" 
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
          >
            <Home className="w-5 h-5" />
            Retour au Tableau de Bord
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-3 px-6 rounded-xl transition-all duration-200 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            Page Précédente
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 italic text-xs text-slate-400">
          Code Erreur: 403 Forbidden | Système de Sécurité OptiManager Pro
        </div>
      </div>
    </div>
  );
}
