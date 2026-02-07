import { ShopProfileForm } from "@/components/settings/shop-profile-form";
import { ManageSettings } from "@/components/settings/manage-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Store, Palette, Shapes, Box, Sparkles, Grid3x3, CreditCard, Shield, Package } from "lucide-react";
import { DataBackup } from "@/components/settings/data-backup";

export default function SettingsPage() {
    return (
        <div className="flex flex-1 flex-col gap-6 p-8 pt-6 bg-gradient-to-br from-slate-50/50 via-white to-blue-50/30">
            {/* Hero Section with Modern Design */}
            <div className="relative space-y-3 pb-6 border-b border-slate-200/60">
                <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                            <Store className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                            Paramètres
                        </h1>
                    </div>
                    <p className="text-base text-slate-600 max-w-2xl pl-14">
                        Configurez et personnalisez votre boutique en toute simplicité. Gérez vos paramètres, vos données et vos préférences.
                    </p>
                </div>
            </div>

            {/* Modern Tabs with Enhanced Styling */}
            <Tabs defaultValue="shop" className="flex-1">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-lg blur-xl opacity-60 pointer-events-none" />
                    <TabsList className="relative grid w-full grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10 p-1 sm:p-1.5 bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-lg shadow-slate-500/5 gap-0.5 sm:gap-1">
                        <TabsTrigger 
                            value="shop" 
                            className="gap-1 sm:gap-1.5 px-1 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 transition-all duration-200"
                            title="Boutique"
                        >
                            <Store className="h-4 w-4 shrink-0" />
                            <span className="hidden md:inline">Boutique</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="brands"
                            className="gap-1 sm:gap-1.5 px-1 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 transition-all duration-200"
                            title="Marques"
                        >
                            <Sparkles className="h-4 w-4 shrink-0" />
                            <span className="hidden md:inline">Marques</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="materials"
                            className="gap-1 sm:gap-1.5 px-1 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 transition-all duration-200"
                            title="Matières"
                        >
                            <Box className="h-4 w-4 shrink-0" />
                            <span className="hidden md:inline">Matières</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="categories"
                            className="gap-1 sm:gap-1.5 px-1 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/30 transition-all duration-200"
                            title="Catégories"
                        >
                            <Grid3x3 className="h-4 w-4 shrink-0" />
                            <span className="hidden md:inline">Catégories</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="colors"
                            className="gap-1 sm:gap-1.5 px-1 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/30 transition-all duration-200"
                            title="Couleurs"
                        >
                            <Palette className="h-4 w-4 shrink-0" />
                            <span className="hidden md:inline">Couleurs</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="treatments"
                            className="gap-1 sm:gap-1.5 px-1 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/30 transition-all duration-200"
                            title="Traitements"
                        >
                            <Sparkles className="h-4 w-4 shrink-0" />
                            <span className="hidden md:inline">Traitements</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="mountingTypes"
                            className="gap-1 sm:gap-1.5 px-1 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/30 transition-all duration-200"
                            title="Types de Montage"
                        >
                            <Shapes className="h-4 w-4 shrink-0" />
                            <span className="hidden md:inline">Types</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="banks"
                            className="gap-1 sm:gap-1.5 px-1 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 transition-all duration-200"
                            title="Banques"
                        >
                            <CreditCard className="h-4 w-4 shrink-0" />
                            <span className="hidden md:inline">Banques</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="insurances"
                            className="gap-1 sm:gap-1.5 px-1 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 transition-all duration-200"
                            title="Mutuelles"
                        >
                            <Shield className="h-4 w-4 shrink-0" />
                            <span className="hidden md:inline">Mutuelles</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="backup" 
                            className="gap-1 sm:gap-1.5 px-1 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/30 transition-all duration-200"
                            title="Sauvegarde"
                        >
                            <Database className="h-4 w-4 shrink-0" />
                            <span className="hidden md:inline">Backup</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Shop Profile Tab */}
                <TabsContent value="shop" className="mt-8 animate-in fade-in-50 duration-500">
                    <ShopProfileForm />
                </TabsContent>

                {/* Brands Tab */}
                <TabsContent value="brands" className="mt-8 animate-in fade-in-50 duration-500">
                    <ManageSettings
                        type="brands"
                        title="Gérer les Marques"
                        description="Ajoutez, modifiez ou supprimez des marques de produits."
                        itemName="Marque"
                        showCategory={true}
                    />
                </TabsContent>

                {/* Materials Tab */}
                <TabsContent value="materials" className="mt-8 animate-in fade-in-50 duration-500">
                    <ManageSettings
                        type="materials"
                        title="Gérer les Matières"
                        description="Ajoutez, modifiez ou supprimez des matières de montures."
                        itemName="Matière"
                        showCategory={true}
                    />
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories" className="mt-8 animate-in fade-in-50 duration-500">
                    <ManageSettings
                        type="categories"
                        title="Gérer les Catégories"
                        description="Ajoutez, modifiez ou supprimez des catégories de produits."
                        itemName="Catégorie"
                    />
                </TabsContent>

                {/* Colors Tab */}
                <TabsContent value="colors" className="mt-8 animate-in fade-in-50 duration-500">
                    <ManageSettings
                        type="colors"
                        title="Gérer les Couleurs"
                        description="Ajoutez, modifiez ou supprimez des couleurs."
                        itemName="Couleur"
                    />
                </TabsContent>

                {/* Treatments Tab */}
                <TabsContent value="treatments" className="mt-8 animate-in fade-in-50 duration-500">
                    <ManageSettings
                        type="treatments"
                        title="Gérer les Traitements"
                        description="Ajoutez, modifiez ou supprimez des traitements de verres."
                        itemName="Traitement"
                    />
                </TabsContent>

                {/* Mounting Types Tab */}
                <TabsContent value="mountingTypes" className="mt-8 animate-in fade-in-50 duration-500">
                    <ManageSettings
                        type="mountingTypes"
                        title="Gérer les Types de Montage"
                        description="Ajoutez, modifiez ou supprimez des types de montage."
                        itemName="Type de Montage"
                    />
                </TabsContent>

                {/* Banks Tab */}
                <TabsContent value="banks" className="mt-8 animate-in fade-in-50 duration-500">
                    <ManageSettings
                        type="banks"
                        title="Gérer les Banques"
                        description="Ajoutez, modifiez ou supprimez des banques."
                        itemName="Banque"
                    />
                </TabsContent>

                {/* Insurances/Mutuelles Tab */}
                <TabsContent value="insurances" className="mt-8 animate-in fade-in-50 duration-500">
                    <ManageSettings
                        type="insurances"
                        title="Gérer les Mutuelles"
                        description="Ajoutez, modifiez ou supprimez des mutuelles/assurances."
                        itemName="Mutuelle"
                    />
                </TabsContent>

                {/* Data Backup Tab */}
                <TabsContent value="backup" className="mt-8 animate-in fade-in-50 duration-500">
                    <DataBackup />
                </TabsContent>
            </Tabs>
        </div>
    );
}
