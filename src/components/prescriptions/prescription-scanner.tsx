// src/components/prescriptions/prescription-scanner.tsx
'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { imageToBase64, validateImageFile } from '@/lib/storage-utils';
import { toast } from 'sonner';

interface Props {
  onScanComplete: (result: any) => void;
  onError?: (error: string) => void;
}

export function PrescriptionScanner({ onScanComplete, onError }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      onError?.(validation.error!);
      return;
    }
    
    // Preview
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Scan
    await scanImage(file);
  };
  
  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setUseCamera(true);
      }
    } catch (error: any) {
      const message = 'Impossible d\'accéder à la caméra';
      toast.error(message);
      onError?.(message);
      console.error('Camera error:', error);
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };
  
  // Capture photo
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    
    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error('Échec de la capture');
        return;
      }
      
      const file = new File([blob], 'prescription.jpg', { 
        type: 'image/jpeg' 
      });
      
      // Preview
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Stop camera
      stopCamera();
      
      // Scan
      await scanImage(file);
    }, 'image/jpeg', 0.9);
  };
  
  // Scan image with AI
  const scanImage = async (file: File) => {
    setIsScanning(true);
    
    try {
      // Convert to base64
      const base64 = await imageToBase64(file);
      
      // Call API
      const response = await fetch('/api/prescriptions/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Échec de la lecture');
      }
      
      // Success
      toast.success(result.message || 'Ordonnance lue avec succès!');
      onScanComplete(result);
      
    } catch (error: any) {
      const message = error.message || 'Erreur lors du scan';
      toast.error(message);
      onError?.(message);
      
      // Reset on error
      reset();
    } finally {
      setIsScanning(false);
    }
  };
  
  // Reset
  const reset = () => {
    setImage(null);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      {!image && !useCamera && (
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
            variant="outline"
            size="lg"
          >
            <Upload className="mr-2 h-5 w-5" />
            Choisir une photo
          </Button>
          
          <Button
            onClick={startCamera}
            className="flex-1"
            size="lg"
          >
            <Camera className="mr-2 h-5 w-5" />
            Prendre une photo
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
      
      {/* Camera View */}
      {useCamera && (
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto"
          />
          
          {/* Camera Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex justify-center gap-4">
              <Button 
                onClick={capturePhoto} 
                size="lg"
                className="bg-white hover:bg-gray-100 text-black"
              >
                <Camera className="mr-2 h-5 w-5" />
                Capturer
              </Button>
              <Button 
                onClick={stopCamera} 
                variant="outline" 
                size="lg"
                className="border-white text-white hover:bg-white/20"
              >
                Annuler
              </Button>
            </div>
          </div>
          
          {/* Guide overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-white/50 rounded-lg" />
            <div className="absolute top-4 left-0 right-0 text-center">
              <p className="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded">
                Alignez l'ordonnance dans le cadre
              </p>
            </div>
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
      
      {/* Image Preview */}
      {image && (
        <div className="relative">
          <img 
            src={image} 
            alt="Ordonnance" 
            className="w-full rounded-lg border-2 border-gray-200"
          />
          
          {/* Scanning Overlay */}
          {isScanning && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm">
              <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
              <p className="text-white text-lg font-medium">
                Lecture de l'ordonnance...
              </p>
              <p className="text-white/80 text-sm mt-2">
                Cela peut prendre quelques secondes
              </p>
            </div>
          )}
          
          {/* Reset Button */}
          {!isScanning && (
            <Button
              onClick={reset}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-white/90 hover:bg-white"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      
      {/* Help Text */}
      {!image && !useCamera && (
        <div className="text-center text-sm text-muted-foreground space-y-2 pt-4">
          <p>💡 <strong>Conseil:</strong> Prenez la photo dans un endroit bien éclairé</p>
          <p>📄 Formats acceptés: JPG, PNG (max 10MB)</p>
        </div>
      )}
    </div>
  );
}
