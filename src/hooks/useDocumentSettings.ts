'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDocumentSettings,
  updateDocumentSettings,
  resolveSettingsForDocType,
} from '@/lib/services/document-settings';
import type { DocType } from '@/types/document-settings-types';
import type { DocumentSettingsUpdate } from '@/lib/services/document-settings';

export function useDocumentSettings(shopId: number) {
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['document-settings', shopId],
    queryFn: () => getDocumentSettings(shopId),
    staleTime: 5 * 60 * 1000,
    enabled: Number.isFinite(shopId) && shopId > 0,
  });

  const { mutateAsync: updateSettings, isPending: isUpdating } = useMutation({
    mutationFn: (updates: DocumentSettingsUpdate) =>
      updateDocumentSettings(shopId, updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['document-settings', shopId] });
      await queryClient.invalidateQueries({ queryKey: ['facture-pdf'] });
      await queryClient.invalidateQueries({ queryKey: ['devis-pdf'] });
    },
  });

  return { settings, isLoading, error, updateSettings, isUpdating };
}

export function useDocTypeSettings(shopId: number, docType: DocType) {
  const { settings, isLoading } = useDocumentSettings(shopId);
  const resolved = settings ? resolveSettingsForDocType(settings, docType) : null;
  return { settings: resolved, isLoading };
}
