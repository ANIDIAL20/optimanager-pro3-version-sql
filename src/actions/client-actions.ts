"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

// 1. Schema Definition
const clientSchema = z.object({
    nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),

    // Coerce numbers for HTML number inputs / FormData
    telephone1: z.string().regex(/^(?:\+212|0)([5-7])\d{8}$/, "Numéro invalide (ex: 06...)"),
    telephone2: z.string().optional().or(z.literal("")), // Optional phone

    email: z.string().email("Email invalide").optional().or(z.literal("")),

    adresse: z.string().optional(),
    ville: z.string().optional(),

    // Specific number coercions
    creditBalance: z.coerce.number().default(0),

    // Enums or specific strings
    sexe: z.enum(["Homme", "Femme"]).optional(),
    cni: z.string().optional(),
});

export type ClientState = {
    errors?: {
        nom?: string[];
        prenom?: string[];
        telephone1?: string[];
        telephone2?: string[];
        email?: string[];
        adresse?: string[];
        ville?: string[];
        creditBalance?: string[];
        sexe?: string[];
        cni?: string[];
        // Generic error
        _form?: string[];
    };
    message?: string;
    success?: boolean;
};

export async function addClient(prevState: ClientState, formData: FormData): Promise<ClientState> {
    const rawData = Object.fromEntries(formData.entries());

    // 1. Safe Parse with Zod
    const validatedFields = clientSchema.safeParse(rawData);

    // 2. Handle Validation Errors
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Veuillez corriger les erreurs dans le formulaire.",
            success: false,
        };
    }

    // 3. Data is clean, proceed to Database
    const data = validatedFields.data;

    try {
        const db = adminDb;

        // Add timestamps or other server-side only fields
        const clientData = {
            ...data,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            // Ensure clean optional strings if literal "" was passed (though Zod handles some, best to sanitize if needed)
            email: data.email || null,
            telephone2: data.telephone2 || null,
        };

        await db.collection("clients").add(clientData);

        return {
            message: "Client ajouté avec succès!",
            success: true
        };
    } catch (error) {
        console.error("Error adding client:", error);
        return {
            message: "Une erreur serveur est survenue lors de la création du client.",
            success: false
        };
    }
}
