'use client';

import React from 'react';
import { Printer, FileDown, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
}

export function PrintButton({
  type,
  id,
  variant = 'print',
  label,
  autoprint = false,
  className,
  size = 'default',
}: PrintButtonProps) {
  const { toast } = useToast();

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (variant === 'pdf' || autoprint) params.set('autoprint', 'true');
    const qs = params.toString();
    return `/print/${type}/${id}${qs ? `?${qs}` : ''}`;
  };

  const handleClick = () => {
    if (variant === 'share') {
      const url = `${window.location.origin}/print/${type}/${id}`;
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
    window.open(buildUrl(), '_blank');
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
