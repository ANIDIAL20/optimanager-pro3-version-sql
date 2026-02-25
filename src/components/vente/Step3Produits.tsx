"use client";
import React, { useState, useEffect, useMemo } from "react";
import { getProducts, type Product } from "@/app/actions/products-actions";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, AlertTriangle, Package, Trash2, Plus, Minus, Tag, Box, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await getProducts(undefined);
        if (result.success && result.data) {
          setProduits(result.data);
        }
      } catch (err) {
        toast({ title: "Erreur", description: "Échec du chargement des produits", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  const produitsFiltres = useMemo(() => {
    if (!recherche) return produits.slice(0, 20); // Show recent first
    const lowSearch = recherche.toLowerCase();
    return produits.filter((p) =>
      p.nomProduit?.toLowerCase().includes(lowSearch) ||
      p.reference?.toLowerCase().includes(lowSearch) ||
      p.brand?.toLowerCase().includes(lowSearch) ||
      p.category?.toLowerCase().includes(lowSearch)
    );
  }, [produits, recherche]);

  const handleAdd = (produit: Product) => {
    if (produit.quantiteStock <= 0) {
      toast({ title: "Alerte", description: "Produit en rupture de stock", variant: "destructive" });
      return;
    }

    const existe = lignes.find((l) => l.produit.id === produit.id);
    if (existe) {
      if (existe.quantite >= produit.quantiteStock) {
        toast({ title: "Désolé", description: "Quantité maximale en stock atteinte", variant: "destructive" });
        return;
      }
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

  const updateQte = (id: string, qte: number) => {
    if (qte < 1) return removeLigne(id);
    const ligne = lignes.find(l => l.produit.id === id);
    if (ligne && qte > (ligne.produit.quantiteStock || 0)) {
        toast({ title: "Alerte", description: "La quantité demandée dépasse le stock", variant: "destructive" });
        return;
    }
    onChange(lignes.map((l) => (l.produit.id === id ? { ...l, quantite: qte } : l)));
  };

  const removeLigne = (id: string) => onChange(lignes.filter((l) => l.produit.id !== id));

  const total = lignes.reduce((acc, l) => acc + l.prixUnitaire * l.quantite, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
         <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Package className="h-7 w-7 text-blue-600" /> Choisir les produits
         </h2>
         <p className="text-slate-500 text-sm font-medium mr-10">Ajouter des montures, verres ou accessoires au panier</p>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <Input
          placeholder="Rechercher un produit, référence, marque..."
          className="h-16 pl-14 pr-6 bg-white border-2 border-slate-100 rounded-3xl text-lg font-bold shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Product Catalog */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                <h3 className="font-extrabold text-slate-800">Catalogue</h3>
             </div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                {loading ? "Chargement..." : `${produitsFiltres.length} produits`}
             </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[550px] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-slate-200">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-3xl animate-pulse" />
              ))
            ) : produitsFiltres.length === 0 ? (
              <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                 <Box className="h-12 w-12 text-slate-200 mx-auto" />
                 <p className="text-slate-400 font-bold">Aucun produit correspondant</p>
              </div>
            ) : (
              produitsFiltres.map((p) => (
                <motion.div
                  key={p.id}
                  layoutId={p.id}
                  whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1)" }}
                  className={`relative p-5 rounded-3xl bg-white border border-slate-100 shadow-sm cursor-pointer transition-all group overflow-hidden ${p.quantiteStock <= 0 ? "opacity-60 grayscale" : ""}`}
                  onClick={() => handleAdd(p)}
                >
                  <div className="absolute -right-4 -top-4 w-12 h-12 bg-blue-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300" />
                  
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-start">
                       <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg font-black uppercase tracking-tighter truncate max-w-[100px]">
                          {p.category || 'Divers'}
                       </span>
                       <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-bold ${p.quantiteStock < 5 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                          <div className={`w-1 h-1 rounded-full ${p.quantiteStock < 5 ? "bg-amber-600" : "bg-emerald-600"} animate-pulse`} />
                          Stock : {p.quantiteStock}
                       </div>
                    </div>
                    
                    <div>
                      <h4 className="font-black text-slate-900 text-base leading-tight group-hover:text-blue-600 transition-colors">{p.nomProduit}</h4>
                      <p className="text-[11px] text-slate-400 font-medium mt-1">{p.reference} • {p.brand || 'No Brand'}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                       <span className="text-lg font-black text-blue-600">{p.prixVente.toFixed(2)} <span className="text-[10px]">MAD</span></span>
                       <button className="h-8 w-8 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 flex items-center justify-center translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                          <Plus className="h-4 w-4" />
                       </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Selected Items (Cart/Panier) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden flex flex-col min-h-[550px]">
            {/* Decorative background element */}
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-600/20 rounded-full blur-[80px]" />
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-600/20 rounded-full blur-[80px]" />

            <div className="relative z-10 flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                     <ShoppingCart className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg tracking-tight">Panier d'achat</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lignes.length} produits sélectionnés</p>
                  </div>
               </div>
               <button 
                 onClick={() => onChange([])}
                 className="text-xs font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full"
               >
                 Vider
               </button>
            </div>

            <div className="relative z-10 flex-1 space-y-3 overflow-y-auto scrollbar-none pb-4">
              <AnimatePresence initial={false} mode="popLayout">
                {lignes.length === 0 ? (
                  <div className="h-full py-20 flex flex-col items-center justify-center text-slate-500 space-y-4 text-center">
                     <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                        <Package className="h-10 w-10 text-white/10" />
                     </div>
                     <p className="text-sm font-bold italic">Le panier est vide</p>
                  </div>
                ) : (
                  lignes.map((l) => (
                    <motion.div
                      key={l.produit.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white/5 border border-white/5 hover:bg-white/10 transition-colors p-4 rounded-3xl"
                    >
                      <div className="flex items-start justify-between gap-4">
                         <div className="flex-1">
                            <p className="font-bold text-white text-sm line-clamp-1">{l.produit.nomProduit}</p>
                            <p className="text-[10px] text-blue-400 font-black mt-0.5">{l.produit.reference}</p>
                         </div>
                         <button 
                           onClick={() => removeLigne(l.produit.id)}
                           className="text-slate-600 hover:text-red-400 transition-colors"
                         >
                            <Trash2 className="h-4 w-4" />
                         </button>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                         <div className="flex items-center bg-black/40 rounded-2xl p-1 gap-4">
                            <button 
                              onClick={() => updateQte(l.produit.id, l.quantite - 1)}
                              className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-slate-400 active:scale-90"
                            >
                               <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-black min-w-[20px] text-center">{l.quantite}</span>
                            <button 
                              onClick={() => updateQte(l.produit.id, l.quantite + 1)}
                              className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-white active:scale-90"
                            >
                               <Plus className="h-3 w-3" />
                            </button>
                         </div>
                         <div className="text-right">
                           <p className="text-xs font-bold text-slate-400 opacity-50">{l.prixUnitaire.toFixed(2)} x {l.quantite}</p>
                           <p className="text-sm font-black text-white">{(l.prixUnitaire * l.quantite).toFixed(2)} MAD</p>
                         </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            <div className="relative z-10 mt-6 pt-6 border-t border-white/10">
               <div className="flex items-center justify-between mb-2 px-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Total Final</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-lg text-[9px] font-black">
                     TVA INCLUS
                  </div>
               </div>
               <div className="flex items-end justify-between px-2">
                  <span className="text-4xl font-black text-white tracking-tighter">
                    {total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-sm text-blue-500">MAD</span>
                  </span>
                  <div className="flex flex-col items-end opacity-50 text-[10px] font-bold text-slate-400 mb-1">
                     <span>{lignes.length} PRD ADDED</span>
                     <span>VAT 20%</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
