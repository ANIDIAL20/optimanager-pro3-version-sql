"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { markLensOrderAsDelivered } from "@/app/actions/lens-orders-actions";
import { toast } from "sonner";
import { useState } from "react";
import { Eye, CheckCircle, ExternalLink, Package } from "lucide-react";

interface NotifCardActionsProps {
  id: number;
  type: "order" | "stock" | "reservation" | "lens";
  clientId?: number;
}

export function NotifCardActions({ id, type, clientId }: NotifCardActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDelivering, setIsDelivering] = useState(false);

  const handleDeliver = async () => {
    setIsDelivering(true);
    try {
      const res = await markLensOrderAsDelivered(id);
      if (res.success) {
        toast.success("Commande marquée comme livrée");
        router.refresh();
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } else {
        toast.error(res.error || "Une erreur est survenue");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setIsDelivering(false);
    }
  };

  if (type === "order") {
    return (
      <Button 
        size="sm" 
        variant="outline" 
        className="h-8 gap-1.5 text-xs font-medium border-blue-200 hover:bg-blue-50 text-blue-700 transition-all active:scale-95"
        onClick={() => router.push(`/dashboard/clients/${clientId}?tab=lens-orders`)}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Voir la commande
      </Button>
    );
  }

  if (type === "lens") {
    return (
      <div className="flex gap-2 w-full sm:w-auto">
        <Button 
          size="sm" 
          variant="outline" 
          disabled={isDelivering}
          className="h-8 gap-1.5 text-xs font-medium border-emerald-200 hover:bg-emerald-50 text-emerald-700 transition-all active:scale-95 flex-1 sm:flex-none"
          onClick={handleDeliver}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          {isDelivering ? "En cours..." : "Marquer comme livré"}
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 gap-1.5 text-xs font-medium border-slate-200 hover:bg-slate-50 text-slate-700 transition-all active:scale-95 flex-1 sm:flex-none"
          onClick={() => router.push(`/dashboard/clients/${clientId}?tab=sales`)}
        >
          <Eye className="h-3.5 w-3.5" />
          Dossier
        </Button>
      </div>
    );
  }

  if (type === "reservation") {
    return (
      <Button 
        size="sm" 
        variant="outline" 
        className="h-8 gap-1.5 text-xs font-medium border-amber-200 hover:bg-amber-50 text-amber-700 transition-all active:scale-95"
        onClick={() => router.push(`/dashboard/clients/${clientId}?tab=reservations`)}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Voir la réservation
      </Button>
    );
  }

  if (type === "stock") {
    return (
      <Button 
        size="sm" 
        variant="outline" 
        className="h-8 gap-1.5 text-xs font-medium border-red-200 hover:bg-red-50 text-red-700 transition-all active:scale-95"
        onClick={() => router.push(`/produits`)}
      >
        <Package className="h-3.5 w-3.5" />
        Gérer le stock
      </Button>
    );
  }

  return null;
}
