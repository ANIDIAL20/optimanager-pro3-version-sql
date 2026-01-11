'use client';

import { useState } from 'react';
import { updateGlobalBanner } from '@/app/actions/adminActions';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Megaphone, Save, Loader2 } from 'lucide-react';

export function GlobalBannerManager({ initialData }: { initialData?: any }) {
    const [message, setMessage] = useState(initialData?.message || '');
    const [type, setType] = useState<'info' | 'warning' | 'critical'>(initialData?.type || 'info');
    const [active, setActive] = useState(initialData?.active || false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);
        const res = await updateGlobalBanner({ message, type, active });
        setIsLoading(false);
        if (res.success) toast.success(res.message);
        else toast.error(res.error);
    };

    return (
        <div className="p-4 border rounded-xl bg-white shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <Megaphone size={20} />
                </div>
                <h3 className="font-semibold text-slate-900">Annonce Globale</h3>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label>Activer la bannière</Label>
                    <Switch checked={active} onCheckedChange={setActive} />
                </div>

                <div className="space-y-1">
                    <Label>Message</Label>
                    <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Maintenance prévue ce soir..."
                    />
                </div>

                <div className="space-y-1">
                    <Label>Type d'urgence</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="info">Info (Bleu)</SelectItem>
                            <SelectItem value="warning">Attention (Orange)</SelectItem>
                            <SelectItem value="critical">Critique (Rouge)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Button onClick={handleSave} disabled={isLoading} className="w-full mt-2">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publier
            </Button>
        </div>
    );
}
