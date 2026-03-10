'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Download, Database, RotateCcw, AlertTriangle, Upload, Trash2,
  Shield, CheckCircle2, Info, HardDrive, Users, Package, ShoppingCart, Truck, BarChart3,
} from 'lucide-react';
import {
  exportUserData, getBackupStats, restoreUserData, resetUserAccount,
} from '@/app/actions/backup-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 p-3 rounded-xl border bg-white shadow-sm`}>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 text-center">{label}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export function DataBackup() {
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState(0);

  const [isRestoring, setIsRestoring] = React.useState(false);
  const [restoreFile, setRestoreFile] = React.useState<File | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = React.useState(false);

  const [isResetting, setIsResetting] = React.useState(false);
  const [showConfirmReset, setShowConfirmReset] = React.useState(false);
  const [resetWord, setResetWord] = React.useState('');

  const [stats, setStats] = React.useState<{
    clients: number; products: number; sales: number; suppliers: number; expenses: number; totalRecords: number;
  } | null>(null);

  const [lastBackupDate, setLastBackupDate] = React.useState<string | null>(null);

  // Load stats on mount
  const loadStats = React.useCallback(async () => {
    try {
      const s = await getBackupStats();
      setStats(s as any);
    } catch {
      // silent — user may not have data yet
    }
  }, []);

  React.useEffect(() => {
    loadStats();
    const saved = localStorage.getItem('lastBackupDate');
    if (saved) setLastBackupDate(saved);
  }, [loadStats]);

  // ── EXPORT ─────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportProgress(10);

      const result = await exportUserData();
      setExportProgress(70);

      if (!result.success || !result.data) {
        toast.error('Export échoué', { description: result.error || 'Erreur inconnue.' });
        return;
      }

      // Decode base64 → binary → Blob
      const binary = window.atob(result.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/gzip' });

      setExportProgress(90);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `optimanager_backup_${today}.json.gz`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const now = new Date().toLocaleString('fr-FR');
      localStorage.setItem('lastBackupDate', now);
      setLastBackupDate(now);

      setExportProgress(100);
      toast.success('Backup téléchargé avec succès !', {
        description: `Fichier compressé GZIP • ${stats?.totalRecords ?? '?'} enregistrements exportés`,
        duration: 5000,
      });
    } catch {
      toast.error('Export échoué', { description: "Une erreur inattendue s'est produite." });
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 1500);
    }
  };

  // ── RESTORE ─────────────────────────────────────────────────
  const handleRestore = async () => {
    if (!restoreFile) return;
    try {
      setIsRestoring(true);
      const fd = new FormData();
      fd.append('file', restoreFile);

      const result = await restoreUserData(fd);

      if (!result.success) {
        toast.error('Restauration échouée', {
          description: result.error || 'Erreur côté serveur.',
        });
        return;
      }

      toast.success('Restauration réussie !', {
        description: 'Toutes vos données ont été restaurées avec succès.',
        duration: 6000,
      });
      setShowConfirmRestore(false);
      setRestoreFile(null);
      await loadStats();
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast.error('Erreur critique', { description: e?.message ?? 'Échec inattendu.' });
    } finally {
      setIsRestoring(false);
    }
  };

  // ── RESET ─────────────────────────────────────────────────
  const handleReset = async () => {
    if (resetWord !== 'RESET') return;
    try {
      setIsResetting(true);
      const result = await resetUserAccount();

      if (!result.success) {
        toast.error('Réinitialisation échouée', {
          description: result.error || "Impossible d'effacer les données.",
        });
        return;
      }

      toast.success('Compte réinitialisé', {
        description: 'Toutes vos données ont été supprimées.',
      });
      setShowConfirmReset(false);
      setResetWord('');
      await loadStats();
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast.error('Erreur critique', { description: e?.message ?? 'Échec inattendu.' });
    } finally {
      setIsResetting(false);
    }
  };

  const formatFileSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} Ko`
      : `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">

      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100">
        <div className="bg-indigo-600 p-2.5 rounded-xl">
          <HardDrive className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Gestion de vos données</h2>
          <p className="text-sm text-slate-500">
            Sauvegardez, restaurez ou réinitialisez vos données en toute sécurité.
          </p>
        </div>
        {lastBackupDate && (
          <Badge variant="outline" className="ml-auto text-xs text-green-700 border-green-300 bg-green-50 whitespace-nowrap">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Dernier backup : {lastBackupDate}
          </Badge>
        )}
      </div>

      {/* ── Stats ──────────────────────────────── */}
      {stats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Aperçu de vos données actuelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatCard icon={Users} label="Clients" value={stats.clients} color="bg-blue-500" />
              <StatCard icon={Package} label="Produits" value={stats.products} color="bg-violet-500" />
              <StatCard icon={ShoppingCart} label="Ventes" value={stats.sales} color="bg-green-500" />
              <StatCard icon={Truck} label="Fournisseurs" value={stats.suppliers} color="bg-orange-500" />
              <StatCard icon={Database} label="Total" value={stats.totalRecords} color="bg-indigo-600" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Export Section ─────────────────────── */}
      <Card className="border-indigo-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Download className="h-5 w-5 text-indigo-600" />
            Télécharger un Backup
          </CardTitle>
          <CardDescription>
            Exportez toutes vos données dans un fichier compressé sécurisé (.json.gz). Taille réduite jusqu'à 80%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isExporting && exportProgress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Compression en cours…</span>
                <span>{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="h-2" />
            </div>
          )}

          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
            <Info className="h-4 w-4 shrink-0" />
            <span>Le backup inclut : clients, produits, ventes, ordonnances, fournisseurs, commandes, finances et paramètres boutique.</span>
          </div>

          <Button
            size="lg"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                Compression en cours…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                📥 Télécharger le Backup
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Restore Section ────────────────────── */}
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <Upload className="h-5 w-5" />
            Restaurer un Backup
          </CardTitle>
          <CardDescription className="text-amber-700/70">
            Remplace toutes vos données actuelles par celles du fichier sélectionné.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-file" className="text-sm font-medium">
              Fichier de sauvegarde (.json ou .json.gz)
            </Label>
            <div className="flex gap-2">
              <Input
                id="backup-file"
                type="file"
                accept=".json,.gz"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                className="bg-white"
              />
            </div>
            {restoreFile && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {restoreFile.name} ({formatFileSize(restoreFile.size)})
              </p>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full border-amber-400 text-amber-700 hover:bg-amber-50"
            disabled={!restoreFile || isRestoring}
            onClick={() => setShowConfirmRestore(true)}
          >
            {isRestoring ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-amber-400/30 border-t-amber-600 rounded-full" />
                Restauration…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Restaurer ce Backup
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Danger Zone ────────────────────────── */}
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Zone de Danger — Réinitialisation
          </CardTitle>
          <CardDescription className="text-red-600/80">
            Supprime <strong>toutes</strong> vos données de façon permanente. Votre compte utilisateur reste actif.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-100/50 border border-red-200 text-sm text-red-700 mb-4">
            <Shield className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Effectuez un <strong>Backup</strong> avant de continuer. Cette action est <strong>irréversible</strong>.
            </div>
          </div>
          <Button
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-100 font-semibold"
            onClick={() => setShowConfirmReset(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Formater le compte (Factory Reset)
          </Button>
        </CardContent>
      </Card>

      {/* ── Dialog: Confirm Restore ─────────────── */}
      <AlertDialog open={showConfirmRestore} onOpenChange={setShowConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la restauration ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Toutes vos <strong>données actuelles</strong> seront remplacées par celles du fichier backup.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isRestoring}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isRestoring ? 'Restauration…' : 'Oui, restaurer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog: Confirm Reset ───────────────── */}
      <AlertDialog open={showConfirmReset} onOpenChange={(open) => { if (!open) setResetWord(''); setShowConfirmReset(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              RÉINITIALISATION COMPLÈTE
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-700">
                <p>Vous êtes sur le point de <strong>supprimer définitivement</strong> :</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Tous les clients et leurs ordonnances</li>
                  <li>Toutes les ventes, factures et devis</li>
                  <li>Tout le stock et produits</li>
                  <li>Toutes les commandes fournisseurs</li>
                  <li>Toutes les données financières</li>
                </ul>
                <div className="pt-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">
                    Tapez <span className="text-red-600 font-mono">RESET</span> pour confirmer
                  </Label>
                  <Input
                    value={resetWord}
                    onChange={(e) => setResetWord(e.target.value.toUpperCase())}
                    placeholder="RESET"
                    className="border-red-300 focus-visible:ring-red-500 mt-1 font-mono tracking-widest text-red-700"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={resetWord !== 'RESET' || isResetting}
              onClick={handleReset}
            >
              {isResetting ? 'Suppression…' : 'TOUT SUPPRIMER'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
