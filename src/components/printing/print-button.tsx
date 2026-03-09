'use client';

import React from 'react';
import { Printer, FileDown, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { printInPlace } from '@/lib/print-in-place';
import {
  buildBonCommandeFilename,
  buildDevisFilename,
  buildFactureFilename,
  buildRecuFilename,
} from '@/lib/filename-utils';
import { downloadPdfFromApi, sharePdfFromApi } from '@/lib/download-pdf';

export type PrintDocType = 'facture' | 'devis' | 'bon-commande' | 'recu';
export type PrintVariant = 'print' | 'pdf' | 'share';

export interface PrintButtonProps {
  type?: PrintDocType;
  id?: number | string;
  variant?: PrintVariant;
  label?: string;
  autoprint?: boolean;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  reference?: string;
  clientName?: string;
  apiRouteType?: 'factures' | 'devis';
  pdfUrl?: string;
  filename?: string;
  printUrl?: string;
  shareUrl?: string;
}

function buildFilename(type: PrintDocType, reference: string, clientName?: string) {
  if (type === 'facture') return buildFactureFilename(reference, clientName);
  if (type === 'devis') return buildDevisFilename(reference, clientName);
  if (type === 'recu') return buildRecuFilename(reference, clientName);
  return buildBonCommandeFilename(reference, clientName);
}

export function PrintButton({
  type,
  id,
  variant,
  label,
  autoprint = false,
  className,
  size = 'default',
  apiRouteType,
  reference,
  clientName,
  pdfUrl,
  filename,
  printUrl,
  shareUrl,
}: PrintButtonProps) {
  const { toast } = useToast();
  const resolvedVariant = variant ?? (pdfUrl ? 'pdf' : 'print');

  const resolvedFilename = React.useMemo(() => {
    if (filename) return filename;
    if (!type) return 'OptiManager Pro.pdf';
    return buildFilename(type, reference || String(id ?? 'document'), clientName);
  }, [clientName, filename, id, reference, type]);

  const resolvedPdfUrl = React.useMemo(() => {
    if (pdfUrl) return pdfUrl;
    if (!type || id == null) return null;
    const apiPath = apiRouteType || (type === 'facture' ? 'factures' : type);
    return `/api/${apiPath}/${id}/pdf`;
  }, [apiRouteType, id, pdfUrl, type]);

  const resolvedPrintUrl = React.useMemo(() => {
    if (printUrl) return printUrl;
    if (!type || id == null) return null;
    const params = new URLSearchParams();
    if (autoprint) params.set('autoprint', 'true');
    const qs = params.toString();
    return `/print/${type}/${id}${qs ? `?${qs}` : ''}`;
  }, [autoprint, id, printUrl, type]);

  const handleDownload = async () => {
    if (!resolvedPdfUrl) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'URL PDF introuvable.' });
      return;
    }

    try {
      await downloadPdfFromApi(resolvedPdfUrl, resolvedFilename);
      toast({ title: 'TÃ©lÃ©chargement terminÃ©' });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Le tÃ©lÃ©chargement a Ã©chouÃ©.',
      });
    }
  };

  const handleShare = async () => {
    const fallbackUrl = shareUrl || resolvedPrintUrl || resolvedPdfUrl || window.location.href;

    if (resolvedPdfUrl && typeof navigator.share === 'function') {
      try {
        const shared = await sharePdfFromApi(resolvedPdfUrl, resolvedFilename);
        if (shared) {
          toast({ title: 'Partage ouvert' });
          return;
        }
      } catch (error) {
        console.error('Share file error:', error);
      }
    }

    if (typeof navigator.share === 'function') {
      navigator.share({ url: fallbackUrl }).catch(() => {
        navigator.clipboard.writeText(fallbackUrl);
        toast({ title: 'Lien copiÃ©', description: fallbackUrl });
      });
      return;
    }

    navigator.clipboard
      .writeText(fallbackUrl)
      .then(() => toast({ title: 'Lien copiÃ©', description: fallbackUrl }))
      .catch(() => toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de copier.' }));
  };

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (resolvedVariant === 'share') {
      await handleShare();
      return;
    }

    if (resolvedVariant === 'pdf') {
      await handleDownload();
      return;
    }

    if (!resolvedPrintUrl) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'URL d\'impression introuvable.' });
      return;
    }

    printInPlace(resolvedPrintUrl);
  };

  const icons: Record<PrintVariant, React.ReactNode> = {
    print: <Printer className="w-4 h-4" />,
    pdf: <FileDown className="w-4 h-4" />,
    share: <Share2 className="w-4 h-4" />,
  };

  const defaultLabels: Record<PrintVariant, string> = {
    print: 'Imprimer',
    pdf: 'TÃ©lÃ©charger PDF',
    share: 'Partager',
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={handleClick}
      className={`flex items-center gap-2 ${className ?? ''}`}
    >
      {icons[resolvedVariant]}
      {label ?? defaultLabels[resolvedVariant]}
    </Button>
  );
}