import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deletePasskey, listPasskeys, registerPasskey } from "@/lib/webauthn";

export function usePasskeys() {
  return useQuery({ queryKey: ["passkeys"], queryFn: listPasskeys });
}

export function useAddPasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deviceLabel?: string) => registerPasskey(deviceLabel),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["passkeys"] }),
  });
}

export function useDeletePasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePasskey(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["passkeys"] }),
  });
}
