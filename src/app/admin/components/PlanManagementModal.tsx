'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Loader2, Save, ShieldAlert, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateClientPlan, updateClientQuotas, getClientUsageStats, ClientData } from "@/app/actions/adminActions";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PlanManagementModalProps {
    client: ClientData;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PlanManagementModal({ client, open, onOpenChange }: PlanManagementModalProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);

    // Plan State
    const [date, setDate] = React.useState<Date | undefined>(
        client.subscriptionEndDate && client.subscriptionEndDate !== 'N/A'
            ? new Date(client.subscriptionEndDate)
            : new Date()
    );
    const [gracePeriod, setGracePeriod] = React.useState(client.gracePeriodDays || 3);
    const [status, setStatus] = React.useState<'active' | 'suspended' | 'frozen'>(client.status);

    // Quotas State
    const [quotas, setQuotas] = React.useState({
        maxProducts: client.quotas?.maxProducts || 500,
        maxTeamMembers: client.quotas?.maxTeamMembers || 2,
        maxStorage: client.quotas?.maxStorage || 1
    });

    // Usage Stats State
    const [usage, setUsage] = React.useState({ products: 0, teamMembers: 0, storageMB: 0 });

    // Fetch usage on open
    React.useEffect(() => {
        if (open) {
            getClientUsageStats(client.uid).then(stats => setUsage(stats));
        }
    }, [open, client.uid]);

    const handleSavePlan = async () => {
        if (!date) return;
        setIsLoading(true);
        try {
            const res = await updateClientPlan(client.uid, {
                expiryDate: date,
                gracePeriod,
                status
            });
            if (res.success) {
                toast({ title: "Succès", description: res.message });
                onOpenChange(false);
            } else {
                throw new Error(res.error);
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Erreur", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveQuotas = async () => {
        setIsLoading(true);
        try {
            const res = await updateClientQuotas(client.uid, quotas);
            if (res.success) {
                toast({ title: "Succès", description: res.message });
                onOpenChange(false);
            } else {
                throw new Error(res.error);
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Erreur", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Gestion Client: {client.displayName}</DialogTitle>
                    <DialogDescription>
                        Configuration avancée du compte et des limites.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="plan" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="plan">Abonnement & Accès</TabsTrigger>
                        <TabsTrigger value="quotas">Quotas & Limites</TabsTrigger>
                    </TabsList>

                    {/* --- PLAN TAB --- */}
                    <TabsContent value="plan" className="space-y-4 py-4">
                        <div className="grid gap-4">
                            {/* Status Selector */}
                            <div className="space-y-2">
                                <Label>Statut du Compte</Label>
                                <Select
                                    value={status}
                                    onValueChange={(v: any) => setStatus(v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">
                                            <div className="flex items-center text-emerald-600">
                                                <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                                                Actif (Accès complet)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="frozen">
                                            <div className="flex items-center text-blue-500">
                                                <span className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                                                Gelé (Lecture seule / Login bloqué)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="suspended">
                                            <div className="flex items-center text-red-600">
                                                <span className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                                                Suspendu (Accès refusé)
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Expiry Date */}
                            <div className="space-y-2 flex flex-col">
                                <Label>Date d'expiration</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            {date ? (
                                                format(date, "PPP", { locale: fr })
                                            ) : (
                                                <span>Choisir une date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Grace Period */}
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Label>Période de grâce (Jours)</Label>
                                    <span className="text-sm text-muted-foreground">{gracePeriod} jours</span>
                                </div>
                                <Slider
                                    value={[gracePeriod]}
                                    max={30}
                                    step={1}
                                    onValueChange={(v) => setGracePeriod(v[0])}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Jours supplémentaires autorisés après l'expiration avant blocage total.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSavePlan} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enregistrer les modifications
                            </Button>
                        </DialogFooter>
                    </TabsContent>

                    {/* --- QUOTAS TAB --- */}
                    <TabsContent value="quotas" className="space-y-6 py-4">
                        <div className="space-y-6">
                            {/* Products Quota */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label>Produits</Label>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-slate-900">{usage.products}</span>
                                        <span className="text-xs text-muted-foreground"> / {quotas.maxProducts} utilisés</span>
                                    </div>
                                </div>
                                <Progress value={(usage.products / quotas.maxProducts) * 100} className="h-2" />
                                <div className="pt-2">
                                    <label className="text-xs text-muted-foreground mb-2 block">Ajuster la limite : {quotas.maxProducts}</label>
                                    <Slider
                                        value={[quotas.maxProducts]}
                                        max={5000}
                                        step={100}
                                        onValueChange={(v) => setQuotas({ ...quotas, maxProducts: v[0] })}
                                    />
                                </div>
                            </div>

                            {/* Storage Quota */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label>Stockage (GB)</Label>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-slate-900">{Math.round(usage.storageMB / 1024 * 10) / 10} GB</span>
                                        <span className="text-xs text-muted-foreground"> / {quotas.maxStorage} GB utilisés (Est.)</span>
                                    </div>
                                </div>
                                <Progress value={(usage.storageMB / (quotas.maxStorage * 1024)) * 100} className="h-2" />
                                <div className="pt-2">
                                    <label className="text-xs text-muted-foreground mb-2 block">Ajuster la limite : {quotas.maxStorage} GB</label>
                                    <Slider
                                        value={[quotas.maxStorage]}
                                        max={50}
                                        step={1}
                                        onValueChange={(v) => setQuotas({ ...quotas, maxStorage: v[0] })}
                                    />
                                </div>
                            </div>

                            {/* Team Quota */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label>Membres d'équipe</Label>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-slate-900">{usage.teamMembers}</span>
                                        <span className="text-xs text-muted-foreground"> / {quotas.maxTeamMembers} actifs</span>
                                    </div>
                                </div>
                                <Progress value={(usage.teamMembers / quotas.maxTeamMembers) * 100} className="h-2" />
                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-xs text-muted-foreground">Limite actuelle : {quotas.maxTeamMembers}</span>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="outline" size="sm"
                                            onClick={() => setQuotas({ ...quotas, maxTeamMembers: Math.max(1, quotas.maxTeamMembers - 1) })}
                                        >-</Button>
                                        <span className="w-8 text-center">{quotas.maxTeamMembers}</span>
                                        <Button
                                            variant="outline" size="sm"
                                            onClick={() => setQuotas({ ...quotas, maxTeamMembers: quotas.maxTeamMembers + 1 })}
                                        >+</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveQuotas} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Mettre à jour les quotas
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
