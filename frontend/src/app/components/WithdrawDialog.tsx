import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useUser } from "../context/UserContext";
import { toast } from "sonner";

interface WithdrawDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function WithdrawDialog({ open, onClose }: WithdrawDialogProps) {
  const { user, updateWallet } = useUser();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"amount" | "success">("amount");
  const [loading, setLoading] = useState(false);

  const balance = user?.wallet || 0;

  async function handleWithdraw() {
    const value = parseFloat(amount);
    if (!value || value < 1) { toast.error("Minimum withdrawal is $1"); return; }
    if (value > balance) { toast.error("Insufficient balance"); return; }
    setLoading(true);
    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 1500));
    updateWallet(-value);
    setStep("success");
    setLoading(false);
  }

  function handleClose() {
    setStep("amount");
    setAmount("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="rounded-3xl border-black/5 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tighter">
            {step === "success" ? "Withdrawal Requested" : "Withdraw Funds"}
          </DialogTitle>
        </DialogHeader>

        {step === "amount" && (
          <div className="space-y-6 pt-2">
            <div className="p-4 bg-black/5 rounded-2xl flex items-center justify-between">
              <p className="text-xs text-black/40 font-semibold uppercase tracking-widest">Available</p>
              <p className="text-lg font-bold tracking-tight">${balance.toFixed(2)}</p>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-black/40">Amount (SGD)</p>
              <div className="relative flex items-center bg-black/5 rounded-xl overflow-hidden">
                <span className="pl-4 text-black/40 font-medium text-sm select-none">$</span>
                <input
                  type="number"
                  min="1"
                  max={balance}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 bg-transparent py-3 pr-4 pl-1 text-sm font-semibold outline-none placeholder:text-black/20"
                />
              </div>
              <div className="flex gap-2">
                {[10, 50, 100, balance].map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setAmount(String(p))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      amount === String(p) ? "bg-black text-white" : "bg-black/5 hover:bg-black hover:text-white"
                    }`}
                  >
                    {i === 3 ? "All" : `$${p}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-black/3 border border-black/5 rounded-2xl">
              <p className="text-xs text-black/40 leading-relaxed">
                Withdrawals are processed within 3–5 business days to your registered bank account.
              </p>
            </div>

            <Button
              className="w-full rounded-full"
              onClick={handleWithdraw}
              disabled={loading || !amount || parseFloat(amount) > balance}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request Withdrawal"}
            </Button>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4 pt-2 text-center">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-black" strokeWidth={1.5} />
            </div>
            <p className="text-black/60">
              Your withdrawal of <span className="font-bold text-black">${amount}</span> has been submitted.
            </p>
            <p className="text-xs text-black/40">Funds will arrive within 3–5 business days.</p>
            <p className="text-2xl font-bold tracking-tighter">${user?.wallet?.toFixed(2)}</p>
            <p className="text-xs text-black/40">Remaining Balance</p>
            <Button className="w-full rounded-full mt-2" onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
