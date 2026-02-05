"use client";

import { useState } from "react";
import { createClient } from "@/app/actions/adminActions";
import { UserPlus } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CreateClientForm({ onSuccess }: { onSuccess?: () => void }) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = typeof React !== 'undefined' && React.useTransition ? React.useTransition() : [false, (cb: any) => cb()];
    const [loading, setLoading] = useState(false);
    // Combined loading state
    const isSubmitting = loading || isPending;

    const router = useRouter();

    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        phoneNumber: '',
        plan: 'monthly'
    });

    const handleChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        data.append('displayName', formData.displayName);
        data.append('email', formData.email);
        data.append('password', formData.password);
        data.append('phoneNumber', formData.phoneNumber);
        data.append('plan', formData.plan);

        startTransition(async () => {
            try {
                const result = await createClient(data);

                if (result.success) {
                    toast.success("✅ " + result.message);
                    setFormData({ displayName: '', email: '', password: '', phoneNumber: '', plan: 'monthly' });
                    setOpen(false);
                    if (onSuccess) onSuccess();
                    router.refresh();
                } else {
                    toast.error("❌ Erreur: " + result.error);
                }
            } catch (err) {
                toast.error("Erreur inattendue.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Nouveau Client
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ajouter un Opticien</DialogTitle>
                    <DialogDescription>
                        Créez un nouveau compte client. Il recevra ses accès par email.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Nom
                        </Label>
                        <Input
                            id="name"
                            value={formData.displayName}
                            onChange={(e) => handleChange('displayName', e.target.value)}
                            className="col-span-3"
                            placeholder="Optique Vision"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            className="col-span-3"
                            placeholder="client@opticien.com"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">
                            Mot de passe
                        </Label>
                        <Input
                            id="password"
                            type="text" // Visible for admin to copy if needed, or password type
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            className="col-span-3"
                            placeholder="Secret123!"
                            required
                            minLength={6}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">
                            Tél
                        </Label>
                        <Input
                            id="phone"
                            value={formData.phoneNumber}
                            onChange={(e) => handleChange('phoneNumber', e.target.value)}
                            className="col-span-3"
                            placeholder="+212 6..."
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="plan" className="text-right">
                            Plan
                        </Label>
                        <div className="col-span-3">
                            <Select
                                value={formData.plan}
                                onValueChange={(val) => handleChange('plan', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir un plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="trial">Essai (15 jours)</SelectItem>
                                    <SelectItem value="monthly">Mensuel (200 MAD)</SelectItem>
                                    <SelectItem value="yearly">Annuel (2000 MAD)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <BrandLoader size="xs" className="mr-2 inline-flex" />}
                            Créer le compte
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
