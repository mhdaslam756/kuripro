import { useEffect, useState } from "react";
import { BellRing, Calendar, ChevronRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";

export interface DueNotificationData {
  id?: string;
  title: string;
  body: string;
  url?: string;
}

const POPUP_EVENT = "kuripro:show-due-popup";

/** Trigger the due notification popup modal from anywhere in the app */
export function triggerDuePopup(data: DueNotificationData): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(POPUP_EVENT, { detail: data }));
  }
}

export function DueNotificationPopup() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [dueData, setDueData] = useState<DueNotificationData | null>(null);
  const navigate = useNavigate();

  // ONLY members should ever see installment due reminder popups!
  // Organizations (Organizers, Staff, Super Admin) send payment due messages; they do not pay member installments.
  const isMember = user?.role?.slug === "MEMBER";

  useEffect(() => {
    function handleShowDue(event: Event) {
      if (!isMember) return;
      const customEvent = event as CustomEvent<DueNotificationData>;
      if (customEvent.detail) {
        setDueData(customEvent.detail);
        setOpen(true);
      }
    }

    window.addEventListener(POPUP_EVENT, handleShowDue);
    return () => {
      window.removeEventListener(POPUP_EVENT, handleShowDue);
    };
  }, [isMember]);

  if (!isMember || !dueData) return null;

  function handleAction() {
    setOpen(false);
    navigate(dueData?.url || "/notifications");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md rounded-3xl p-6 border border-amber-500/30 bg-bg-surface shadow-2xl animate-in zoom-in-95 duration-200">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
            <BellRing size={26} className="animate-bounce" />
          </div>
          <div className="inline-flex mx-auto items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/30">
            <AlertTriangle size={12} /> Installment Due Reminder
          </div>
          <DialogTitle className="mt-2 font-display text-lg font-bold text-text-primary">
            {dueData.title || "Payment Due Reminder"}
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            You have an installment payment pending for your chit fund.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 rounded-2xl border border-border-default/80 bg-bg-raised p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-bg-surface text-accent-primary border border-border-default">
              <Calendar size={17} />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-medium text-text-primary leading-relaxed whitespace-pre-wrap">
                {dueData.body}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-1/2 rounded-xl text-xs font-semibold"
            onClick={() => setOpen(false)}
          >
            I'll Pay Later
          </Button>
          <Button
            type="button"
            className="w-full sm:w-1/2 gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md active-bounce"
            onClick={handleAction}
          >
            Pay Now <ChevronRight size={14} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
