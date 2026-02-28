'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Eye, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientLensesSectionProps {
  lenses: any[];
  onAddToCart: (product: any, lensOrder: any) => void;
  addedLensIds?: string[];
}

export function ClientLensesSection({ lenses, onAddToCart, addedLensIds = [] }: ClientLensesSectionProps) {
  if (lenses.length === 0) {
    return (
      <div className="text-center py-12 text-blue-400 bg-blue-50/30 rounded-lg border border-dashed border-blue-200">
        <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Aucune commande de verres disponible pour ce client</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 animate-in fade-in duration-500 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-lg flex items-center gap-2 text-blue-900">
          <Eye className="h-5 w-5 text-blue-600" />
          Verres du Client Prêts
          <Badge variant="secondary" className="bg-blue-200 text-blue-800 ml-2 hover:bg-blue-300">
            {lenses.length}
          </Badge>
        </h3>
        <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm shadow-blue-200">
            Prêtes à vendre
        </Badge>
      </div>
      
      {/* Liste des verres */}
      <div className="grid gap-3">
        {lenses.map((item) => {
            const lensOrder = item.lensOrder || item;
            const product = item.product || null;
            const isAdded = addedLensIds.includes(lensOrder.id.toString());
            
            return (
              // Carte avec styling bleu ("zone f zrek")
                <Card key={lensOrder.id} className={cn(
                    "p-4 transition-all hover:shadow-md border-l-4 group relative",
                    isAdded 
                      ? "border-l-slate-300 border-slate-200 opacity-60 bg-slate-50" 
                      : "border-l-blue-500 border-blue-200 bg-white hover:border-l-blue-600"
                )}>
                  <div className="flex items-center justify-between gap-4">
                    
                    {/* Info Verres */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="font-bold border-blue-200 text-blue-700 bg-blue-50/50">
                          {product?.reference || mapLensTypeToLabel(lensOrder.lensType)}
                        </Badge>
                        {lensOrder.treatment && (
                          <Badge variant="secondary" className="text-[10px] bg-sky-100 text-sky-800 border border-sky-200">
                            {lensOrder.treatment}
                          </Badge>
                        )}
                        <span className="text-xs text-slate-500 whitespace-nowrap flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Reçu le {lensOrder.receivedDate ? format(new Date(lensOrder.receivedDate), 'dd MMM', { locale: fr }) : '-'}
                        </span>
                      </div>
                      
                      <div className="text-sm space-y-1 pl-1">
                        {/* Prescription résumé */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-700 mt-2 bg-slate-50/80 p-2.5 rounded-md border border-slate-100">
                          <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-500 w-6">OD</span> 
                              <span className="font-mono text-slate-600">{formatDiopter(lensOrder.sphereR)}  {formatDiopter(lensOrder.cylindreR)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-500 w-6">OG</span>
                              <span className="font-mono text-slate-600">{formatDiopter(lensOrder.sphereL)}  {formatDiopter(lensOrder.cylindreL)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Prix */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <p className="text-xl font-bold text-blue-900">
                        {parseFloat(lensOrder.sellingPrice).toFixed(2)} <span className="text-xs font-normal text-slate-400">DH</span>
                      </p>
                      
                      {/* Bouton Ajouter */}
                      <Button
                        size="sm"
                        onClick={() => onAddToCart(product, lensOrder)}
                        disabled={isAdded}
                        className={cn(
                            "gap-2 min-w-[110px] shadow-sm",
                            isAdded 
                              ? "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-100" 
                              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                        )}
                      >
                        {isAdded ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Ajouté
                            </>
                        ) : (
                            <>
                              <ShoppingCart className="h-4 w-4" />
                              Ajouter
                            </>
                        )}
                      </Button>
                    </div>
                    
                  </div>
                </Card>
            );
        })}
      </div>
    </div>
  );
}

function formatDiopter(value: any) {
  if (!value) return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  // Always verify if integer or float to avoid unnecessary zeros? 
  // Standard prescription format is typically +0.00
  return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
}

function mapLensTypeToLabel(type: string) {
  const map: Record<string, string> = {
    'unifocal': 'Unifocaux',
    'progressive': 'Progressifs',
    'bifocal': 'Bifocaux',
    'contact': 'Lentilles',
  };
  return map[type] || 'Verres';
}
