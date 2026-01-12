"use client";

import { useState } from "react";
import { createClient } from "@/app/actions/adminActions";
import { Loader2, UserPlus, DollarSign, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const FEATURES = [
  { id: 'inventory', name: 'Gestion d\'inventaire', defaultOn: true },
  { id: 'reports', name: 'Rapports de vente', defaultOn: true },
  { id: 'export', name: 'Export de données', defaultOn: false },
  { id: 'api', name: 'Accès API', defaultOn: false },
  { id: 'multistore', name: 'Multi-magasins', defaultOn: false },
  { id: 'analytics', name: 'Analyses avancées', defaultOn: false },
];

export default function EnhancedCreateClientForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    // Business info
    displayName: '',
    email: '',
    password: '',
    phoneNumber: '',
    
    // App License Component
    appLicenseEnabled: true,
    appLicenseAmount: 1499,
    appLicenseType: 'one-time' as 'one-time' | 'annual',
    appLicenseHasInstallments: false,
    appLicenseInstallmentCount: 3,
    
    // Subscription Component
    subscriptionEnabled: true,
    subscriptionAmount: 0,
    subscriptionCycle: 'yearly' as 'monthly' | 'yearly',
    
    // 🆕 Progressive Pricing
    subscriptionHasProgressivePricing: false,
    subscriptionGracePeriodMonths: 12,
    subscriptionPriceAfterGrace: 1000,
    
    // Trial
    trialEnabled: false,
    trialDays: 14,
    
    // Features (independent of price)
    features: ['inventory', 'reports'],
    
    // Usage limits
    limits: {
      maxUsers: 3,
      maxStorageGB: 5,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append('displayName', formData.displayName);
    data.append('email', formData.email);
    data.append('password', formData.password);
    data.append('phoneNumber', formData.phoneNumber);
    
    // Dual-component pricing
    data.append('pricingTier', 'custom');
    data.append('appLicenseEnabled', formData.appLicenseEnabled.toString());
    data.append('appLicenseAmount', formData.appLicenseAmount.toString());
    data.append('appLicenseType', formData.appLicenseType);
    data.append('appLicenseHasInstallments', formData.appLicenseHasInstallments.toString());
    data.append('appLicenseInstallmentCount', formData.appLicenseInstallmentCount.toString());
    data.append('subscriptionEnabled', formData.subscriptionEnabled.toString());
    data.append('subscriptionAmount', formData.subscriptionAmount.toString());
    data.append('subscriptionCycle', formData.subscriptionCycle);
    
    // Progressive pricing
    data.append('subscriptionHasProgressivePricing', formData.subscriptionHasProgressivePricing.toString());
    data.append('subscriptionGracePeriodMonths', formData.subscriptionGracePeriodMonths.toString());
    data.append('subscriptionPriceAfterGrace', formData.subscriptionPriceAfterGrace.toString());
    
    data.append('trialEnabled', formData.trialEnabled.toString());
    data.append('trialDays', formData.trialDays.toString());
    data.append('features', JSON.stringify(formData.features));
    data.append('limits', JSON.stringify(formData.limits));

    try {
      const result = await createClient(data);
      if (result.success) {
        toast.success("✅ " + result.message);
        setOpen(false);
        router.refresh();
      } else {
        toast.error("❌ " + result.error);
      }
    } catch (err) {
      toast.error("Erreur inattendue.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTotalFirstYear = () => {
    let total = 0;
    
    // App License
    if (formData.appLicenseEnabled) {
      total += formData.appLicenseAmount;
    }
    
    // Subscription (first year only if no grace period)
    if (formData.subscriptionEnabled && !formData.subscriptionHasProgressivePricing) {
      if (formData.subscriptionCycle === 'yearly') {
        total += formData.subscriptionAmount;
      } else {
        total += formData.subscriptionAmount * 12;
      }
    }
    
    return total;
  };

  const getTotalRecurring = () => {
    let total = 0;
    
    // App License (only if annual)
    if (formData.appLicenseEnabled && formData.appLicenseType === 'annual') {
      total += formData.appLicenseAmount;
    }
    
    // Subscription (after grace period if progressive)
    if (formData.subscriptionEnabled) {
      if (formData.subscriptionHasProgressivePricing) {
        // Use the price after grace period
        if (formData.subscriptionCycle === 'yearly') {
          total += formData.subscriptionPriceAfterGrace;
        } else {
          total += formData.subscriptionPriceAfterGrace * 12;
        }
      } else {
        if (formData.subscriptionCycle === 'yearly') {
          total += formData.subscriptionAmount;
        } else {
          total += formData.subscriptionAmount * 12;
        }
      }
    }
    
    return total;
  };

  const getTrialEndDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + formData.trialDays);
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
          <UserPlus className="mr-2 h-4 w-4" />
          Nouveau Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Créer une Offre Personnalisée</DialogTitle>
          <DialogDescription>
            Flexibilité totale - Pricing progressif et composants indépendants
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Informations du client</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nom du magasin *</Label>
                <Input
                  id="name"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Optique Vision"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="client@opticien.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+212 6..."
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 caractères"
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Dual-Component Pricing System */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Structure de pricing
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Activez et configurez les composants selon votre négociation
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* App License Card */}
              <Card className={cn(
                "border-2 transition-all",
                formData.appLicenseEnabled 
                  ? "border-blue-300 bg-blue-50/30 shadow-sm" 
                  : "border-slate-200 bg-slate-50/30 opacity-60"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      License Application
                    </CardTitle>
                    <Switch
                      checked={formData.appLicenseEnabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, appLicenseEnabled: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="appLicense" className="text-xs">Montant (MAD)</Label>
                    <Input
                      id="appLicense"
                      type="number"
                      value={formData.appLicenseAmount}
                      onChange={(e) => setFormData({ ...formData, appLicenseAmount: parseInt(e.target.value) || 0 })}
                      min={0}
                      disabled={!formData.appLicenseEnabled}
                      className="text-lg font-semibold"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Type de license</Label>
                    <Select
                      value={formData.appLicenseType}
                      onValueChange={(v: 'one-time' | 'annual') => setFormData({ ...formData, appLicenseType: v })}
                      disabled={!formData.appLicenseEnabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-time">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              One-Time
                            </Badge>
                            <span className="text-xs">Paiement unique</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="annual">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              Annuel
                            </Badge>
                            <span className="text-xs">Se renouvelle chaque année</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 🆕 Installment Payment Option */}
                  {formData.appLicenseEnabled && formData.appLicenseType === 'one-time' && (
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-blue-600" />
                          <Label className="text-xs font-semibold">Paiement Échelonné</Label>
                        </div>
                        <Switch
                          checked={formData.appLicenseHasInstallments}
                          onCheckedChange={(checked) => setFormData({ ...formData, appLicenseHasInstallments: checked })}
                        />
                      </div>

                      {formData.appLicenseHasInstallments && (
                        <div className="bg-blue-50 rounded-lg p-3 space-y-3 border border-blue-200">
                          <div className="space-y-2">
                            <Label className="text-xs">Nombre de versements</Label>
                            <Select
                              value={formData.appLicenseInstallmentCount.toString()}
                              onValueChange={(v) => setFormData({ ...formData, appLicenseInstallmentCount: parseInt(v) })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2">2 fois</SelectItem>
                                <SelectItem value="3">3 fois</SelectItem>
                                <SelectItem value="4">4 fois</SelectItem>
                                <SelectItem value="6">6 fois</SelectItem>
                                <SelectItem value="12">12 fois</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="bg-white rounded p-2 text-xs text-blue-800 border border-blue-300">
                            <strong>Plan de paiement:</strong>
                            <br />
                            {Math.ceil(formData.appLicenseAmount / formData.appLicenseInstallmentCount)} MAD × {formData.appLicenseInstallmentCount} versements
                            <br />
                            <span className="text-blue-600">
                              Total: {formData.appLicenseAmount} MAD sur {formData.appLicenseInstallmentCount} mois
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {formData.appLicenseEnabled && !formData.appLicenseHasInstallments && (
                    <div className="bg-white rounded p-2 text-xs text-slate-600 border border-slate-200">
                      {formData.appLicenseType === 'one-time' ? (
                        <p>✓ Paiement unique de <strong>{formData.appLicenseAmount} MAD</strong></p>
                      ) : (
                        <p>✓ <strong>{formData.appLicenseAmount} MAD/an</strong> (renouvellement annuel)</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subscription Card */}
              <Card className={cn(
                "border-2 transition-all",
                formData.subscriptionEnabled 
                  ? "border-green-300 bg-green-50/30 shadow-sm" 
                  : "border-slate-200 bg-slate-50/30 opacity-60"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-green-600" />
                      Abonnement Récurrent
                    </CardTitle>
                    <Switch
                      checked={formData.subscriptionEnabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, subscriptionEnabled: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="subscription" className="text-xs">Montant Initial (MAD)</Label>
                    <Input
                      id="subscription"
                      type="number"
                      value={formData.subscriptionAmount}
                      onChange={(e) => setFormData({ ...formData, subscriptionAmount: parseInt(e.target.value) || 0 })}
                      min={0}
                      disabled={!formData.subscriptionEnabled}
                      className="text-lg font-semibold"
                      placeholder="0 pour gratuit"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Cycle de facturation</Label>
                    <Select
                      value={formData.subscriptionCycle}
                      onValueChange={(v: 'monthly' | 'yearly') => setFormData({ ...formData, subscriptionCycle: v })}
                      disabled={!formData.subscriptionEnabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Mensuel
                            </Badge>
                            <span className="text-xs">Facture chaque mois</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="yearly">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              Annuel
                            </Badge>
                            <span className="text-xs">Facture chaque année</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 🆕 Progressive Pricing Toggle */}
                  {formData.subscriptionEnabled && (
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-purple-600" />
                          <Label className="text-xs font-semibold">Pricing Progressif</Label>
                        </div>
                        <Switch
                          checked={formData.subscriptionHasProgressivePricing}
                          onCheckedChange={(checked) => setFormData({ ...formData, subscriptionHasProgressivePricing: checked })}
                        />
                      </div>

                      {formData.subscriptionHasProgressivePricing && (
                        <div className="bg-purple-50 rounded-lg p-3 space-y-3 border border-purple-200">
                          <div className="space-y-2">
                            <Label className="text-xs">Période de grâce (mois)</Label>
                            <Input
                              type="number"
                              value={formData.subscriptionGracePeriodMonths}
                              onChange={(e) => setFormData({ ...formData, subscriptionGracePeriodMonths: parseInt(e.target.value) || 1 })}
                              min={1}
                              max={36}
                              className="h-8 text-sm"
                            />
                            <p className="text-xs text-purple-700">
                              Durée avant que le prix change
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Prix après période de grâce (MAD)</Label>
                            <Input
                              type="number"
                              value={formData.subscriptionPriceAfterGrace}
                              onChange={(e) => setFormData({ ...formData, subscriptionPriceAfterGrace: parseInt(e.target.value) || 0 })}
                              min={0}
                              className="h-8 text-sm font-semibold"
                            />
                          </div>

                          <div className="bg-white rounded p-2 text-xs text-purple-800 border border-purple-300">
                            <strong>Exemple:</strong>
                            <br />
                            • Premiers {formData.subscriptionGracePeriodMonths} mois: {formData.subscriptionAmount} MAD
                            <br />
                            • Après: {formData.subscriptionPriceAfterGrace} MAD{formData.subscriptionCycle === 'monthly' ? '/mois' : '/an'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {formData.subscriptionEnabled && !formData.subscriptionHasProgressivePricing && (
                    <div className="bg-white rounded p-2 text-xs text-slate-600 border border-slate-200">
                      {formData.subscriptionCycle === 'monthly' ? (
                        <p>✓ <strong>{formData.subscriptionAmount} MAD/mois</strong> ({formData.subscriptionAmount * 12} MAD/an)</p>
                      ) : (
                        <p>✓ <strong>{formData.subscriptionAmount} MAD/an</strong> (facturé annuellement)</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Trial Period */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="trial">Période d'essai gratuite</Label>
                <p className="text-xs text-slate-600">Offrir un essai avant facturation</p>
              </div>
              <Switch
                id="trial"
                checked={formData.trialEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, trialEnabled: checked })}
              />
            </div>
            {formData.trialEnabled && (
              <div className="ml-6 space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Label>Durée de l'essai (jours)</Label>
                <Input
                  type="number"
                  value={formData.trialDays}
                  onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) || 14 })}
                  min={1}
                  max={90}
                  className="w-32"
                />
                <p className="text-xs text-blue-700">
                  🎁 L'essai se termine le: <strong>{getTrialEndDate()}</strong>
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Features - Independent */}
          <div className="space-y-3">
            <div>
              <Label>Fonctionnalités activées</Label>
              <p className="text-xs text-slate-600">Totalement indépendant du pricing</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((feature) => (
                <div key={feature.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={feature.id}
                    checked={formData.features.includes(feature.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          features: [...formData.features, feature.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          features: formData.features.filter(f => f !== feature.id)
                        });
                      }
                    }}
                  />
                  <Label htmlFor={feature.id} className="cursor-pointer text-sm font-normal">
                    {feature.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Limits */}
          <div className="space-y-3">
            <Label>Limites d'utilisation</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="maxUsers" className="text-xs">Max Utilisateurs</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={formData.limits.maxUsers}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: { ...formData.limits, maxUsers: parseInt(e.target.value) || 1 }
                  })}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStorage" className="text-xs">Stockage (GB)</Label>
                <Input
                  id="maxStorage"
                  type="number"
                  value={formData.limits.maxStorageGB}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: { ...formData.limits, maxStorageGB: parseInt(e.target.value) || 1 }
                  })}
                  min={1}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-lg space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              📊 Récapitulatif Financier
            </h4>
            
            {/* Components Breakdown */}
            <div className="space-y-2 text-sm">
              {formData.appLicenseEnabled && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center bg-white/10 p-2 rounded">
                    <span className="text-slate-200">
                      License Application ({formData.appLicenseType === 'one-time' ? 'One-Time' : 'Annuel'}):
                    </span>
                    <span className="font-bold">{formData.appLicenseAmount} MAD</span>
                  </div>
                  {formData.appLicenseHasInstallments && formData.appLicenseType === 'one-time' && (
                    <div className="flex justify-between items-center bg-blue-500/20 px-2 py-1 rounded text-xs border border-blue-400/30">
                      <span className="text-blue-200">Paiement échelonné:</span>
                      <span className="text-blue-100 font-semibold">
                        {Math.ceil(formData.appLicenseAmount / formData.appLicenseInstallmentCount)} MAD × {formData.appLicenseInstallmentCount} mois
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {formData.subscriptionEnabled && (
                <>
                  <div className="flex justify-between items-center bg-white/10 p-2 rounded">
                    <span className="text-slate-200">
                      Abonnement Initial ({formData.subscriptionCycle === 'monthly' ? 'Mensuel' : 'Annuel'}):
                    </span>
                    <span className="font-bold">
                      {formData.subscriptionAmount} MAD{formData.subscriptionCycle === 'monthly' ? '/mo' : '/an'}
                    </span>
                  </div>
                  
                  {formData.subscriptionHasProgressivePricing && (
                    <div className="flex justify-between items-center bg-purple-500/20 p-2 rounded border border-purple-400/30">
                      <span className="text-purple-200">
                        Après {formData.subscriptionGracePeriodMonths} mois:
                      </span>
                      <span className="font-bold text-purple-100">
                        {formData.subscriptionPriceAfterGrace} MAD{formData.subscriptionCycle === 'monthly' ? '/mo' : '/an'}
                      </span>
                    </div>
                  )}
                </>
              )}
              
              {!formData.appLicenseEnabled && !formData.subscriptionEnabled && (
                <div className="text-center text-slate-400 py-4">
                  Aucun composant de pricing activé
                </div>
              )}
            </div>

            <Separator className="bg-white/20" />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Total Première Année:</span>
                <span className="text-2xl font-bold text-green-400">{getTotalFirstYear()} MAD</span>
              </div>
              
              {(formData.appLicenseType === 'annual' || formData.subscriptionEnabled) && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">Renouvellement Annuel:</span>
                  <span className="font-semibold text-blue-300">{getTotalRecurring()} MAD/an</span>
                </div>
              )}
              
              {formData.appLicenseType === 'one-time' && !formData.subscriptionEnabled && (
                <div className="text-center text-sm text-green-400">
                  ✨ Deal Lifetime - Aucun renouvellement
                </div>
              )}
            </div>

            {formData.trialEnabled && (
              <div className="bg-blue-500/20 border border-blue-400/30 text-blue-200 px-3 py-2 rounded text-xs mt-2">
                🎁 Essai gratuit de {formData.trialDays} jours inclus
              </div>
            )}
            
            <div className="pt-2 text-xs text-slate-400 border-t border-white/10">
              • {formData.features.length} fonctionnalités activées
              <br />
              • Limites: {formData.limits.maxUsers} users, {formData.limits.maxStorageGB}GB storage
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer l'offre
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
