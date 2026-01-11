'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, UserPlus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useFirestore, useFirebase } from '@/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { Client } from '@/lib/types';
import { QuickClientDialog } from './quick-client-dialog';

interface ClientSelectorProps {
    onSelect: (client: Client | null) => void;
    selectedClient?: Client | null;
}

export function ClientSelector({ onSelect, selectedClient }: ClientSelectorProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [clients, setClients] = React.useState<Client[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [showQuickCreate, setShowQuickCreate] = React.useState(false);
    const firestore = useFirestore();
    const { user } = useFirebase();

    // Search clients based on query
    const searchClients = React.useCallback(async () => {
        if (!firestore || !user) return;

        setIsLoading(true);
        try {
            const clientsRef = collection(firestore, `stores/${user.uid}/clients`);

            // If no search query, get recent clients
            if (!searchQuery.trim()) {
                const q = query(clientsRef, orderBy('lastVisit', 'desc'), limit(10));
                const snapshot = await getDocs(q);
                const clientsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Client));
                setClients(clientsData);
            } else {
                // Search by name - get all and filter client-side
                const snapshot = await getDocs(clientsRef);
                const allClients = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Client));

                const searchLower = searchQuery.toLowerCase();
                const filtered = allClients.filter(client =>
                    client.nom?.toLowerCase().includes(searchLower) ||
                    client.prenom?.toLowerCase().includes(searchLower) ||
                    client.telephone1?.includes(searchQuery)
                ).slice(0, 10);

                setClients(filtered);
            }
        } catch (error) {
            console.error('Error searching clients:', error);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, firestore, user]);

    React.useEffect(() => {
        searchClients();
    }, [searchClients]);

    // Handle new client creation
    const handleClientCreated = (newClient: Client) => {
        // Add to local list
        setClients(prev => [newClient, ...prev]);

        // Auto-select the new client
        onSelect(newClient);

        // Close the popover
        setOpen(false);
    };

    return (
        <>
            <div className="flex items-center gap-2">
                {/* Client Search Dropdown */}
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-500" />
                                {selectedClient ? (
                                    <span className="font-medium text-slate-900">
                                        {selectedClient.prenom} {selectedClient.nom}
                                    </span>
                                ) : (
                                    <span className="text-slate-500">Sélectionner un client...</span>
                                )}
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Rechercher par nom ou téléphone..."
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                            />
                            <CommandList>
                                <CommandEmpty>
                                    {isLoading ? 'Recherche...' : 'Aucun client trouvé.'}
                                </CommandEmpty>

                                {/* Single CommandGroup for seamless navigation */}
                                <CommandGroup heading="Clients">
                                    {clients.map((client) => (
                                        <CommandItem
                                            key={client.id}
                                            value={`${client.nom} ${client.prenom} ${client.telephone1}`}
                                            onSelect={() => {
                                                onSelect(client);
                                                setOpen(false);
                                            }}
                                            className="cursor-pointer data-[selected=true]:bg-blue-50"
                                        >
                                            <Check
                                                className={cn(
                                                    'mr-2 h-4 w-4',
                                                    selectedClient?.id === client.id ? 'opacity-100' : 'opacity-0'
                                                )}
                                            />
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">
                                                    {client.prenom} {client.nom}
                                                </span>
                                                <span className="text-xs text-slate-600">
                                                    {client.telephone1}
                                                    {client.ville && ` • ${client.ville}`}
                                                </span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                {/* External Create Button */}
                <Button
                    onClick={() => setShowQuickCreate(true)}
                    variant="outline"
                    className="shrink-0"
                    title="Nouveau Client Rapide"
                >
                    <UserPlus className="h-4 w-4" />
                </Button>
            </div>

            {/* Quick Create Dialog */}
            <QuickClientDialog
                open={showQuickCreate}
                onOpenChange={setShowQuickCreate}
                onClientCreated={handleClientCreated}
            />
        </>
    );
}
