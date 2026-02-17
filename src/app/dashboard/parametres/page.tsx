// 'use client'; // Converted to Server Component
export const dynamic = "force-dynamic";
import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Building2, 
  Tag, 
  Layers, 
  Palette, 
  HardHat, 
  Stethoscope, 
  CreditCard, 
  DatabaseBackup,
  Wrench,
  FileText,
  ShieldCheck // Helper icon
} from 'lucide-react';
import { ShopProfileForm } from '@/components/settings/shop-profile-form';
import { ManageSettings } from '@/components/settings/manage-settings';
import { DataBackup } from '@/components/settings/data-backup';
import { DocumentSettingsForm } from '@/components/settings/document-settings-form';
import { getShopProfile } from '@/app/actions/shop-actions';

// Helper icon component definition moved outside or kept if simple
// Since this is a server component, simple functional components are fine.

export default async function ParametresPage() {
  // 1. Fetch data on the server
  const shopProfile = await getShopProfile();

  // We should allow rendering the page even if profile is missing, 
  // to allow the user to access the "Shop Profile" tab to Create it.
  
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-slate-900">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <Settings className="h-6 w-6" />
          </div>
          Configuration & Paramètres
        </h1>
        <p className="text-slate-500 text-lg">
          Gérez les informations de votre boutique et personnalisez vos catalogues de données.
        </p>
      </div>

      <Tabs defaultValue="shop" className="space-y-6">
        <div className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md pb-4 pt-2 -mx-2 px-2 border-b border-slate-200">
          <TabsList className="bg-slate-200/50 p-1 rounded-xl w-full justify-start overflow-x-auto h-auto min-h-[50px] flex-wrap">
            <TabsTrigger value="shop" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Building2 className="h-4 w-4" />
              Établissement
            </TabsTrigger>
            
            <TabsTrigger value="documents" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" />
              Modèles Documents
            </TabsTrigger>

            <TabsTrigger value="brands" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Tag className="h-4 w-4" />
              Marques
            </TabsTrigger>
            
            <TabsTrigger value="categories" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Layers className="h-4 w-4" />
              Catégories
            </TabsTrigger>
            
            <TabsTrigger value="materials" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <HardHat className="h-4 w-4" />
              Matières
            </TabsTrigger>
            
            <TabsTrigger value="colors" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Palette className="h-4 w-4" />
              Couleurs
            </TabsTrigger>

            <TabsTrigger value="treatments" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Stethoscope className="h-4 w-4" />
              Traitements
            </TabsTrigger>

            <TabsTrigger value="insurances" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              Mutuelles
            </TabsTrigger>

            <TabsTrigger value="mounting" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Wrench className="h-4 w-4" />
              Montages
            </TabsTrigger>
            
            <TabsTrigger value="banks" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <CreditCard className="h-4 w-4" />
              Banques
            </TabsTrigger>
            
            <TabsTrigger value="backup" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm ml-auto text-amber-700">
              <DatabaseBackup className="h-4 w-4" />
              Sauvegarde
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. Shop Profile - Always Renders to allow creation */}
        <TabsContent value="shop" className="space-y-6 focus-visible:outline-none">
          <ShopProfileForm />
        </TabsContent>

        {/* 1b. Document Settings - Only Renders if Profile Exists */}
        <TabsContent value="documents" className="focus-visible:outline-none">
          {shopProfile && shopProfile.id ? (
            <DocumentSettingsForm shopId={shopProfile.id} initialShopProfile={shopProfile} />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-3 bg-white rounded-xl border border-dashed border-slate-300">
               <div className="bg-slate-100 p-3 rounded-full">
                 <Building2 className="h-6 w-6 text-slate-400" />
               </div>
               <h3 className="font-semibold text-slate-900">Profil Boutique requis</h3>
               <p className="text-slate-500 max-w-sm">
                 Veuillez d'abord configurer les informations de votre établissement dans l'onglet "Établissement" avant de personnaliser vos documents, puis rechargez la page.
               </p>
            </div>
          )}
        </TabsContent>

        {/* 2. Inventory Catalogs */}
        <TabsContent value="brands" className="focus-visible:outline-none">
          <ManageSettings 
            type="brands" 
            title="Catalogue des Marques" 
            description="Gérez les marques de montures et verres disponibles dans votre stock." 
            itemName="Marque"
            showCategory={true}
          />
        </TabsContent>

        <TabsContent value="categories" className="focus-visible:outline-none">
          <ManageSettings 
            type="categories" 
            title="Catégories de Produits" 
            description="Définissez les catégories pour organiser votre inventaire." 
            itemName="Catégorie"
          />
        </TabsContent>

        <TabsContent value="materials" className="focus-visible:outline-none">
          <ManageSettings 
            type="materials" 
            title="Matières & Propriétés" 
            description="Liste des types de verres et matériaux utilisés." 
            itemName="Matière"
          />
        </TabsContent>

        <TabsContent value="colors" className="focus-visible:outline-none">
          <ManageSettings 
            type="colors" 
            title="Nuancier de Couleurs" 
            description="Gérez les coloris disponibles pour vos produits." 
            itemName="Couleur"
          />
        </TabsContent>

        <TabsContent value="treatments" className="focus-visible:outline-none">
          <ManageSettings 
            type="treatments" 
            title="Options de Traitements" 
            description="Antireflet, Durci, Blue Block, etc." 
            itemName="Traitement"
          />
        </TabsContent>

        <TabsContent value="insurances" className="focus-visible:outline-none">
          <ManageSettings 
            type="insurances" 
            title="Mutuelles & Assurances" 
            description="Liste des organismes tiers payants pour les dossiers clients." 
            itemName="Mutuelle"
          />
        </TabsContent>

        <TabsContent value="mounting" className="focus-visible:outline-none">
          <ManageSettings 
            type="mountingTypes" 
            title="Types de Montages" 
            description="Percé, Rainuré, Cerclé, etc." 
            itemName="Montage"
          />
        </TabsContent>

        <TabsContent value="banks" className="focus-visible:outline-none">
          <ManageSettings 
            type="banks" 
            title="Comptes Bancaires" 
            description="Gérez les banques pour le suivi de vos encaissements." 
            itemName="Banque"
          />
        </TabsContent>

        {/* 3. Data Management */}
        <TabsContent value="backup" className="focus-visible:outline-none">
          <DataBackup />
        </TabsContent>
      </Tabs>
    </div>
  );
}


