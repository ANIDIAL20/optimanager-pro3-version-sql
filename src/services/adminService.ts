// services/adminService.ts

// Stubbed for SQL Migration
export const getClients = async () => {
    console.warn("getClients is deprecated in adminService. Use server actions.");
    return [];
};

export const createClientSubscription = async (email: string, plan: string) => {
   console.warn("createClientSubscription is deprecated. Use server actions.");
   return { success: false, error: "Service migrated to SQL. Please update implementation." };
};

export const toggleClientStatus = async (clientId: string, currentStatus: string) => {
     console.warn("toggleClientStatus is deprecated. Use server actions.");
     return { success: false, error: "Service migrated to SQL. Please update implementation." };
};

export const extendSubscription = async (clientId: string, currentExpiryDate: string) => {
    console.warn("extendSubscription is deprecated. Use server actions.");
    return { success: false, error: "Service migrated to SQL. Please update implementation." };
};

export const deleteClient = async (clientId: string) => {
     console.warn("deleteClient is deprecated. Use server actions.");
     return { success: false, error: "Service migrated to SQL. Please update implementation." };
};
