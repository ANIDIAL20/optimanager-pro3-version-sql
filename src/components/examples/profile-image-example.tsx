"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/ui/image-upload";
import { updateUserImage, removeUserImage } from "@/app/actions/user-actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function ProfileImageExample() {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleImageChange = async (url: string) => {
    setImageUrl(url);
    setIsUpdating(true);

    const result = await updateUserImage(url);

    if (result.success) {
      toast.success("Profile image updated!");
    } else {
      toast.error(result.error || "Failed to update image");
    }

    setIsUpdating(false);
  };

  const handleRemoveImage = async () => {
    setIsUpdating(true);

    const result = await removeUserImage();

    if (result.success) {
      setImageUrl("");
      toast.success("Profile image removed!");
    } else {
      toast.error(result.error || "Failed to remove image");
    }

    setIsUpdating(false);
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Profile Image</h2>

      <ImageUpload
        value={imageUrl}
        onChange={handleImageChange}
        onRemove={handleRemoveImage}
      />

      {isUpdating && (
        <p className="text-sm text-slate-500 mt-2">Updating...</p>
      )}
    </div>
  );
}
