"use client";

import { UploadButton } from "@/lib/uploadthing";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { useState } from "react";
import Image from "next/image";
import { X, Upload } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
}

export function ImageUpload({ value, onChange, onRemove }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="space-y-4">
      {value ? (
        <div className="relative w-40 h-40 rounded-lg overflow-hidden border-2 border-slate-200 group">
          <Image
            src={value}
            alt="Uploaded image"
            fill
            className="object-cover"
          />
          {onRemove && (
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
            <Upload className="h-10 w-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600 mb-4">
              {isUploading ? "Uploading..." : "Click to upload image"}
            </p>
            <UploadButton
              endpoint="imageUploader"
              onClientUploadComplete={(res) => {
                if (res?.[0]?.url) {
                  onChange(res[0].url);
                  toast.success("Image uploaded successfully!");
                }
                setIsUploading(false);
              }}
              onUploadError={(error: Error) => {
                toast.error(`Upload failed: ${error.message}`);
                setIsUploading(false);
              }}
              onUploadBegin={() => {
                setIsUploading(true);
              }}
              appearance={{
                button:
                  "ut-ready:bg-blue-600 ut-ready:hover:bg-blue-700 ut-uploading:bg-blue-500 ut-uploading:cursor-not-allowed text-sm font-medium px-4 py-2 rounded-md transition-colors",
                allowedContent: "text-xs text-slate-500",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
