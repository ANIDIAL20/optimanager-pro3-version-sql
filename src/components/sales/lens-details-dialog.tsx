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
import { Glasses, Save } from "lucide-react";

interface LensDetails {
    eye: 'OD' | 'OG';
    sphere?: string;
    cylinder?: string;
    axis?: string;
    addition?: string;
    treatment?: string;
}

interface LensDetailsDialogProps {
    productName: string;
    initialDetails?: LensDetails[];
    onSave: (details: LensDetails[]) => void;
}

export function LensDetailsDialog({ productName, initialDetails, onSave }: LensDetailsDialogProps) {
    const [details, setDetails] = React.useState<LensDetails[]>(initialDetails || [
        { eye: 'OD', sphere: '0.00', cylinder: '0.00', axis: '0', addition: '0.00', treatment: 'N/A' },
        { eye: 'OG', sphere: '0.00', cylinder: '0.00', axis: '0', addition: '0.00', treatment: 'N/A' }
    ]);
    const [isOpen, setIsOpen] = React.useState(false);

    const updateDetail = (index: number, field: keyof LensDetails, value: string) => {
        const newDetails = [...details];
        newDetails[index] = { ...newDetails[index], [field]: value };
        setDetails(newDetails);
    };

    const handleSave = () => {
        onSave(details);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1 px-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                    <Glasses className="h-3 w-3" />
                    Détails
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Glasses className="h-5 w-5 text-indigo-600" />
                        Détails Optiques
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">{productName}</p>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {details.map((detail, idx) => (
                        <div key={detail.eye} className="space-y-3 p-3 border rounded-lg bg-slate-50/50">
                            <h4 className="font-bold text-sm flex items-center gap-2">
                                <span className="h-5 w-5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">{detail.eye}</span>
                                Œil {detail.eye === 'OD' ? 'Droit' : 'Gauche'}
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px]">Sphère</Label>
                                    <Input 
                                        size={1} 
                                        className="h-8 text-xs" 
                                        value={detail.sphere} 
                                        onChange={(e) => updateDetail(idx, 'sphere', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px]">Cylindre</Label>
                                    <Input 
                                        size={1} 
                                        className="h-8 text-xs" 
                                        value={detail.cylinder} 
                                        onChange={(e) => updateDetail(idx, 'cylinder', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px]">Axe</Label>
                                    <Input 
                                        size={1} 
                                        className="h-8 text-xs" 
                                        value={detail.axis} 
                                        onChange={(e) => updateDetail(idx, 'axis', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px]">Addition</Label>
                                    <Input 
                                        className="h-8 text-xs" 
                                        value={detail.addition} 
                                        onChange={(e) => updateDetail(idx, 'addition', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px]">Traitement</Label>
                                    <Input 
                                        className="h-8 text-xs" 
                                        value={detail.treatment} 
                                        onChange={(e) => updateDetail(idx, 'treatment', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} className="w-full gap-2">
                        <Save className="h-4 w-4" />
                        Enregistrer les Détails
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
