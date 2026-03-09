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

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (variant === 'pdf' || autoprint) params.set('autoprint', 'true');
    const qs = params.toString();
    return `/print/${type}/${id}${qs ? `?${qs}` : ''}`;
  };

  const handleDownload = async () => {
    try {
      const apiPath = apiRouteType || (type === 'facture' ? 'factures' : type);
      const url = `/api/${apiPath}/${id}/pdf`;

      const docTypeLabel =
        type === 'facture' ? 'Facture' :
        type === 'devis' ? 'Devis' :
        type === 'bon-commande' ? 'Commande' : 'Recu';

      await downloadPdfFromApi(
        url,
        generateDocumentFilename(
          docTypeLabel,
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
    }
  };

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (variant === 'share') {
      const url = `${window.location.origin}/print/${type}/${id}`;
      // ... same share logic
      if (navigator.share) {
        navigator.share({ url }).catch(() => {
          navigator.clipboard.writeText(url);
          toast({ title: 'Lien copié', description: url });
        });
      } else {
        navigator.clipboard
          .writeText(url)
          .then(() => toast({ title: 'Lien copié', description: 'Lien vers le document copié.' }))
          .catch(() => toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de copier.' }));
      }
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
      onClick={handleClick}
      className={`flex items-center gap-2 ${className ?? ''}`}
    >
      {icons[variant]}
      {label ?? defaultLabels[variant]}
    </Button>
  );
}
