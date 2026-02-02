'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';

interface PrintPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    url: string;
    title?: string;
}

export function PrintPreviewDialog({ open, onOpenChange, url, title = "Aperçu avant impression" }: PrintPreviewDialogProps) {
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    const handlePrint = () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.print();
        }
    };

    // Reset loading state when url changes or dialog opens
    React.useEffect(() => {
        if (open) {
            setIsLoading(true);
        }
    }, [open, url]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 relative bg-slate-100 w-full">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    <iframe
                        ref={iframeRef}
                        src={url}
                        className="w-full h-full border-0"
                        onLoad={() => setIsLoading(false)}
                        title="Print Preview"
                    />
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-white">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Fermer
                    </Button>
                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="h-4 w-4" />
                        Lancer l'impression
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
