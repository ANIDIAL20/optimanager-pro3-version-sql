'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, Database, RotateCcw, AlertTriangle, Upload, Trash2 } from 'lucide-react';
import { exportUserData, getBackupStats, restoreUserData, resetUserAccount } from '@/app/actions/backup-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';
import { BrandLoader } from '@/components/ui/loader-brand';

export function DataBackup() {
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isRestoring, setIsRestoring] = React.useState(false);
    const [isResetting, setIsResetting] = React.useState(false);
    
    const [backupStats, setBackupStats] = React.useState<any>(null);
    const [restoreFile, setRestoreFile] = React.useState<File | null>(null);
    const [showConfirmRestore, setShowConfirmRestore] = React.useState(false);
    
    const [showConfirmReset, setShowConfirmReset] = React.useState(false);
    const [resetConfirmation, setResetConfirmation] = React.useState('');

    // Load stats
    const loadStats = React.useCallback(async () => {
        try {
            const stats = await getBackupStats();
            if (stats) setBackupStats(stats);
        } catch (error) {
            console.error(error);
        }
    }, []);

    React.useEffect(() => {
        loadStats();
    }, [loadStats]);

    // Handle Download (GZIP)
    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const result = await exportUserData();
            
            if (!result.success) {
                toast.error('Erreur', { description: result.error || "Impossible d'exporter les données." });
                return;
            }

            const base64Data = result.data as string;
            
            // Convert Base64 back to binary data for the Blob
            const binaryString = window.atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/gzip' });
            
            // Download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const today = new Date().toISOString().split('T')[0];
            link.href = url;
            link.download = `backup_${today}.json.gz`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast.success('Backup téléchargé', {
                description: 'Format compressé (GZIP). Conservez-le en lieu sûr.',
            });
        } catch (error) {
            toast.error('Erreur', {
                description: "Impossible d'exporter les données.",
            });
        } finally {
            setIsDownloading(false);
        }
    };

    // Handle Restore
    const handleRestore = async () => {
        if (!restoreFile) return;
        
        try {
            setIsRestoring(true);
            const formData = new FormData();
            formData.append('file', restoreFile);
            
            const result = await restoreUserData(formData);
            
            if (!result.success) {
                toast.error('Échec de la restauration', {
                    description: result.error || "La restauration a échoué du côté serveur.",
                });
                return;
            }

            const v = (result as any).validation;
            const bv = (result as any).backupVersion ?? '1.x';
            toast.success(`Restauration réussie — v${bv}`, {
                description: v
                    ? [
                        `👥 Clients : ${v.clients.restored}/${v.clients.expected}`,
                        `📦 Produits : ${v.products.restored}/${v.products.expected}`,
                        `💰 Ventes : ${v.sales.restored}/${v.sales.expected}`,
                        `🏪 Fournisseurs : ${v.suppliers.restored}/${v.suppliers.expected}`,
                        `📋 Ordonnances : ${v.prescriptions.restored}/${v.prescriptions.expected}`,
                      ].join('\n')
                    : 'Vos données ont été restaurées avec succès.',
                duration: 8000,
            });
            setShowConfirmRestore(false);
            setRestoreFile(null);
            loadStats();
            window.location.reload();
        } catch (error: any) {
            console.error('RESTORE TRIGGER ERROR:', error);
            toast.error('Erreur Critique', {
                description: "Échec inattendu lors de la restauration.",
            });
        } finally {
            setIsRestoring(false);
        }
    };

    // Handle Factory Reset
    const handleReset = async () => {
        if (resetConfirmation !== 'RESET' && resetConfirmation !== 'CONFIRMER') return;
        
        try {
            setIsResetting(true);
            const result = await resetUserAccount();
            
            if (!result.success) {
                toast.error('Échec de la réinitialisation', {
                    description: result.error || "Impossible d'effacer les données.",
                });
                return;
            }
            
            toast.success('Compte réinitialisé', {
                description: "Toutes les données ont été effacées avec succès.",
            });
            setShowConfirmReset(false);
            setResetConfirmation('');
            loadStats();
            window.location.reload();
        } catch (error: any) {
            console.error('RESET TRIGGER ERROR:', error);
            toast.error('Erreur Critique', {
                description: "Un problème inattendu a empêché le reset.",
            });
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Backup Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Sauvegarde de Données
                    </CardTitle>
                    <CardDescription>
                        Téléchargez une copie complète et compressée de vos données.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Stats */}
                    {backupStats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-slate-900">{backupStats.clients}</p>
                                <p className="text-xs text-slate-600">Clients</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-slate-900">{backupStats.products}</p>
                                <p className="text-xs text-slate-600">Produits</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-slate-900">{backupStats.sales}</p>
                                <p className="text-xs text-slate-600">Ventes</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-slate-900">{backupStats.totalRecords}</p>
                                <p className="text-xs text-slate-600">Total</p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-2">
                        <Button
                            size="lg"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="w-full md:w-auto min-w-[300px]"
                        >
                            {isDownloading ? (
                                <>
                                    <BrandLoader size="sm" className="mr-2" />
                                    Compression en cours...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    📥 Télécharger Backup (.json.gz)
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Format optimisé GZIP • Réduction de taille ~80%
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Restore Section (Danger Zone) */}
            <Card className="border-red-200 bg-red-50/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Zone de Danger
                    </CardTitle>
                    <CardDescription className="text-red-700/80">
                        Actions irréversibles. Soyez prudent.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    {/* Restore Block */}
                    <div className="space-y-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="backup-file" className="font-semibold text-slate-900">Restaurer les données</Label>
                            <Input 
                                id="backup-file" 
                                type="file" 
                                accept=".json,.gz"
                                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                                className="bg-white"
                            />
                            <p className="text-xs text-slate-500">Accepte .json ou .json.gz. Remplace toutes les données actuelles.</p>
                        </div>
                        <Button 
                            variant="destructive" 
                            disabled={!restoreFile || isRestoring}
                            onClick={() => setShowConfirmRestore(true)}
                            className="w-full md:w-auto"
                        >
                             {isRestoring ? <BrandLoader size="sm" className="mr-2" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                             Restaurer le backup
                        </Button>
                    </div>

                    <Separator className="bg-red-200" />

                    {/* Reset Block */}
                    <div className="space-y-2">
                        <Label className="font-bold text-red-800">Réinitialiser le compte (Factory Reset)</Label>
                        <p className="text-sm text-red-600/90 mb-4">
                            Supprime <strong>toutes</strong> vos données (Clients, Ventes, Produits, Stock) pour repartir à zéro. 
                            Votre abonnement et votre compte utilisateur resteront actifs.
                        </p>
                        <Button 
                            variant="outline"
                            className="w-full md:w-auto border-red-500 text-red-600 hover:bg-red-100 font-bold"
                            onClick={() => setShowConfirmReset(true)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Formater le compte
                        </Button>
                    </div>

                </CardContent>
            </Card>

            {/* Confirmation Dialog: Restore */}
            <AlertDialog open={showConfirmRestore} onOpenChange={setShowConfirmRestore}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la restauration ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action supprimera toutes vos données actuelles et les remplacera par celles du backup.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestore} className="bg-red-600">Restaurer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

             {/* Confirmation Dialog: Reset */}
             <AlertDialog open={showConfirmReset} onOpenChange={(open) => {
                 if (!open) setResetConfirmation('');
                 setShowConfirmReset(open);
             }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            FORMATER LE COMPTE ?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2" asChild>
                            <div className="text-sm text-muted-foreground">
                                <p className="font-bold text-slate-900">ATTENTION : ACTION DESTRUCTRICE</p>
                                <p>Vous êtes sur le point de supprimer TOUTES vos données :</p>
                                <ul className="list-disc pl-5 text-sm">
                                    <li>Tous les clients</li>
                                    <li>Toutes les ventes et factures</li>
                                    <li>Tout le stock et produits</li>
                                    <li>Toutes les commandes fournisseurs</li>
                                </ul>
                                <p>Il est vivement conseillé de faire un <strong>Backup</strong> avant de continuer.</p>
                                
                                <div className="pt-4">
                                    <Label className="text-xs font-bold uppercase text-slate-500">
                                        Tapez "RESET" pour confirmer
                                    </Label>
                                    <Input 
                                        value={resetConfirmation}
                                        onChange={(e) => setResetConfirmation(e.target.value.toUpperCase())}
                                        placeholder="RESET"
                                        className="border-red-300 focus:ring-red-500 mt-1 font-mono tracking-widest text-black"
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <Button 
                            variant="destructive"
                            disabled={resetConfirmation !== 'RESET' || isResetting}
                            onClick={handleReset}
                        >
                             {isResetting && <BrandLoader size="sm" className="mr-2" />}
                             TOUT SUPPRIMER
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
