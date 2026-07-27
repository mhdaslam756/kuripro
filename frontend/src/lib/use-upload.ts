import { useMutation } from "@tanstack/react-query";

import { api } from "./api-client";

/** Uploads a file to Cloudinary via the shared /uploads endpoint, returning its url + publicId. */
export function useUpload() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.postForm<{ url: string; publicId: string }>("/uploads", form);
    },
  });
}
