'use client';

import React from 'react';
import { Printer, FileDown, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { printInPlace } from '@/lib/print-in-place';
import { generateDocumentFilename } from '@/lib/pdf-filenames';
import { downloadPdfFromApi } from '@/lib/download-pdf';

export type PrintDocType = 'facture' | 'devis' | 'bon-commande' | 'recu';
export type PrintVariant = 'print' | 'pdf' | 'share';

export interface PrintButtonProps {
  /** Document type — maps to /print/[type]/[id] */
  type: PrintDocType;
  /** Database ID of the document */
  id: number | string;
  /** print = open in new tab | pdf = open with autoprint | share = copy link */
  variant?: PrintVariant;
  /** Override the default button label */
  label?: string;
  /** Open and immediately trigger window.print() (sets ?autoprint=true) */
  autoprint?: boolean;
  /** Extra CSS classes on the Button */
  className?: string;
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Optional metadata for 'bulletproof' filename generation */
  reference?: string;
  clientName?: string;
  /** Force the API route type for fetch (e.g. 'factures', 'devis') */
  apiRouteType?: 'factures' | 'devis';
}

export function PrintButton({
  type,
  id,
  variant = 'print',
  label,
  autoprint = false,
  className,
  size = 'default',
  apiRouteType,
  reference,
  clientName,
}: PrintButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (variant === 'pdf' || autoprint) params.set('autoprint', 'true');
    const qs = params.toString();
    return `/print/${type}/${id}${qs ? `?${qs}` : ''}`;
  };

  const getApiUrl = () => {
    const apiPath = apiRouteType || (type === 'facture' ? 'factures' : type);
    return `/api/${apiPath}/${id}/pdf`;
  };

  const docTypeLabel =
    type === 'facture' ? 'Facture' :
    type === 'devis' ? 'Devis' :
    type === 'bon-commande' ? 'Commande' : 'Recu';

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const url = getApiUrl();
      await downloadPdfFromApi(
        url,
        generateDocumentFilename(
          docTypeLabel as any,
          reference || String(id),
          clientName || 'Client'
        )
      );
      toast({ title: "Téléchargement terminé" });
    } catch (error) {
      console.error("Download error:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: 'Le téléchargement a échoué.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const apiUrl = getApiUrl();
    
    // 1. Try native file sharing first (Mobile/WhatsApp/etc)
    if (navigator.share) {
      setIsLoading(true);
      try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Erreur lors de la récupération du PDF");
        
        const blob = await res.blob();
        const filename = generateDocumentFilename(docTypeLabel as any, reference || String(id), clientName || 'Client');
        const file = new File([blob], filename, { type: 'application/pdf' });
        
        // Use navigator.canShare to check if files are support (Safari/Chrome Mobile)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${docTypeLabel} ${reference || id}`,
            files: [file]
          });
          return;
        }
      } catch (error) {
        console.error("Native share error:", error);
      } finally {
        setIsLoading(false);
      }
    }

    // 2. Fallback to Link sharing
    const url = `${window.location.origin}/print/${type}/${id}`;
    if (navigator.share) {
      navigator.share({ url, title: `${docTypeLabel} ${reference || id}` }).catch(() => {
        navigator.clipboard.writeText(url);
        toast({ title: 'Lien copié', description: url });
      });
    } else {
      navigator.clipboard
        .writeText(url)
        .then(() => toast({ title: 'Lien copié', description: 'Lien vers le document copié.' }))
        .catch(() => toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de copier.' }));
    }
  };

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (variant === 'share') {
      await handleShare();
      return;
    }
    
    if (variant === 'pdf') {
      await handleDownload();
      return;
    }
    
    const url = buildUrl();
    if (variant === 'print') {
      printInPlace(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const icons: Record<PrintVariant, React.ReactNode> = {
    print: <Printer className="w-4 h-4" />,
    pdf:   <FileDown className="w-4 h-4" />,
    share: <Share2 className="w-4 h-4" />,
  };

  const defaultLabels: Record<PrintVariant, string> = {
    print: 'Imprimer',
    pdf:   'Télécharger PDF',
    share: 'Partager',
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={isLoading}
      onClick={handleClick}
      className={`flex items-center gap-2 ${className ?? ''} ${isLoading ? 'opacity-70' : ''}`}
    >
      {isLoading ? (
          <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      ) : (
          icons[variant]
      )}
      {label ?? (isLoading ? 'Chargement...' : defaultLabels[variant])}
    </Button>
  );
}
