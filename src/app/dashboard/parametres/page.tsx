import { ShopProfileForm } from "@/components/settings/shop-profile-form";
import { ManageSettings } from "@/components/settings/manage-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
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
                    <TabsTrigger value="shop">🏪 Boutique</TabsTrigger>
                    <TabsTrigger value="brands">Marques</TabsTrigger>
                    <TabsTrigger value="materials">Matières</TabsTrigger>
                    <TabsTrigger value="categories">Catégories</TabsTrigger>
                    <TabsTrigger value="colors">Couleurs</TabsTrigger>
                    <TabsTrigger value="treatments">Traitements</TabsTrigger>
                    <TabsTrigger value="mountingTypes">Types</TabsTrigger>
                    <TabsTrigger value="banks">Banques</TabsTrigger>
                    <TabsTrigger value="insurances">Mutuelles</TabsTrigger>
                </TabsList>

                {/* Shop Profile Tab */}
                <TabsContent value="shop" className="mt-6">
                    <ShopProfileForm />
                </TabsContent>

                {/* Brands Tab */}
                <TabsContent value="brands" className="mt-6">
                    <ManageSettings
                        type="brands"
                        title="Gérer les Marques"
                        description="Ajoutez, modifiez ou supprimez des marques de produits."
                        itemName="Marque"
                        showCategory={true}
                    />
                </TabsContent>

                {/* Materials Tab */}
                <TabsContent value="materials" className="mt-6">
                    <ManageSettings
                        type="materials"
                        title="Gérer les Matières"
                        description="Ajoutez, modifiez ou supprimez des matières de montures."
                        itemName="Matière"
                        showCategory={true}
                    />
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories" className="mt-6">
                    <ManageSettings
                        type="categories"
                        title="Gérer les Catégories"
                        description="Ajoutez, modifiez ou supprimez des catégories de produits."
                        itemName="Catégorie"
                    />
                </TabsContent>

                {/* Colors Tab */}
                <TabsContent value="colors" className="mt-6">
                    <ManageSettings
                        type="colors"
                        title="Gérer les Couleurs"
                        description="Ajoutez, modifiez ou supprimez des couleurs."
                        itemName="Couleur"
                    />
                </TabsContent>

                {/* Treatments Tab */}
                <TabsContent value="treatments" className="mt-6">
                    <ManageSettings
                        type="treatments"
                        title="Gérer les Traitements"
                        description="Ajoutez, modifiez ou supprimez des traitements de verres."
                        itemName="Traitement"
                    />
                </TabsContent>

                {/* Mounting Types Tab */}
                <TabsContent value="mountingTypes" className="mt-6">
                    <ManageSettings
                        type="mountingTypes"
                        title="Gérer les Types de Montage"
                        description="Ajoutez, modifiez ou supprimez des types de montage."
                        itemName="Type de Montage"
                    />
                </TabsContent>

                {/* Banks Tab */}
                <TabsContent value="banks" className="mt-6">
                    <ManageSettings
                        type="banks"
                        title="Gérer les Banques"
                        description="Ajoutez, modifiez ou supprimez des banques."
                        itemName="Banque"
                    />
                </TabsContent>

                {/* Insurances/Mutuelles Tab */}
                <TabsContent value="insurances" className="mt-6">
                    <ManageSettings
                        type="insurances"
                        title="Gérer les Mutuelles"
                        description="Ajoutez, modifiez ou supprimez des mutuelles/assurances."
                        itemName="Mutuelle"
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
