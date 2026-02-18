"use client";
import React, { useState, useEffect } from "react";
import { getProducts } from "@/app/actions/products-actions";
import { type Product } from "@/app/actions/products-actions";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, AlertTriangle, Package, Trash2, Plus, Minus, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LigneVente {
  produit: Product;
  quantite: number;
  prixUnitaire: number;
}

interface Props {
  lignes: LigneVente[];
  onChange: (lignes: LigneVente[]) => void;
}

export default function Step3Produits({ lignes, onChange }: Props) {
  const [produits, setProduits] = useState<Product[]>([]);
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduits = async () => {
      try {
        const result = await getProducts(undefined);
        if (result.success && result.data) {
          setProduits(result.data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProduits();
  }, []);

  const produitsFiltres = produits.filter((p) =>
    p.nomProduit.toLowerCase().includes(recherche.toLowerCase()) ||
    p.reference.toLowerCase().includes(recherche.toLowerCase()) ||
    (p.brand && p.brand.toLowerCase().includes(recherche.toLowerCase()))
  );

  const ajouterProduit = (produit: Product) => {
    const existe = lignes.find((l) => l.produit.id === produit.id);
    if (existe) {
      onChange(
        lignes.map((l) =>
          l.produit.id === produit.id
            ? { ...l, quantite: l.quantite + 1 }
            : l
        )
      );
    } else {
      onChange([...lignes, { produit, quantite: 1, prixUnitaire: produit.prixVente }]);
    }
  };

  const supprimerLigne = (id: string) =>
    onChange(lignes.filter((l) => l.produit.id !== id));

  const changerQte = (id: string, qte: number) => {
    if (qte < 1) return supprimerLigne(id);
    onChange(lignes.map((l) => (l.produit.id === id ? { ...l, quantite: qte } : l)));
  };

  const total = lignes.reduce((acc, l) => acc + l.prixUnitaire * l.quantite, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Search Input */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <Input
          placeholder="ابحث عن إطار، عدسات، أو مرجع المنتج..."
          className="h-14 pl-12 pr-4 bg-slate-50 border-none rounded-2xl text-lg font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-500" /> المنتجات المتوفرة
             </h3>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {produitsFiltres.length} منتجات وجدت
             </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-none">
            {loading ? (
              <div className="col-span-2 py-12 text-center text-slate-400 font-medium">⏳ جاري تحميل الكتالوج...</div>
            ) : produitsFiltres.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                 لا توجد نتائج مطابقة
              </div>
            ) : (
              produitsFiltres.map((p) => (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  key={p.id}
                  className={`relative p-4 rounded-2xl bg-white border border-slate-100 shadow-sm cursor-pointer hover:border-blue-500 transition-all group ${p.quantiteStock <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => p.quantiteStock > 0 && ajouterProduit(p)}
                >
                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{p.nomProduit}</p>
                    <p className="text-[10px] text-slate-400 font-mono tracking-tighter truncate">{p.reference}</p>
                    <p className="text-sm font-black text-blue-600 self-end mt-2">{p.prixVente.toFixed(2)} MAD</p>
                  </div>
                  
                  <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${p.quantiteStock < 3 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                    Stock: {p.quantiteStock}
                  </div>
                  
                  {p.quantiteStock > 0 && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="h-4 w-4 text-blue-500 bg-blue-50 rounded-full" />
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Selected Items (Cart/Panier) */}
        <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 flex flex-col h-full min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
             <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-500" /> سلة المشتريات
             </h3>
             <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                {lignes.length} منتجات
             </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-none">
            <AnimatePresence initial={false}>
              {lignes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                   <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Package className="h-8 w-8 text-slate-200" />
                   </div>
                   <p className="text-sm font-medium">السلة فارغة حالياً</p>
                </div>
              ) : (
                lignes.map((l) => (
                  <motion.div
                    key={l.produit.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-50"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm leading-tight">{l.produit.nomProduit}</p>
                      <p className="text-[10px] text-slate-400">{(l.prixUnitaire * l.quantite).toFixed(2)} MAD</p>
                    </div>
                    
                    <div className="flex items-center bg-slate-50 rounded-xl px-2 py-1 gap-3">
                       <button onClick={() => changerQte(l.produit.id, l.quantite - 1)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <Minus className="h-3 w-3" />
                       </button>
                       <span className="text-xs font-black text-slate-700">{l.quantite}</span>
                       <button onClick={() => ajouterProduit(l.produit)} className="text-slate-400 hover:text-blue-500 transition-colors">
                          <Plus className="h-3 w-3" />
                       </button>
                    </div>

                    <button 
                      onClick={() => supprimerLigne(l.produit.id)}
                      className="h-8 w-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 space-y-1">
            <div className="flex justify-between items-center text-sm font-bold text-slate-500 uppercase tracking-widest px-2">
               <span>المجموع الإجمالي</span>
               <div className="h-px flex-1 mx-4 bg-slate-200 border-dashed border-t" />
               <span className="text-blue-600 text-2xl font-black">{total.toFixed(2)} MAD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
