"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/app/actions/adminActions";
import {
  UserPlus, Box, Users, Truck, CreditCard,
  RotateCw, Calendar, Check, ArrowRight, ArrowLeft,
  Building2, Mail, Lock, Phone, Shield, Sparkles, MapPin, Hash
} from "lucide-react";
import { BrandLoader } from '@/components/ui/loader-brand';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ============================================
// PASSWORD STRENGTH HELPER
// ============================================
function getPasswordStrength(password: string): { label: string; color: string; score: number } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Faible", color: "bg-red-500", score: 20 };
  if (score <= 3) return { label: "Moyen", color: "bg-amber-500", score: 60 };
  return { label: "Fort", color: "bg-emerald-500", score: 100 };
}

// ============================================
// STEP INDICATOR COMPONENT
// ============================================
const steps = [
  { id: 1, title: "Identité", icon: Building2 },
  { id: 2, title: "Plan & Finance", icon: CreditCard },
  { id: 3, title: "Quotas", icon: Box },
  { id: 4, title: "Confirmation", icon: Check },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-8 px-4">
      {steps.map((step, idx) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  isCompleted ? "bg-blue-600 border-blue-600 text-white" :
                  isActive ? "border-blue-600 text-blue-600 bg-blue-50" :
                  "border-slate-300 text-slate-400"
                )}
              >
                {isCompleted ? <Check size={18} /> : <Icon size={18} />}
              </div>
              <span className={cn(
                "text-[10px] mt-1 font-medium uppercase tracking-wide",
                isActive ? "text-blue-600" : "text-slate-400"
              )}>
                {step.title}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={cn(
                "w-12 h-0.5 mx-2 transition-all",
                isCompleted ? "bg-blue-600" : "bg-slate-200"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// MAIN WIZARD COMPONENT
// ============================================
export default function EnhancedCreateClientForm() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Identity
    displayName: '',
    email: '',
    password: '',
    phoneNumber: '',
    isActive: true,

    // Step 2: Plan & Finance
    paymentMode: 'subscription' as 'subscription' | 'lifetime',
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    trialPeriodDays: 0,
    licenseFee: 0, // Initial setup/license fee (one-time)
    subscriptionPrice: 0, // Recurring subscription price
    agreedPrice: 0, // Total for Lifetime mode
    amountPaid: 0,
    installmentsCount: 1,

    // Step 3: Quotas
    maxProducts: 50,
    maxClients: 20,
    maxSuppliers: 10,
    unlimitedProducts: false,
    unlimitedClients: false,
    unlimitedSuppliers: false,
  });

  // Calculations
  const remainingBalance = Math.max(0, formData.agreedPrice - formData.amountPaid);
  const progressPercent = formData.agreedPrice > 0 ? (formData.amountPaid / formData.agreedPrice) * 100 : 0;
  const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);

  // Validation
  const isStep1Valid = formData.displayName.trim().length >= 2 &&
                       formData.email.includes('@') &&
                       formData.password.length >= 6;

  const isStep2Valid = formData.agreedPrice >= 0;
  const isStep3Valid = true; // Quotas always have defaults

  const canProceed = () => {
    if (currentStep === 1) return isStep1Valid;
    if (currentStep === 2) return isStep2Valid;
    if (currentStep === 3) return isStep3Valid;
    return true;
  };

  // Navigation
  const goNext = () => {
    if (canProceed() && currentStep < 4) setCurrentStep(currentStep + 1);
    else if (!canProceed()) toast.warning("Veuillez remplir tous les champs obligatoires.");
  };
  const goBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  // Submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('displayName', formData.displayName);
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('phoneNumber', formData.phoneNumber);
      data.append('isActive', formData.isActive.toString());

      data.append('paymentMode', formData.paymentMode);
      data.append('billingCycle', formData.billingCycle);
      data.append('trialPeriodDays', formData.trialPeriodDays.toString());
      data.append('licenseFee', formData.licenseFee.toString());
      data.append('subscriptionPrice', formData.subscriptionPrice.toString());
      data.append('agreedPrice', formData.agreedPrice.toString());
      data.append('amountPaid', formData.amountPaid.toString());
      data.append('installmentsCount', formData.installmentsCount.toString());

      const maxProducts = formData.unlimitedProducts ? 1000000 : formData.maxProducts;
      const maxClients = formData.unlimitedClients ? 1000000 : formData.maxClients;
      const maxSuppliers = formData.unlimitedSuppliers ? 1000000 : formData.maxSuppliers;
      data.append('maxProducts', maxProducts.toString());
      data.append('maxClients', maxClients.toString());
      data.append('maxSuppliers', maxSuppliers.toString());

      const result = await createClient(data);

      if (result.success) {
        toast.success(`Client "${formData.displayName}" créé avec succès!`);
        setOpen(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error || "Erreur lors de la création.");
      }
    } catch (err) {
      toast.error("Erreur inattendue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      displayName: '', email: '', password: '', phoneNumber: '', isActive: true,
      paymentMode: 'subscription', billingCycle: 'monthly', trialPeriodDays: 0,
      licenseFee: 0, subscriptionPrice: 0, agreedPrice: 0, amountPaid: 0, installmentsCount: 1,
      maxProducts: 50, maxClients: 20, maxSuppliers: 10,
      unlimitedProducts: false, unlimitedClients: false, unlimitedSuppliers: false,
    });
    setCurrentStep(1);
  };

  // ========================================
  // RENDER STEPS
  // ========================================

  const renderStep1 = () => (
    <div className="space-y-4 animate-in fade-in-50 slide-in-from-right-4 duration-300">
      <div>
        <Label className="flex items-center gap-2"><Building2 size={14} className="text-blue-500"/> Nom du magasin *</Label>
        <Input
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          placeholder="Ex: Optique Vision"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="flex items-center gap-2"><Mail size={14} className="text-emerald-500"/> Email *</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="contact@opticien.ma"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="flex items-center gap-2"><Phone size={14} className="text-amber-500"/> Téléphone</Label>
        <Input
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          placeholder="06 00 00 00 00"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="flex items-center gap-2"><Lock size={14} className="text-red-500"/> Mot de passe *</Label>
        <Input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Minimum 6 caractères"
          className="mt-1"
        />
        {formData.password && (
          <div className="mt-2 flex items-center gap-2">
            <Progress value={passwordStrength.score} className={cn("h-1.5 flex-1", passwordStrength.color)} />
            <span className={cn("text-xs font-medium",
              passwordStrength.label === "Fort" ? "text-emerald-600" :
              passwordStrength.label === "Moyen" ? "text-amber-600" : "text-red-600"
            )}>
              {passwordStrength.label}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border rounded-md p-3 bg-slate-50">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-slate-500"/>
          <span className="text-sm font-medium">Statut du compte</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold", formData.isActive ? "text-emerald-600" : "text-red-500")}>
            {formData.isActive ? "Actif" : "Suspendu"}
          </span>
          <Switch checked={formData.isActive} onCheckedChange={(c) => setFormData({...formData, isActive: c})} />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4 animate-in fade-in-50 slide-in-from-right-4 duration-300">
      {/* Mode Toggle */}
      <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-medium">
        <button
          type="button"
          onClick={() => setFormData({...formData, paymentMode: 'subscription'})}
          className={cn("flex-1 py-2.5 rounded-md transition-all flex items-center justify-center gap-1.5",
            formData.paymentMode === 'subscription' ? "bg-white shadow text-blue-600" : "text-slate-500")}
        >
          <RotateCw size={14} /> Abonnement SaaS
        </button>
        <button
          type="button"
          onClick={() => setFormData({...formData, paymentMode: 'lifetime'})}
          className={cn("flex-1 py-2.5 rounded-md transition-all flex items-center justify-center gap-1.5",
            formData.paymentMode === 'lifetime' ? "bg-white shadow text-purple-600" : "text-slate-500")}
        >
          <Sparkles size={14} /> Licence à Vie
        </button>
      </div>

      {/* Trial Period */}
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 p-3 rounded-md">
        <Calendar size={16} className="text-amber-600" />
        <Label className="text-xs text-amber-700 whitespace-nowrap">Période d'essai (Jours)</Label>
        <Input
          type="number"
          value={formData.trialPeriodDays}
          onChange={(e) => setFormData({...formData, trialPeriodDays: parseInt(e.target.value) || 0})}
          className="h-8 w-20 text-center text-xs bg-white ml-auto"
          min={0} max={90}
        />
      </div>

      {formData.paymentMode === 'subscription' ? (
        <div className="space-y-4 p-4 border rounded-lg bg-blue-50/30">
          {/* License/Setup Fee (One-time) */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Label className="text-emerald-700 font-bold text-sm flex items-center gap-1.5">
              <Sparkles size={14}/> Frais de Licence (1ère fois)
            </Label>
            <Input
              type="number"
              value={formData.licenseFee}
              onChange={(e) => setFormData({...formData, licenseFee: parseFloat(e.target.value) || 0})}
              className="mt-2 font-bold text-lg border-emerald-300"
              placeholder="Ex: 2500"
            />
            <p className="text-[10px] text-emerald-600 mt-1">Montant initial payé une seule fois à la création du compte.</p>
          </div>

          {/* Subscription Settings */}
          <div className="border-t pt-4">
            <Label className="text-xs text-slate-500 uppercase">Cycle de facturation</Label>
            <div className="flex gap-2 mt-2">
              <Badge
                variant={formData.billingCycle === 'monthly' ? "default" : "outline"}
                className="cursor-pointer px-4 py-1.5"
                onClick={() => setFormData({...formData, billingCycle: 'monthly'})}
              >
                Mensuel
              </Badge>
              <Badge
                variant={formData.billingCycle === 'yearly' ? "default" : "outline"}
                className="cursor-pointer px-4 py-1.5"
                onClick={() => setFormData({...formData, billingCycle: 'yearly'})}
              >
                Annuel
              </Badge>
            </div>
          </div>

          {/* Recurring Subscription Price */}
          <div>
            <Label className="text-blue-700 font-bold">Prix Abonnement {formData.billingCycle === 'monthly' ? 'Mensuel' : 'Annuel'} (MAD)</Label>
            <Input
              type="number"
              value={formData.subscriptionPrice}
              onChange={(e) => setFormData({...formData, subscriptionPrice: parseFloat(e.target.value) || 0})}
              className="mt-1 font-bold text-lg"
              placeholder={formData.billingCycle === 'monthly' ? "Ex: 200/mois" : "Ex: 2000/an"}
            />
            <p className="text-[10px] text-blue-600 mt-1">Montant récurrent payé chaque {formData.billingCycle === 'monthly' ? 'mois' : 'année'}.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-4 border rounded-lg bg-purple-50/30">
          <div>
            <Label className="text-purple-700 font-bold">Prix Total Licence (MAD)</Label>
            <Input
              type="number"
              value={formData.agreedPrice}
              onChange={(e) => setFormData({...formData, agreedPrice: parseFloat(e.target.value) || 0})}
              className="mt-1 font-bold text-lg border-purple-200"
            />
          </div>

          <div className="p-3 bg-white rounded-lg border space-y-3">
            <div className="flex justify-between text-xs text-purple-800 font-semibold uppercase">
              <span>Avancement Paiement</span>
              <span>{progressPercent.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">Montant Payé</Label>
                <Input type="number" value={formData.amountPaid} onChange={(e) => setFormData({...formData, amountPaid: parseFloat(e.target.value) || 0})} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-[10px]">Reste à Payer</Label>
                <div className="h-8 flex items-center px-3 bg-slate-100 rounded text-sm font-bold text-red-600">{remainingBalance.toFixed(2)} MAD</div>
              </div>
            </div>

            <div className="pt-2 border-t flex items-center gap-2">
              <RotateCw size={14} className="text-purple-500"/>
              <Label className="text-[10px] whitespace-nowrap">Nombre d'échéances</Label>
              <Input type="number" value={formData.installmentsCount} onChange={(e) => setFormData({...formData, installmentsCount: parseInt(e.target.value) || 1})} className="h-8 w-16 text-center text-sm bg-white ml-auto" min={1} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-3 animate-in fade-in-50 slide-in-from-right-4 duration-300">
      {/* Products */}
      <div className="flex items-center gap-3 border p-3 rounded-lg bg-slate-50/50">
        <Box size={20} className="text-blue-500"/>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Produits</Label>
            {formData.unlimitedProducts && <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700">Illimité</Badge>}
          </div>
          <div className="flex gap-2 items-center mt-1">
            <Input type="number" className="h-8 text-sm bg-white" disabled={formData.unlimitedProducts} value={formData.maxProducts} onChange={(e) => setFormData({...formData, maxProducts: parseInt(e.target.value) || 0})} />
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500">∞</span>
              <Switch className="scale-75" checked={formData.unlimitedProducts} onCheckedChange={(c) => setFormData({...formData, unlimitedProducts: c})} />
            </div>
          </div>
        </div>
      </div>

      {/* Clients */}
      <div className="flex items-center gap-3 border p-3 rounded-lg bg-slate-50/50">
        <Users size={20} className="text-emerald-500"/>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Clients</Label>
            {formData.unlimitedClients && <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">Illimité</Badge>}
          </div>
          <div className="flex gap-2 items-center mt-1">
            <Input type="number" className="h-8 text-sm bg-white" disabled={formData.unlimitedClients} value={formData.maxClients} onChange={(e) => setFormData({...formData, maxClients: parseInt(e.target.value) || 0})} />
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500">∞</span>
              <Switch className="scale-75" checked={formData.unlimitedClients} onCheckedChange={(c) => setFormData({...formData, unlimitedClients: c})} />
            </div>
          </div>
        </div>
      </div>

      {/* Suppliers */}
      <div className="flex items-center gap-3 border p-3 rounded-lg bg-slate-50/50">
        <Truck size={20} className="text-amber-500"/>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Fournisseurs</Label>
            {formData.unlimitedSuppliers && <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">Illimité</Badge>}
          </div>
          <div className="flex gap-2 items-center mt-1">
            <Input type="number" className="h-8 text-sm bg-white" disabled={formData.unlimitedSuppliers} value={formData.maxSuppliers} onChange={(e) => setFormData({...formData, maxSuppliers: parseInt(e.target.value) || 0})} />
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500">∞</span>
              <Switch className="scale-75" checked={formData.unlimitedSuppliers} onCheckedChange={(c) => setFormData({...formData, unlimitedSuppliers: c})} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4 animate-in fade-in-50 slide-in-from-right-4 duration-300">
      <div className="text-center mb-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-2">
          <Check size={32} className="text-emerald-600" />
        </div>
        <h3 className="font-bold text-lg">Prêt à créer le compte</h3>
        <p className="text-sm text-slate-500">Vérifiez les informations avant de confirmer.</p>
      </div>

      <div className="border rounded-lg overflow-hidden divide-y">
        {/* Identity Summary */}
        <div className="p-3 bg-slate-50">
          <p className="text-xs text-slate-500 uppercase font-bold mb-1">Identité</p>
          <p className="font-medium">{formData.displayName || "—"}</p>
          <p className="text-sm text-slate-600">{formData.email || "—"}</p>
          {formData.phoneNumber && <p className="text-sm text-slate-500">{formData.phoneNumber}</p>}
        </div>

        {/* Plan Summary */}
        <div className="p-3">
          <p className="text-xs text-slate-500 uppercase font-bold mb-1">Plan & Finance</p>
          <div className="flex items-center gap-2 mb-2">
            <Badge className={formData.paymentMode === 'subscription' ? "bg-blue-600" : "bg-purple-600"}>
              {formData.paymentMode === 'subscription' ? `SaaS ${formData.billingCycle === 'monthly' ? 'Mensuel' : 'Annuel'}` : 'Licence à Vie'}
            </Badge>
          </div>

          {formData.paymentMode === 'subscription' ? (
            <div className="space-y-1 text-sm">
              {formData.licenseFee > 0 && (
                <p className="text-emerald-600"><strong>Licence initiale:</strong> {formData.licenseFee} MAD</p>
              )}
              <p className="text-blue-600"><strong>Abonnement {formData.billingCycle === 'monthly' ? 'mensuel' : 'annuel'}:</strong> {formData.subscriptionPrice} MAD</p>
            </div>
          ) : (
            <p className="font-bold text-lg">{formData.agreedPrice} MAD</p>
          )}

          {formData.trialPeriodDays > 0 && (
            <p className="text-xs text-amber-600 mt-1">+ {formData.trialPeriodDays} jours d'essai gratuit</p>
          )}
          {formData.paymentMode === 'lifetime' && remainingBalance > 0 && (
            <p className="text-xs text-red-600 mt-1">Reste à payer: {remainingBalance.toFixed(2)} MAD</p>
          )}
        </div>

        {/* Quotas Summary */}
        <div className="p-3 bg-slate-50">
          <p className="text-xs text-slate-500 uppercase font-bold mb-1">Quotas</p>
          <div className="flex gap-4 text-sm">
            <span><strong>{formData.unlimitedProducts ? '∞' : formData.maxProducts}</strong> Produits</span>
            <span><strong>{formData.unlimitedClients ? '∞' : formData.maxClients}</strong> Clients</span>
            <span><strong>{formData.unlimitedSuppliers ? '∞' : formData.maxSuppliers}</strong> Fournisseurs</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }} modal={false}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
          <UserPlus className="mr-2 h-4 w-4" />
          Nouvel Utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Créer un Compte Client</DialogTitle>
          <DialogDescription>Assistant de création en {steps.length} étapes.</DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={currentStep} />

        <div className="min-h-[300px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Navigation Footer */}
        <div className="flex justify-between items-center pt-4 border-t mt-4">
          {currentStep > 1 ? (
            <Button type="button" variant="outline" onClick={goBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          )}

          {currentStep < 4 ? (
            <Button type="button" onClick={goNext} disabled={!canProceed()} className="bg-blue-600 hover:bg-blue-700">
              Suivant <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting && <BrandLoader size="xs" className="mr-2 inline-flex" />}
              <Check className="mr-2 h-4 w-4" /> Confirmer la création
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
