// src/components/prescriptions/prescription-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertCircle, Check, Info, Loader2 } from 'lucide-react';
import type { PrescriptionData } from '@/lib/prescription-validator';
import { validatePrescription, formatPrescriptionValue } from '@/lib/prescription-validator';

interface Props {
  initialData?: PrescriptionData;
  onSave: (data: PrescriptionData, notes?: string) => Promise<void>;
  confidence?: 'high' | 'medium' | 'low' | 'none';
  isLoading?: boolean;
}

export function PrescriptionForm({
  initialData,
  onSave,
  confidence,
  isLoading = false
}: Props) {
  const [data, setData] = useState<PrescriptionData>(
    initialData || {
      OD: { sph: null, cyl: null, axis: null, add: null, pd: null, hauteur: null },
      OS: { sph: null, cyl: null, axis: null, add: null, pd: null, hauteur: null },
      PD: null,
      doctorName: undefined,
      date: undefined
    }
  );

  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<any[]>([]);

  // Update data when initialData changes
  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  // Validate on change
  useEffect(() => {
    const validation = validatePrescription(data);
    setErrors(validation.errors);
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validatePrescription(data);
    if (!validation.isValid) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(data, notes);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Confidence Warning */}
        {confidence && ['medium', 'low'].includes(confidence) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {confidence === 'low'
                ? 'Certaines valeurs n\'ont pas pu être détectées avec précision. Veuillez vérifier attentivement.'
                : 'Veuillez vérifier les valeurs détectées.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((err, i) => (
                  <li key={i}>{err.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* OD (Right Eye) */}
        <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">OD (Œil Droit)</h3>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Oculus Dexter (Œil Droit)</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* SPH */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Label htmlFor="od-sph">SPH</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sphère: correction myopie (-) ou hypermétropie (+)</p>
                    <p className="text-xs text-muted-foreground">Range: -20 à +20</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="od-sph"
                type="number"
                step="0.25"
                value={data.OD.sph ?? ''}
                onChange={(e) => setData({
                  ...data,
                  OD: { ...data.OD, sph: e.target.value ? parseFloat(e.target.value) : null }
                })}
                placeholder="-2.00"
                className="no-spinner"
              />
            </div>

            {/* CYL */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Label htmlFor="od-cyl">CYL</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cylindre: correction astigmatisme</p>
                    <p className="text-xs text-muted-foreground">Range: -6 à +6</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="od-cyl"
                type="number"
                step="0.25"
                value={data.OD.cyl ?? ''}
                onChange={(e) => setData({
                  ...data,
                  OD: { ...data.OD, cyl: e.target.value ? parseFloat(e.target.value) : null }
                })}
                placeholder="-0.50"
                className="no-spinner"
              />
            </div>

            {/* AXIS */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Label htmlFor="od-axis">AXIS</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Axe: orientation du cylindre</p>
                    <p className="text-xs text-muted-foreground">Range: 0 à 180°</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="od-axis"
                type="number"
                step="1"
                value={data.OD.axis ?? ''}
                onChange={(e) => setData({
                  ...data,
                  OD: { ...data.OD, axis: e.target.value ? parseInt(e.target.value) : null }
                })}
                placeholder="180"
                className="no-spinner"
                disabled={!data.OD.cyl || data.OD.cyl === 0}
              />
            </div>

            {/* ADD */}
            <div>
              <Label htmlFor="od-add">ADD</Label>
              <Input
                id="od-add"
                type="number"
                step="0.25"
                value={data.OD.add ?? ''}
                onChange={(e) => setData({
                  ...data,
                  OD: { ...data.OD, add: e.target.value ? parseFloat(e.target.value) : null }
                })}
                placeholder="+1.50"
                className="no-spinner"
              />
            </div>

            {/* PD Monocular */}
            <div>
              <Label htmlFor="od-pd">EP (monoc)</Label>
              <Input
                id="od-pd"
                type="number"
                step="0.5"
                value={data.OD.pd ?? ''}
                onChange={(e) => setData({
                  ...data,
                  OD: { ...data.OD, pd: e.target.value ? parseFloat(e.target.value) : null }
                })}
                placeholder="31.5"
                className="no-spinner"
              />
            </div>

            {/* Height */}
            <div>
              <Label htmlFor="od-h">Hauteur</Label>
              <Input
                id="od-h"
                type="number"
                step="1"
                value={data.OD.hauteur ?? ''}
                onChange={(e) => setData({
                  ...data,
                  OD: { ...data.OD, hauteur: e.target.value ? parseFloat(e.target.value) : null }
                })}
                placeholder="18"
                className="no-spinner"
              />
            </div>
          </div>
        </div>

        {/* OS (Left Eye) */}
        <div className="space-y-4 p-4 border rounded-lg bg-green-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">OS (Œil Gauche)</h3>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Oculus Sinister (Œil Gauche)</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* SPH */}
            <div>
              <Label htmlFor="os-sph">SPH</Label>
              <Input
                id="os-sph"
                type="number"
                step="0.25"
                value={data.OS.sph ?? ''}
                onChange={(e) => setData({
                  ...data,
                  OS: { ...data.OS, sph: e.target.value ? parseFloat(e.target.value) : null }
                })}
                placeholder="-1.75"
                className="no-spinner"
              />
            </div>

            {/* CYL */}
            <div>
              <Label htmlFor="os-cyl">CYL</Label>
              <Input
                id="os-cyl"
                type="number"
                step="0.25"
                value={data.OS.cyl ?? ''}
                onChange={(e) => setData({
                  ...data,
                  OS: { ...data.OS, cyl: e.target.value ? parseFloat(e.target.value) : null }
                })}
                placeholder="-0.25"
                className="no-spinner"
              />
            </div>

            {/* AXIS */}
            <div>
              <Label htmlFor="os-axis">AXIS</Label>
              <Input
                id="os-axis"
                type="number"
                step="1"
                value={data.OS.axis ?? ''}
                onChange={(e) => setData({
                  ...data,
                  OS: { ...data.OS, axis: e.target.value ? parseInt(e.target.value) : null }
                })}
                placeholder="10"
                className="no-spinner"
                disabled={!data.OS.cyl || data.OS.cyl === 0}
              />
            </div>

            {/* ADD */}
            <div>
              <Label htmlFor="os-add">ADD</Label>
              <Input
                id="os-add"
                type="number"
                step="0.25"
                value={data.OS.add ?? ''}
                onChange={(e) => setData({
                  ...data,
                  OS: { ...data.OS, add: e.target.value ? parseFloat(e.target.value) : null }
                })}
                placeholder="+1.50"
                className="no-spinner"
              />
            </div>

            {/* PD Monocular */}
            <div>
              <Label htmlFor="os-pd">EP (monoc)</Label>
              <Input
                id="os-pd"
                type="number"
                step="0.5"
                value={data.OS.pd ?? ''}
                onChange={(e) => setData({
                  ...data,
                  OS: { ...data.OS, pd: e.target.value ? parseFloat(e.target.value) : null }
                })}
                placeholder="31.5"
                className="no-spinner"
              />
            </div>

            {/* Height */}
            <div>
              <Label htmlFor="os-h">Hauteur</Label>
              <Input
                id="os-h"
                type="number"
                step="1"
                value={data.OS.hauteur ?? ''}
                onChange={(e) => setData({
                  ...data,
                  OS: { ...data.OS, hauteur: e.target.value ? parseFloat(e.target.value) : null }
                })}
                placeholder="18"
                className="no-spinner"
              />
            </div>
          </div>
        </div>

        {/* PD & Metadata */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* PD */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Label htmlFor="pd">PD (Écart Pupillaire)</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Distance entre les pupilles en mm</p>
                  <p className="text-xs text-muted-foreground">Range: 50-80 mm</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="pd"
              type="number"
              step="0.5"
              value={data.PD ?? ''}
              onChange={(e) => setData({
                ...data,
                PD: e.target.value ? parseFloat(e.target.value) : null
              })}
              placeholder="63"
              className="no-spinner"
            />
          </div>

          {/* Doctor Name */}
          <div>
            <Label htmlFor="doctor">Nom du médecin (optionnel)</Label>
            <Input
              id="doctor"
              type="text"
              value={data.doctorName ?? ''}
              onChange={(e) => setData({
                ...data,
                doctorName: e.target.value || undefined
              })}
              placeholder="Dr. ..."
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <Label htmlFor="date">Date de prescription (optionnel)</Label>
          <Input
            id="date"
            type="date"
            value={data.date ?? ''}
            onChange={(e) => setData({
              ...data,
              date: e.target.value || undefined
            })}
          />
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes (optionnel)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Remarques supplémentaires..."
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSaving || isLoading || errors.length > 0}
          className="w-full"
          size="lg"
        >
          {isSaving || isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              Enregistrer l'ordonnance
            </>
          )}
        </Button>

        {/* Keyboard hint */}
        <p className="text-xs text-center text-muted-foreground">
          💡 Astuce: Utilisez Tab pour naviguer entre les champs
        </p>
      </form>
    </TooltipProvider>
  );
}
