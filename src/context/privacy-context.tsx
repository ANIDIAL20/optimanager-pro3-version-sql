"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type PrivacyContextType = {
    isPatientMode: boolean;
    togglePatientMode: () => void;
};

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
    const [isPatientMode, setIsPatientMode] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load preference from localStorage after hydration
    useEffect(() => {
        const saved = localStorage.getItem("opti_patient_mode");
        if (saved) {
            setIsPatientMode(JSON.parse(saved));
        }
        setIsHydrated(true);
    }, []);

    const togglePatientMode = () => {
        setIsPatientMode((prev) => {
            const newState = !prev;
            localStorage.setItem("opti_patient_mode", JSON.stringify(newState));
            return newState;
        });
    };

    // ✅ FIX: Always provide context, even during hydration
    // This prevents "usePrivacy must be used within PrivacyProvider" errors
    return (
        <PrivacyContext.Provider value={{ isPatientMode, togglePatientMode }}>
            {children}
        </PrivacyContext.Provider>
    );
}

export function usePrivacy() {
    const context = useContext(PrivacyContext);
    if (context === undefined) {
        throw new Error("usePrivacy must be used within a PrivacyProvider");
    }
    return context;
}
