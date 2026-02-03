"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { getInsurances } from "@/app/actions/settings-actions"

interface MutuelleSelectorProps {
    value: string
    onSelect: (value: string) => void
}

export function MutuelleSelector({ value, onSelect }: MutuelleSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState(value || "")
    const [mutuelles, setMutuelles] = React.useState<{ id: number; name: string }[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        const fetchMutuelles = async () => {
            setIsLoading(true);
            try {
                const data = await getInsurances();
                setMutuelles(data);
            } catch (error) {
                console.error("Failed to fetch insurances", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMutuelles();
    }, []);

    // Sync internal input state with prop value
    React.useEffect(() => {
        setInputValue(value || "")
    }, [value])

    // Filter items based on current input
    const filteredMutuelles = React.useMemo(() => {
        if (!mutuelles) return [];
        if (!inputValue) return mutuelles;
        const lower = inputValue.toLowerCase();
        return mutuelles.filter(m => m.name.toLowerCase().includes(lower));
    }, [mutuelles, inputValue]);

    const handleSelect = (selectedValue: string) => {
        onSelect(selectedValue)
        setInputValue(selectedValue)
        setOpen(false)
    }

    return (
        <CommandPrimitive shouldFilter={false} className="overflow-visible bg-transparent">
            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <div className="relative w-full">
                    <PopoverTrigger asChild>
                        <div role="combobox" aria-expanded={open} aria-controls="mutuelle-list">
                            <CommandPrimitive.Input
                                value={inputValue}
                                onValueChange={(val) => {
                                    setInputValue(val)
                                    onSelect(val)
                                    setOpen(true)
                                }}
                                onFocus={() => setOpen(true)}
                                placeholder="Saisir ou sélectionner une mutuelle..."
                                className={cn(
                                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                    "pr-10"
                                )}
                            />
                        </div>
                    </PopoverTrigger>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                        onClick={() => setOpen(!open)}
                        tabIndex={-1}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <ChevronsUpDown className="h-4 w-4" />
                        )}
                        <span className="sr-only">Toggle mutuelle list</span>
                    </Button>
                </div>

                <PopoverContent
                    className="p-0 w-[--radix-popover-trigger-width] z-[9999]"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <CommandList>
                        <CommandGroup>
                            {filteredMutuelles.map((mutuelle) => (
                                <CommandItem
                                    key={mutuelle.id}
                                    value={mutuelle.name}
                                    onSelect={handleSelect}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === mutuelle.name ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {mutuelle.name}
                                </CommandItem>
                            ))}
                            {filteredMutuelles.length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    Aucune mutuelle trouvée. Continuez à écrire pour créer "{inputValue}".
                                </div>
                            )}
                        </CommandGroup>
                    </CommandList>
                </PopoverContent>
            </Popover>
        </CommandPrimitive>
    )
}
