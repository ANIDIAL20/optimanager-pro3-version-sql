/**
 * Utility functions to serialize Firestore data for use in Client Components.
 * Converts Firestore Timestamp objects to ISO string format to avoid Next.js serialization errors.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Recursively converts Firestore Timestamp objects to ISO strings.
 * This makes the data serializable for passing between Server and Client Components.
 * 
 * @param data - The data to serialize (can be any type)
 * @returns The serialized data with all Timestamps converted to ISO strings
 */
export function serializeFirestoreData<T>(data: T): T {
    if (data === null || data === undefined) {
        return data;
    }

    // Handle Firestore Timestamp objects
    if (data instanceof Timestamp) {
        return data.toDate().toISOString() as any;
    }

    // Also check for Timestamp-like objects by structure (has _seconds and _nanoseconds)
    // This handles cases where instanceof might fail across different contexts
    if (
        typeof data === 'object' &&
        data !== null &&
        '_seconds' in data &&
        '_nanoseconds' in data &&
        typeof (data as any)._seconds === 'number' &&
        typeof (data as any)._nanoseconds === 'number'
    ) {
        // Convert Timestamp-like object to Date then to ISO string
        const timestamp = new Timestamp((data as any)._seconds, (data as any)._nanoseconds);
        return timestamp.toDate().toISOString() as any;
    }

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => serializeFirestoreData(item)) as any;
    }

    // Handle objects
    if (typeof data === 'object') {
        const serialized: any = {};
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                serialized[key] = serializeFirestoreData((data as any)[key]);
            }
        }
        return serialized;
    }

    // Return primitives as-is
    return data;
}
