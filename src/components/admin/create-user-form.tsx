'use client';

import { useState } from 'react';
import { createUserAction, type CreateUserInput } from '@/app/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';
import { toast } from 'sonner';

/**
 * Admin User Creation Component
 * For creating staff accounts programmatically
 */
export function CreateUserForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    password: '',
    name: '',
    role: 'user',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await createUserAction(formData);

      if (result.success) {
        toast.success(result.message || 'Utilisateur créé avec succès');
        // Reset form
        setFormData({
          email: '',
          password: '',
          name: '',
          role: 'user',
        });
      } else {
        toast.error(result.error || 'Erreur lors de la création');
      }
    } catch (error) {
      toast.error('Une erreur inattendue s\'est produite');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Créer un Utilisateur
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Jean Dupont"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="utilisateur@example.com"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
            <Input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 8 caractères"
              disabled={isLoading}
              minLength={8}
            />
            <p className="text-xs text-slate-500">
              Minimum 8 caractères requis
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select
              value={formData.role}
              onValueChange={(value: 'admin' | 'user') => 
                setFormData({ ...formData, role: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
              {isLoading && <BrandLoader size="xs" className="mr-2 inline-flex" />}
                Création en cours...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Créer l'utilisateur
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
