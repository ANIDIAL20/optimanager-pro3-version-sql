'use client';

import * as React from 'react';
import { Client } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Search, Eye, User, Phone, Building2 } from 'lucide-react';

interface ClientSelectorProps {
    clients: Client[];
    selectedClient: Client | null;
    onSelectClient: (client: Client | null) => void;
    onCreateNew?: () => void;
}

export function ClientSelector({ clients, selectedClient, onSelectClient, onCreateNew }: ClientSelectorProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Filter clients based on search
    const filteredClients = React.useMemo(() => {
        if (!searchQuery.trim()) return clients;

        const lowerQuery = searchQuery.toLowerCase();
        return clients.filter(
            client =>
                client.nom?.toLowerCase().includes(lowerQuery) ||
                client.prenom?.toLowerCase().includes(lowerQuery) ||
                client.name?.toLowerCase().includes(lowerQuery) ||
                client.telephone1?.includes(searchQuery) ||
                client.phone?.includes(searchQuery)
        );
    }, [clients, searchQuery]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (client: Client) => {
        onSelectClient(client);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleClear = () => {
        onSelectClient(null);
        setSearchQuery('');
    };

    const getClientName = (client: Client) => {
        if (client.nom) return `${client.prenom} ${client.nom}`;
        return client.name || 'Client sans nom';
    };

    const getClientPhone = (client: Client) => {
        return client.telephone1 || client.phone || 'Sans téléphone';
    };

    return (
        <div className="space-y-3">
            {/* Selected Client Card */}
            {selectedClient ? (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                    <span className="font-semibold">{getClientName(selectedClient)}</span>
                                    {selectedClient.prescriptions && selectedClient.prescriptions.length > 0 && (
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Eye className="h-3 w-3" />
                                            Ordonnance disponible
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {getClientPhone(selectedClient)}
                                    </div>
                                    {selectedClient.assuranceId && (
                                        <div className="flex items-center gap-1">
                                            <Building2 className="h-3 w-3" />
                                            {selectedClient.assuranceId}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClear}
                                className="h-8 w-8 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                /* Search Input */
                <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher client (nom ou téléphone)..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsOpen(true);
                            }}
                            onFocus={() => setIsOpen(true)}
                            className="pl-10 h-10"
                        />
                    </div>

                    {/* Dropdown */}
                    {isOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-950 border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                            {filteredClients.length > 0 ? (
                                <div className="py-1">
                                    {filteredClients.map((client) => (
                                        <button
                                            key={client.id}
                                            onClick={() => handleSelect(client)}
                                            className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between group border-b last:border-0"
                                        >
                                            <div>
                                                <div className="font-medium">{getClientName(client)}</div>
                                                <div className="text-sm text-muted-foreground">{getClientPhone(client)}</div>
                                            </div>
                                            {client.prescriptions && client.prescriptions.length > 0 && (
                                                <Eye className="h-4 w-4 text-green-600" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    {searchQuery ? 'Aucun client trouvé' : 'Rechercher un client'}
                                    {onCreateNew && searchQuery && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                onCreateNew();
                                                setIsOpen(false);
                                            }}
                                            className="mt-2 w-full text-blue-600 hover:text-blue-700"
                                        >
                                            + Créer un nouveau client
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
