// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { updateClientQuotas } from "@/app/actions/adminActions";
import { toast } from "sonner";
import { ClientData } from "@/app/actions/adminActions";
import { Calendar as CalendarIcon, Box, Users, Truck, Clock, CreditCard, ShieldAlert, FileText, CheckCircle2, RotateCw } from "lucide-react";
import { BrandLoader } from "@/components/ui/loader-brand";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch"; 
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PlanManagementModalProps {
  client: ClientData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PlanManagementModal({ client, isOpen, onClose, onUpdate }: PlanManagementModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // State
  const [status, setStatus] = useState<'active' | 'suspended'>('active');
  
  // Finance & Contract
  const [paymentMode, setPaymentMode] = useState<'subscription' | 'lifetime'>('subscription');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  
  const [agreedPrice, setAgreedPrice] = useState(0);
  const [trainingPrice, setTrainingPrice] = useState(0);
  const [setupPrice, setSetupPrice] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [installmentsCount, setInstallmentsCount] = useState(1);
  
  // Dates
  const [lastPaymentDate, setLastPaymentDate] = useState<Date | undefined>(undefined);
  const [nextPaymentDate, setNextPaymentDate] = useState<Date | undefined>(undefined);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined); // Hard stop
  
  // Quotas with "Unlimited" logic
  const [maxProducts, setMaxProducts] = useState(50);
  const [unlimitedProducts, setUnlimitedProducts] = useState(false);

  const [maxClients, setMaxClients] = useState(20);
  const [unlimitedClients, setUnlimitedClients] = useState(false);

  const [maxSuppliers, setMaxSuppliers] = useState(10);
  const [unlimitedSuppliers, setUnlimitedSuppliers] = useState(false);

  useEffect(() => {
    if (client) {
      setStatus(client.status === 'active' ? 'active' : 'suspended');
      
      // Init Finance
      setPaymentMode(client.paymentMode || 'subscription');
      setBillingCycle(client.billingCycle || 'monthly');
      setAgreedPrice(Number(client.agreedPrice) || 0);
      setTrainingPrice(Number(client.trainingPrice) || 0); // Init new state
      setSetupPrice(Number(client.setupPrice) || 0); // Init new state
      setAmountPaid(Number(client.amountPaid) || 0);
      setInstallmentsCount(client.installmentsCount || 1);

      // Init Dates
      const safeDate = (d: any) => {
        if (!d) return undefined;
        const date = new Date(d);
        return isNaN(date.getTime()) ? undefined : date;
      };

      setLastPaymentDate(safeDate(client.lastPaymentDate));
      setNextPaymentDate(safeDate(client.nextPaymentDate));
      setExpiryDate(safeDate(client.subscriptionExpiry));

      // Init quotas
      const p = client.quotas?.maxProducts || 50;
      setMaxProducts(p);
      setUnlimitedProducts(p >= 10000);

      const c = client.quotas?.maxClients || 20;
      setMaxClients(c);
      setUnlimitedClients(c >= 10000);

      const s = client.quotas?.maxSuppliers || 10;
      setMaxSuppliers(s);
      setUnlimitedSuppliers(s >= 10000);
    }
  }, [client]);

  const handleSave = async () => {
    if (!client) return;
    setIsLoading(true);

    try {
      const result = await updateClientQuotas(client.uid, {
        maxProducts: unlimitedProducts ? 1000000 : maxProducts,
        maxClients: unlimitedClients ? 1000000 : maxClients,
        maxSuppliers: unlimitedSuppliers ? 1000000 : maxSuppliers,
        status: status,
        
        lastPaymentDate,
        nextPaymentDate: paymentMode === 'lifetime' ? undefined : nextPaymentDate, // Keep existing logic for nextPaymentDate
        expiryDate,
        
        paymentMode,
        billingCycle,
        agreedPrice,
        trainingPrice, // Add new state
        setupPrice, // Add new state
        amountPaid,
        installmentsCount
      });

      if (result.success) {
        toast.success("Client mis à jour avec succès"); // Updated toast message
        onUpdate();
        onClose();
      } else {
        toast.error("Erreur: " + result.error);
      }
    } catch (error) {
      toast.error("Erreur inattendue");
    } finally {
      setIsLoading(false);
    }
  };

  if (!client) return null;
  
  const remainingBalance = Math.max(0, agreedPrice - amountPaid);
  const progressPercent = agreedPrice > 0 ? (amountPaid / agreedPrice) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
      <DialogContent className="sm:max-w-4xl bg-white/95 backdrop-blur-xl border-slate-200 shadow-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
             <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {client.displayName?.charAt(0).toUpperCase()}
             </div>
             Gérer le compte : <span className="text-blue-600">{client.displayName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-6">
          
          {/* COL 1: IDENTITY & STATUS */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                <ShieldAlert size={16} className="text-slate-500" />
                Statut & Accès
            </h3>
            
            <div className="space-y-4 bg-slate-50 p-4 rounded-lg border">
                <div>
                    <Label className="mb-2 block text-xs font-medium text-slate-500 uppercase">État du compte</Label>
                    <div className="flex items-center justify-between">
                        <Badge variant={status === 'active' ? 'default' : 'destructive'} className={status === 'active' ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                            {status === 'active' ? "Actif & Accessible" : "Suspendu / Bloqué"}
                        </Badge>
                        <Switch
                            checked={status === 'active'}
                            onCheckedChange={(c) => setStatus(c ? 'active' : 'suspended')}
                        />
                    </div>
                </div>

                <div className="text-xs text-muted-foreground pt-2 border-t mt-4">
                    <p>UID: <span className="font-mono text-slate-900">{client.uid.substring(0, 8)}...</span></p>
                    <p>Email: <span className="font-medium text-slate-900">{client.email}</span></p>
                    {client.createdAt && !isNaN(new Date(client.createdAt).getTime()) && (
                        <p className="mt-2 text-[10px] uppercase text-slate-400">Contrat créé le {format(new Date(client.createdAt), "dd MMM yyyy", {locale:fr})}</p>
                    )}
                </div>
            </div>
            
             {/* Quotas Compact */}
             <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                    <Box size={16} className="text-slate-500" />
                    Quotas
                </h3>
                <div className="space-y-3">
                    <QuotaInput label="Produits" icon={<Box size={14} />} color="blue" value={maxProducts} unlimited={unlimitedProducts} onChange={setMaxProducts} onToggle={setUnlimitedProducts} />
                    <QuotaInput label="Clients" icon={<Users size={14} />} color="emerald" value={maxClients} unlimited={unlimitedClients} onChange={setMaxClients} onToggle={setUnlimitedClients} />
                    <QuotaInput label="Fourn." icon={<Truck size={14} />} color="amber" value={maxSuppliers} unlimited={unlimitedSuppliers} onChange={setMaxSuppliers} onToggle={setUnlimitedSuppliers} />
                </div>
             </div>
          </div>

          {/* COL 2 & 3: FINANCE & CONTRACT (Spans 2 cols) */}
          <div className="md:col-span-2 space-y-6">
             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                <CreditCard size={16} className="text-slate-500" />
                Finance & Contrat
            </h3>
            
            {/* Contract Type Toggle */}
            <div className="bg-slate-50 p-1 rounded-lg border inline-flex">
                <button 
                    onClick={() => setPaymentMode('subscription')}
                    className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all", paymentMode === 'subscription' ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700")}
                >
                    Abonnement (SaaS)
                </button>
                <button 
                    onClick={() => setPaymentMode('lifetime')}
                    className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all", paymentMode === 'lifetime' ? "bg-white shadow text-purple-600" : "text-slate-500 hover:text-slate-700")}
                >
                    Licence à Vie (Desktop)
                </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* PART A: PRICING & TERMS */}
                <div className="space-y-4">
                    {paymentMode === 'subscription' ? (
                        <>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase text-slate-500">Cycle de Facturation</Label>
                                <div className="flex gap-2">
                                     <Badge 
                                        variant={billingCycle === 'monthly' ? "default" : "outline"} 
                                        className="cursor-pointer"
                                        onClick={() => setBillingCycle('monthly')}
                                     >
                                        Mensuel
                                     </Badge>
                                     <Badge 
                                        variant={billingCycle === 'yearly' ? "default" : "outline"} 
                                        className="cursor-pointer"
                                        onClick={() => setBillingCycle('yearly')}
                                     >
                                        Annuel
                                     </Badge>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Prix Convenu (MAD / {billingCycle === 'monthly' ? 'Mois' : 'An'})</Label>
                                <Input type="number" value={agreedPrice} onChange={(e) => setAgreedPrice(parseFloat(e.target.value) || 0)} className="font-bold" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label className="text-purple-700 font-bold">Prix Total de la Licence (MAD)</Label>
                                <Input type="number" value={agreedPrice} onChange={(e) => setAgreedPrice(parseFloat(e.target.value) || 0)} className="font-bold border-purple-200" />
                            </div>
                            
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 space-y-3">
                                <div className="flex justify-between text-xs text-purple-800 font-semibold uppercase">
                                    <span>État du Paiement</span>
                                    <span>{progressPercent.toFixed(0)}%</span>
                                </div>
                                <Progress value={progressPercent} className="h-2" />
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Déjà Payé</Label>
                                        <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)} className="h-8 bg-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Reste à Payer</Label>
                                        <div className="h-8 flex items-center px-3 border rounded text-sm font-bold text-slate-700 bg-slate-100">
                                            {remainingBalance}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-purple-200">
                                    <Label className="text-[10px]">Nombre d'échéances prévues</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <RotateCw size={14} className="text-purple-500"/>
                                        <Input type="number" value={installmentsCount} onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 1)} className="h-7 w-20 bg-white" />
                                        <span className="text-xs text-muted-foreground">fois</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* PART B: DATES & LOCKING */}
                <div className="space-y-4 border-l pl-6 border-dashed">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <Clock size={14} className="text-green-600"/> 
                            {paymentMode === 'subscription' ? "Début de Période (Dernier Paiement)" : "Date d'Achat / 1er Paiement"}
                        </Label>
                        <DatePicker date={lastPaymentDate} setDate={setLastPaymentDate} placeholder="Sélectionner date" />
                    </div>

                    {remainingBalance > 0 && paymentMode === 'lifetime' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs font-semibold text-amber-600">
                                <Clock size={14} className="text-amber-600"/> 
                                Prochaine Échéance de Paiement
                            </Label>
                            <DatePicker date={nextPaymentDate} setDate={setNextPaymentDate} placeholder="Date du prochain versement" />
                        </div>
                    )}
                    
                    {paymentMode === 'subscription' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs font-semibold text-amber-600">
                                <Clock size={14} className="text-amber-600"/> 
                                Prochaine Facturation
                            </Label>
                            <DatePicker date={nextPaymentDate} setDate={setNextPaymentDate} placeholder="Date de renouvellement" />
                        </div>
                    )}

                    <div className="space-y-2 pt-4 mt-4 border-t border-red-100">
                        <Label className="flex items-center gap-2 text-xs font-bold text-red-600">
                            <ShieldAlert size={14}/> 
                            ARRÊT DU SERVICE (Hard Stop)
                        </Label>
                        <DatePicker date={expiryDate} setDate={setExpiryDate} placeholder="Date de blocage absolu" className="border-red-200 focus:ring-red-500 bg-red-50/50" />
                        <p className="text-[10px] text-muted-foreground leading-tight">
                            Si cette date est atteinte, l'application se bloquera automatiquement (utile si non-paiement).
                        </p>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 w-32">
            {isLoading && <BrandLoader size="xs" className="mr-2 inline-flex" />}
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Helper Components ---

function DatePicker({ date, setDate, placeholder, className }: { date: Date | undefined, setDate: (d: Date | undefined) => void, placeholder: string, className?: string }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal h-9", !date && "text-muted-foreground", className)}>
                    {date ? format(date, "P", { locale: fr }) : <span>{placeholder}</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
            </PopoverContent>
        </Popover>
    );
}

function QuotaInput({ label, icon, color, value, unlimited, onChange, onToggle }: any) {
    const bgColors: any = { blue: "bg-blue-100 text-blue-600", emerald: "bg-emerald-100 text-emerald-600", amber: "bg-amber-100 text-amber-600" };
    return (
        <div className="flex items-center gap-3 border p-2 rounded-lg bg-slate-50/50">
            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", bgColors[color])}>
                {icon}
            </div>
            <div className="flex-1">
                <div className="flex justify-between mb-1">
                    <Label className="text-xs font-medium">{label}</Label>
                    {unlimited && <span className={cn("text-[10px] font-bold uppercase", `text-${color}-600`)}>Illimité</span>}
                </div>
                <div className="flex items-center gap-2">
                    <Input 
                        type="number" 
                        className="h-7 text-xs bg-white" 
                        disabled={unlimited}
                        value={value}
                        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                    />
                    <Switch checked={unlimited} onCheckedChange={onToggle} className="scale-75 origin-right" />
                </div>
            </div>
        </div>
    )
}
