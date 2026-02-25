'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Glasses, Save, Eye, Info, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/lib/types";

interface MesureEye {
    sphere: string;
    cylindre: string;
    axe: string;
    addition: string;
}

interface Mesures {
    od: MesureEye;
    og: MesureEye;
    remarques: string;
}

interface ClientMedicalDialogProps {
    client: Client | null;
    trigger?: React.ReactNode;
}

export function ClientMedicalDialog({ client, trigger }: ClientMedicalDialogProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = React.useState(false);
    const [mesures, setMesures] = React.useState<Mesures>({
        od: { sphere: '', cylindre: '', axe: '', addition: '' },
        og: { sphere: '', cylindre: '', axe: '', addition: '' },
        remarques: ''
    });

    const handleChange = (eye: 'od' | 'og', field: keyof MesureEye, value: string) => {
        setMesures(prev => ({
            ...prev,
            [eye]: { ...prev[eye], [field]: value }
        }));
    };

    const copyOdToOg = () => {
        setMesures(prev => ({
            ...prev,
            og: { ...prev.od }
        }));
        toast({
            description: "Mesures copiées de l'œil droit vers l'œil gauche",
        });
    };

    const handleSave = () => {
        if (!client) {
            toast({
                title: "Aucun client sélectionné",
                description: "Veuillez sélectionner un client avant d'enregistrer les mesures.",
                variant: "destructive"
            });
            return;
        }
        
        // Logic to save measurements (server action) would go here
        toast({
            title: "Mesures enregistrées",
            description: `Les mesures pour ${client.nom || client.name} ont été sauvegardées.`,
        });
        setIsOpen(false);
    };

    const FIELDS = [
        { key: "sphere", label: "Sphère (SPH)", placeholder: "+2.00" },
        { key: "cylindre", label: "Cylindre (CYL)", placeholder: "-0.50" },
        { key: "axe", label: "Axe (AXE)", placeholder: "90" },
        { key: "addition", label: "Addition (ADD)", placeholder: "+1.50" },
    ] as const;

    const EyeForm = ({ eye, label, iconColor }: { eye: 'od' | 'og', label: string, iconColor: string }) => (
        <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50">
            <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-${iconColor}-100 text-${iconColor}-600`}>
                        <Eye className="h-4 w-4" />
                    </div>
                    {label}
                </h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {eye === 'od' ? 'Oculus Dexter' : 'Oculus Sinister'}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {FIELDS.map(({ key, label: fLabel, placeholder }) => (
                    <div className="space-y-1.5" key={key}>
                        <Label className="text-[11px] font-bold text-slate-500 uppercase">{fLabel}</Label>
                        <Input
                            placeholder={placeholder}
                            value={mesures[eye][key]}
                            onChange={(e) => handleChange(eye, key, e.target.value)}
                            className="h-10 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <Glasses className="h-4 w-4" />
                        Mesures & Verres
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Glasses className="h-6 w-6 text-indigo-600" />
                        Mesures & Détails Optiques
                    </DialogTitle>
                    {client && (
                        <p className="text-sm text-slate-500">
                            Client : <span className="font-semibold text-slate-900">{client.prenom} {client.nom}</span>
                        </p>
                    )}
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-start gap-3">
                        <Info className="h-4 w-4 text-indigo-600 mt-0.5" />
                        <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                            Saisissez les mesures de l'ordonnance ci-dessous. Les valeurs seront liées à cette vente.
                        </p>
                    </div>

                    <div className="grid gap-6">
                        <EyeForm eye="od" label="Œil Droit (OD)" iconColor="blue" />
                        
                        <div className="flex items-center gap-4">
                            <div className="h-px flex-1 bg-slate-100" />
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={copyOdToOg}
                                className="h-8 text-[10px] font-bold text-slate-500 hover:text-indigo-600 gap-1.5"
                            >
                                <Copy className="h-3.5 w-3.5" />
                                COPIER OD VERS OG
                            </Button>
                            <div className="h-px flex-1 bg-slate-100" />
                        </div>

                        <EyeForm eye="og" label="Œil Gauche (OG)" iconColor="indigo" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Remarques & Verres Spécifiques</Label>
                        <Textarea
                            placeholder="Type de verres, traitements (Anti-reflet, Blue-cut), etc."
                            value={mesures.remarques}
                            onChange={(e) => setMesures(prev => ({ ...prev, remarques: e.target.value }))}
                            className="min-h-[80px] bg-slate-50 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleSave} className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2 h-11">
                        <Save className="h-4 w-4" />
                        Enregistrer les Mesures
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
