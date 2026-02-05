"use client";

import { useFormStatus } from "react-dom";
import { Button, ButtonProps } from "@/components/ui/button";
import { BrandLoader } from "@/components/ui/loader-brand";

interface SubmitButtonProps extends ButtonProps {
  label?: string;
  loadingLabel?: string;
  isLoading?: boolean;
}

export function SubmitButton({
  children,
  label = "Enregistrer",
  loadingLabel = "Traitement...",
  className,
  disabled,
  isLoading: manualLoading,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isLoading = manualLoading || pending;

  return (
    <Button
      type="submit"
      disabled={isLoading || disabled}
      className={className}
      {...props}
    >
      {isLoading ? (
        <>
          <BrandLoader size="xs" className="mr-2 inline-flex" />
          {loadingLabel}
        </>
      ) : (
        children || label
      )}
    </Button>
  );
}
