// src/lib/storage-utils.ts

/**
 * Convert File to base64 string
 */
export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result?.toString();
      if (!result) {
        reject(new Error('Failed to read file'));
        return;
      }
      
      // Extract base64 (remove "data:image/jpeg;base64," prefix)
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Le fichier doit être une image' };
  }
  
  // Check size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'L\'image doit faire moins de 10MB' };
  }
  
  return { valid: true };
}
