'use client';

import React, { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, RotateCcw, Printer, FileText, AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react';
import { toast } from 'sonner';
import {
  ClassicTemplateThumbnail,
  ModernTemplateThumbnail,
  MinimalTemplateThumbnail,
  BoldTemplateThumbnail,
  ElegantTemplateThumbnail,
} from '@/components/printing/templates/thumbnails';
import { PrintDocumentTemplate } from '@/components/printing/print-document-template';
import type { DocumentTemplateConfig, TemplateId, HeaderLayout, FontSize } from '@/types/document-template';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document-template';
import { saveDocumentConfig, getDocumentConfig } from '@/app/actions/shop-actions';
import type { StandardDocumentData } from '@/types/document.js';

// ── Demo data for live preview ──────────────────────────────────────────────
const DEMO_SHOP = {
  nom: 'OptiqVision Pro',
  adresse: '12 Rue Mohammed V, Casablanca 20000',
  telephone: '0522-123456',
  logoUrl: undefined,
  mentionsLegales: 'RC: 12345 | ICE: 001234567000000 | IF: 87654321',
  ice: '001234567000000',
  if_: '87654321',
  rc: '12345',
  rib: 'CIH 230 810 2220700000 46',
  paymentMethods: ['Espèces', 'Chèque', 'Carte'],
};

const DEMO_ITEMS_FACTURE = [
  { id: '1', description: 'Monture Ray-Ban Aviator Gold', marque: 'Ray-Ban', modele: 'Aviator', quantite: 1, prixUnitaire: 1200, total: 1200, tvaRate: 20 },
  { id: '2', description: 'Verres Organiques Anti-Reflet Blue Block', quantite: 2, prixUnitaire: 450, total: 900, tvaRate: 20 },
  { id: '3', description: 'Essentiel Étui +Chiffon', quantite: 1, prixUnitaire: 80, total: 80, tvaRate: 20 },
];

function buildDemo(type: 'FACTURE' | 'DEVIS' | 'BON DE COMMANDE' | 'REÇU', shop: typeof DEMO_SHOP): StandardDocumentData {
  if (type === 'REÇU') {
    return {
      type: 'REÇU',
      documentNumber: 'REC-DEMO-2026-0042',
      date: new Date().toISOString(),
      modePaiement: 'Carte Bancaire',
      shop,
      client: { nom: 'Karim El Hassani', telephone: '0661-234567', adresse: 'Quartier Palmier, Casablanca' },
      ordonnance: {
        prescripteur: 'Dr. Mohamed Alaoui',
        dateOrdonnance: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
      items: [
        { 
          id: '1', 
          description: 'Monture Ray-Ban RB3025', 
          marque: 'Ray-Ban', 
          modele: 'Aviator', 
          quantite: 1, 
          prixUnitaire: 650, 
          total: 650, 
          tvaRate: 20 
        },
        { 
          id: '2', 
          description: 'Verre Essilor Progressif OD', 
          marque: 'Essilor', 
          modele: 'Progressif', 
          quantite: 1, 
          prixUnitaire: 450, 
          total: 450, 
          tvaRate: 20,
          lensDetails: [{
            eye: 'OD', sphere: '+1.50', cylinder: '-0.75', axis: '90', addition: '+2.00', treatment: 'Anti-Reflet'
          }]
        },
        { 
          id: '3', 
          description: 'Verre Essilor Progressif OG', 
          marque: 'Essilor', 
          modele: 'Progressif', 
          quantite: 1, 
          prixUnitaire: 450, 
          total: 450, 
          tvaRate: 20,
          lensDetails: [{
            eye: 'OG', sphere: '+1.25', cylinder: '-0.50', axis: '85', addition: '+2.00', treatment: 'Anti-Reflet'
          }]
        },
      ],
      paiements: [
        { date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), mode: 'Espèces', montant: 500 },
        { date: new Date().toISOString(), mode: 'Carte Bancaire', montant: 1050 },
      ],
      montantEnLettres: 'Mille cinq cent cinquante Dirhams',
      totals: { sousTotal: 1291.67, tva: 258.33, totalTTC: 1550, acompte: 1550, resteAPayer: 0 },
    };
  }
  if (type === 'BON DE COMMANDE') {
    return {
      type: 'BON DE COMMANDE',
      documentNumber: 'BC-DEMO-001',
      date: new Date().toISOString(),
      shop,
      fournisseur: {
        nom: 'ESSILOR MAROC',
        adresse: 'Zone Industrielle, Casablanca',
        telephone: '0522-111222',
        contact: 'M. Dupont',
        conditionsPaiement: '30 jours fin de mois',
        delaiLivraison: '7-10 jours ouvrables',
      },
      commandeDetails: {
        lieuLivraison: `${shop.nom} — ${shop.adresse}`,
        dateLivraisonSouhaitee: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        observations: 'Patient: Karim El Hassani — Dr. Mohamed Alaoui — Ord. du 16/02/2026\nLivraison en une seule fois svp. Traitement AR obligatoire.',
      },
      items: [
        {
          id: '1',
          description: 'Verre Essilor Progressif Varilux — OD',
          marque: 'Essilor',
          modele: 'Varilux X Series 1.6',
          quantite: 1,
          prixUnitaire: 375,
          total: 375,
          lensDetails: [
            { eye: 'OD', sphere: '+1.50', cylinder: '-0.75', axis: '90', addition: '+2.00', treatment: 'Anti-Reflet Blue Block' },
          ],
        },
        {
          id: '2',
          description: 'Verre Essilor Progressif Varilux — OG',
          marque: 'Essilor',
          modele: 'Varilux X Series 1.6',
          quantite: 1,
          prixUnitaire: 375,
          total: 375,
          lensDetails: [
            { eye: 'OG', sphere: '+1.25', cylinder: '-0.50', axis: '85', addition: '+2.00', treatment: 'Anti-Reflet Blue Block' },
          ],
        },
      ],
      totals: { sousTotal: 750, totalTTC: 750 },
    };
  }
  return {
    type,
    documentNumber: type === 'FACTURE' ? 'FAC-DEMO-001' : 'DEV-DEMO-001',
    date: new Date().toISOString(),
    shop,
    client: { nom: 'Mohamed Alami', telephone: '0661-234567', adresse: 'Av. Hassan II, Rabat' },
    items: DEMO_ITEMS_FACTURE,
    totals: { sousTotal: 1817, tva: 363, totalTTC: 2180, acompte: 500, resteAPayer: 1680 },
  };
}

const TEMPLATES: { id: TemplateId; label: string; defaultColor: string }[] = [
  { id: 'classic',  label: 'Classique',    defaultColor: '#1e293b' },
  { id: 'modern',   label: 'Moderne',      defaultColor: '#4f46e5' },
  { id: 'minimal',  label: 'Minimaliste',  defaultColor: '#374151' },
  { id: 'bold',     label: 'Gras',         defaultColor: '#dc2626' },
  { id: 'elegant',  label: 'Élégant',      defaultColor: '#92400e' },
];

interface DocumentSettingsFormProps {
  shopId: number;
  initialShopProfile?: any;
  initialConfig?: DocumentTemplateConfig;
}

export function DocumentSettingsForm({ shopId, initialShopProfile, initialConfig }: DocumentSettingsFormProps) {
  const [config, setConfig] = useState<DocumentTemplateConfig>(
    initialConfig ?? DEFAULT_TEMPLATE_CONFIG
  );
  const [previewType, setPreviewType] = useState<'FACTURE' | 'DEVIS' | 'BON DE COMMANDE' | 'REÇU'>('FACTURE');
  const [isPending, startTransition] = useTransition();

  // ── Dynamic A4 scale ───────────────────────────────────────────────────────
  // 794px ≈ 210mm at 96 dpi (A4 width). We keep a small padding factor so the
  // sheet doesn't touch the container edges.
  const A4_PX = 794;
  const PADDING = 24; // px of visual breathing room on each side
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.62);

  const recalcScale = useCallback(() => {
    if (!previewContainerRef.current) return;
    const availableWidth = previewContainerRef.current.clientWidth - PADDING * 2;
    const newScale = Math.min(availableWidth / A4_PX, 1); // never scale > 100%
    setPreviewScale(parseFloat(newScale.toFixed(4)));
  }, []);

  // ── Sync from DB on mount ─────────────────────────────────────────────────
  // Re-fetch the saved config from the DB on client mount. This ensures the
  // form always reflects what is actually stored, even if the SSR-prop was
  // stale (e.g., document_settings was empty {} because an old save went to
  // the now-removed document_config column).
  useEffect(() => {
    getDocumentConfig().then((saved) => {
      // Only override if the DB has a real value (not just the bare default)
      if (saved && saved.templateId) {
        setConfig(saved);
      }
    }).catch(() => { /* keep current initialConfig on failure */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  useEffect(() => {
    recalcScale();
    const ro = new ResizeObserver(recalcScale);
    if (previewContainerRef.current) ro.observe(previewContainerRef.current);
    return () => ro.disconnect();
  }, [recalcScale]);

  // Build shop from initialShopProfile if available
  const demoShop: typeof DEMO_SHOP = {
    ...DEMO_SHOP,
    nom: initialShopProfile?.shopName ?? DEMO_SHOP.nom,
    adresse: initialShopProfile?.address ?? DEMO_SHOP.adresse,
    telephone: initialShopProfile?.phone ?? DEMO_SHOP.telephone,
    logoUrl: initialShopProfile?.logoUrl ?? undefined,
    ice: initialShopProfile?.ice ?? DEMO_SHOP.ice,
    rib: initialShopProfile?.rib ?? DEMO_SHOP.rib,
  };
  const demoData = buildDemo(previewType, demoShop);

  const update = (patch: Partial<DocumentTemplateConfig>) =>
    setConfig(prev => ({ ...prev, ...patch }));

  const handleSave = () => {
    startTransition(async () => {
      try {
        await saveDocumentConfig(config);
        toast.success('✅ Configuration enregistrée avec succès');
      } catch (err: any) {
        toast.error('Erreur: ' + err.message);
      }
    });
  };

  const handleReset = () => {
    setConfig(DEFAULT_TEMPLATE_CONFIG);
    toast.info('Configuration réinitialisée');
  };

  // Thumbnail picker helper
  const ThumbnailFor = ({ id }: { id: TemplateId }) => {
    const props = { selected: config.templateId === id, primaryColor: config.primaryColor };
    switch (id) {
      case 'classic':  return <ClassicTemplateThumbnail  {...props} />;
      case 'modern':   return <ModernTemplateThumbnail   {...props} />;
      case 'minimal':  return <MinimalTemplateThumbnail  {...props} />;
      case 'bold':     return <BoldTemplateThumbnail     {...props} />;
      case 'elegant':  return <ElegantTemplateThumbnail  {...props} />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[42%_58%] gap-6 h-[calc(100vh-210px)] min-h-[600px]">

      {/* ── LEFT: Controls Panel ─────────────────────────────────────────── */}
      <Card className="flex flex-col h-full overflow-hidden border border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-indigo-50/40 border-b py-4 px-5 shrink-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <FileText className="h-4 w-4 text-white" />
            </div>
            Personnalisation des Documents
          </CardTitle>
          <CardDescription className="text-xs">Canva-like — modifiez et voyez en direct</CardDescription>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ── SECTION A: Template Picker */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b pb-1.5 mb-3">
              A — Choisir un modèle
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
              {TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => update({ templateId: tpl.id })}
                  className="flex flex-col items-center gap-1.5 shrink-0 group"
                >
                  <ThumbnailFor id={tpl.id} />
                  <span className={`text-[11px] font-medium transition-colors ${
                    config.templateId === tpl.id ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-800'
                  }`}>
                    {tpl.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* ── SECTION B: Colors & Typography */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b pb-1.5 mb-3">
              B — Couleurs &amp; Typographie
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Primary Color */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Couleur Principale</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={e => update({ primaryColor: e.target.value })}
                    className="w-10 h-9 p-0.5 rounded border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={e => update({ primaryColor: e.target.value })}
                    onBlur={e => {
                      if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                        update({ primaryColor: '#000000' }); // Fallback or could keep previous valid
                      }
                    }}
                    className="flex-1 h-9 px-2 text-xs font-mono rounded border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Titres, bordures, boutons</p>
              </div>

              {/* Secondary Color */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Couleur Secondaire</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.secondaryColor}
                    onChange={e => update({ secondaryColor: e.target.value })}
                    className="w-10 h-9 p-0.5 rounded border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.secondaryColor}
                    onChange={e => update({ secondaryColor: e.target.value })}
                    onBlur={e => {
                      if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                        update({ secondaryColor: '#64748b' });
                      }
                    }}
                    className="flex-1 h-9 px-2 text-xs font-mono rounded border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Textes secondaires, détails</p>
              </div>
            </div>

            {/* Font Size */}
            <div className="mt-4 space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5"><Type className="h-3 w-3" /> Taille du texte</Label>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as FontSize[]).map(fs => (
                  <button
                    key={fs}
                    type="button"
                    onClick={() => update({ fontSize: fs })}
                    className={`flex-1 py-1.5 text-xs rounded border font-medium transition-all ${
                      config.fontSize === fs
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {fs === 'small' ? 'Petit' : fs === 'medium' ? 'Moyen' : 'Grand'}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── SECTION C: Header Layout */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b pb-1.5 mb-3">
              C — Mise en page du Header
            </h3>
            <Label className="text-xs font-medium mb-2 block">Position du logo</Label>
            <div className="flex gap-2">
              {([ 
                { id: 'logo-left',   icon: AlignLeft,   label: '◀ Logo   Titre' },
                { id: 'logo-center', icon: AlignCenter, label: '▼ Logo centré' },
                { id: 'logo-right',  icon: AlignRight,  label: 'Titre   Logo ▶' },
              ] as { id: HeaderLayout; icon: any; label: string }[]).map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update({ headerLayout: opt.id })}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded border text-[10px] font-medium transition-all ${
                      config.headerLayout === opt.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="leading-tight text-center">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── SECTION D: Visibility */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b pb-1.5 mb-3">
              D — Visibilité des informations
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {([
                { key: 'showLogo',         label: 'Logo' },
                { key: 'showAddress',      label: 'Adresse' },
                { key: 'showPhone',        label: 'Téléphone' },
                { key: 'showEmail',        label: 'Email' },
                { key: 'showICE',          label: 'ICE / Identifiants' },
                { key: 'showRIB',          label: 'RIB Bancaire' },
                { key: 'showSignatureBox', label: 'Zone Signature' },
                { key: 'showStamp',        label: 'Cachet (à venir)' },
              ] as { key: keyof DocumentTemplateConfig; label: string }[]).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`cb-${key}`}
                    checked={!!config[key]}
                    onCheckedChange={v => update({ [key]: v === true } as any)}
                    disabled={key === 'showStamp'}
                  />
                  <Label
                    htmlFor={`cb-${key}`}
                    className={`text-xs cursor-pointer ${key === 'showStamp' ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </section>

          {/* ── Footer Text */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b pb-1.5 mb-3">
              E — Texte Pied de page (optionnel)
            </h3>
            <Textarea
              value={config.footerText ?? ''}
              onChange={e => update({ footerText: e.target.value })}
              placeholder="Ex: SARL au capital de 10.000 DH — RC 12345 — Casablanca"
              rows={2}
              className="text-xs"
            />
            <p className="text-[10px] text-slate-400 mt-1">Remplace les mentions légales dans le footer</p>
          </section>

        </CardContent>

        <CardFooter className="bg-slate-50/80 border-t p-4 flex justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-600">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Réinitialiser
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[130px]"
          >
            {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Enregistrer
          </Button>
        </CardFooter>
      </Card>

      {/* ── RIGHT: Live Preview ──────────────────────────────────────────────── */}
      <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
        {/* Toolbar */}
        <div className="bg-slate-800 px-4 py-2.5 flex justify-between items-center border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            <Printer className="h-4 w-4 text-indigo-400" />
            Aperçu en direct
            <span className="text-[10px] text-slate-400 font-normal ml-1">— mise à jour instantanée</span>
          </div>
          {/* Doc type toggle */}
          <div className="flex bg-slate-700 rounded-lg p-0.5">
            {(['FACTURE', 'DEVIS', 'BON DE COMMANDE', 'REÇU'] as const).map(t => (
              <button
                key={t}
                onClick={() => setPreviewType(t)}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all ${
                  previewType === t ? 'bg-indigo-500 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                {t === 'BON DE COMMANDE' ? 'Bon Cmd' : t === 'FACTURE' ? 'Facture' : t === 'DEVIS' ? 'Devis' : 'Reçu'}
              </button>
            ))}
          </div>
        </div>

        {/* Scaled Preview */}
        <div
          ref={previewContainerRef}
          className="flex-1 overflow-auto bg-slate-700/30 flex justify-center pt-4 pb-6 px-2"
        >
          <div
            style={{
              transformOrigin: 'top center',
              transform: `scale(${previewScale})`,
              width: '210mm',
              minWidth: '210mm',
            }}
            className="shadow-2xl"
          >
            <PrintDocumentTemplate
              data={demoData}
              config={config}
              showToolbar={false}
            />
          </div>
        </div>

        {/* Color indicators */}
        <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <div className="w-4 h-4 rounded-full border border-slate-600 shadow-inner" style={{ background: config.primaryColor }} />
            Principale
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <div className="w-4 h-4 rounded-full border border-slate-600 shadow-inner" style={{ background: config.secondaryColor }} />
            Secondaire
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="bg-slate-700 px-2 py-0.5 rounded font-mono capitalize">{config.templateId}</span>
            <span className="bg-slate-700 px-2 py-0.5 rounded capitalize">{config.fontSize}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
