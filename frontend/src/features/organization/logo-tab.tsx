import { ImageOff, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import type { Organization } from "./types";
import { useUploadLogo } from "./use-organization";

export function LogoTab({ organization }: { organization: Organization }) {
  const uploadLogo = useUploadLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSuccessMessage(null);
    try {
      await uploadLogo.mutateAsync(file);
      setSuccessMessage("Logo updated");
    } catch {
      // surfaced below via uploadLogo.error
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex h-40 w-40 items-center justify-center rounded-md border border-dashed border-border-strong bg-bg-raised">
        {organization.logoUrl ? (
          <img src={organization.logoUrl} alt={`${organization.name} logo`} className="max-h-full max-w-full rounded-sm object-contain" />
        ) : (
          <ImageOff className="text-text-disabled" size={32} />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />

      {uploadLogo.isError ? (
        <p className="text-sm text-bad-fg">
          {uploadLogo.error instanceof ApiError ? uploadLogo.error.message : "Something went wrong"}
        </p>
      ) : null}
      {successMessage ? <p className="text-sm text-good-fg">{successMessage}</p> : null}

      <div>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadLogo.isPending}
        >
          <Upload size={16} />
          {uploadLogo.isPending ? "Uploading…" : "Upload new logo"}
        </Button>
      </div>
    </div>
  );
}
