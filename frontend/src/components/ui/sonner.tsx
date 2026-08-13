import { Toaster as Sonner, toast } from "sonner";
import { useTheme } from "@/lib/theme-context";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { mode } = useTheme();

  return (
    <Sonner
      theme={mode === "dark" ? "dark" : "light"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-bg-surface group-[.toaster]:text-text-primary group-[.toaster]:border-border-default group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:font-sans group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:text-xs",
          description: "group-[.toast]:text-text-secondary group-[.toast]:text-[11px]",
          actionButton:
            "group-[.toast]:bg-accent-primary group-[.toast]:text-text-on-brand group-[.toast]:rounded-xl group-[.toast]:font-semibold",
          cancelButton:
            "group-[.toast]:bg-bg-raised group-[.toast]:text-text-secondary group-[.toast]:rounded-xl",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
