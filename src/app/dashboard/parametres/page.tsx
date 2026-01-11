import { PageHeader } from "@/components/page-header";
import { ManageBrands } from "@/components/settings/manage-brands";
import { ManageMaterials } from "@/components/settings/manage-materials";
import { ManageGeneric } from "@/components/settings/manage-generic";
import { ShopProfileForm } from "@/components/settings/shop-profile-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { seedCategories } from "@/lib/categories-seed";
import { seedCouleurs } from "@/lib/couleurs-seed";
import { seedTraitements } from "@/lib/traitements-seed";
import { seedTypesMontage } from "@/lib/types-montage-seed";
import { seedBanques } from "@/lib/banques-seed";
import { seedAssurances } from "@/lib/assurances-seed";

export default function SettingsPage() {
    const settingsCategories = [
        { value: "categories", label: "Catégories", collection: "categories", itemName: "Catégorie", seedData: seedCategories, seedButtonText: "Importer Catégories" },
        { value: "marques", label: "Marques" },
        { value: "matieres", label: "Matières" },
        { value: "couleurs", label: "Couleurs", collection: "couleurs", itemName: "Couleur", seedData: seedCouleurs, seedButtonText: "Importer Couleurs" },
        { value: "traitements", label: "Traitements", collection: "traitements", itemName: "Traitement", seedData: seedTraitements, seedButtonText: "Importer Traitements" },
        { value: "typesMontage", label: "Types Montage", collection: "typesMontage", itemName: "Type de Montage", seedData: seedTypesMontage, seedButtonText: "Importer Types" },
        { value: "banques", label: "Banques", collection: "banques", itemName: "Banque", seedData: seedBanques, seedButtonText: "Importer Banques" },
        { value: "assurances", label: "Assurances", collection: "assurances", itemName: "Assurance", seedData: seedAssurances, seedButtonText: "Importer Assurances" },
    ];

    return (
        <div className="flex flex-1 flex-col gap-4 p-8 pt-6">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Paramètres</h2>
                <p className="text-muted-foreground">
                    Gérez les paramètres de votre boutique et de vos produits.
                </p>
            </div>

            <Tabs defaultValue="shop" className="flex-1">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
                    <TabsTrigger value="shop">🏪 Ma Boutique</TabsTrigger>
                    {settingsCategories.map(cat => <TabsTrigger key={cat.value} value={cat.value} className="capitalize">{cat.label}</TabsTrigger>)}
                </TabsList>

                {/* Ma Boutique Tab */}
                <TabsContent value="shop">
                    <ShopProfileForm />
                </TabsContent>

                {settingsCategories.map(cat => {
                    if (cat.value === 'marques') {
                        return <TabsContent key={cat.value} value={cat.value}><ManageBrands /></TabsContent>;
                    }
                    if (cat.value === 'matieres') {
                        return <TabsContent key={cat.value} value={cat.value}><ManageMaterials /></TabsContent>;
                    }
                    if (cat.collection) {
                        return (
                            <TabsContent key={cat.value} value={cat.value}>
                                <ManageGeneric
                                    collectionName={cat.collection}
                                    itemName={cat.itemName}
                                    title={`Gérer les ${cat.label}`}
                                    description={`Ajoutez, modifiez ou supprimez des ${cat.label.toLowerCase()} de votre système.`}
                                    seedData={cat.seedData}
                                    seedButtonText={cat.seedButtonText}
                                />
                            </TabsContent>
                        );
                    }
                    return null;
                })}

            </Tabs>
        </div>
    );
}
