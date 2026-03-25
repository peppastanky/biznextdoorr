import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle, Loader2, CreditCard, Trash2, Plus, QrCode, ChevronLeft } from "lucide-react";
import { useUser } from "../context/UserContext";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { toast } from "sonner";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const SERVER = "https://biznextdoor.onrender.com";

interface PaymentMethod {
  id: string;
  card: { brand: string; last4: string; exp_month: number; exp_year: number };
}

interface TopUpDialogProps {
  open: boolean;
  onClose: () => void;
}

function AddCardForm({ customerId, onSaved, onBack }: { customerId: string; onSaved: () => void; onBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!stripe || !elements) return;
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/create-setup-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const { clientSecret, error: serverError } = await res.json();
      if (serverError) throw new Error(serverError);
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");
      const { error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });
      if (error) throw new Error(error.message);
      toast.success("Card saved");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message || "Failed to save card");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-black/5 rounded-xl p-4">
        <CardElement
          options={{
            style: {
              base: { fontSize: "14px", color: "#000", "::placeholder": { color: "#00000040" } },
            },
          }}
        />
      </div>
      <Button className="w-full rounded-full" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Card"}
      </Button>
      <button onClick={onBack} className="w-full text-sm text-black/40 hover:text-black transition-colors flex items-center justify-center gap-1">
        <ChevronLeft className="w-3 h-3" /> Back
      </button>
    </div>
  );
}

export default function TopUpDialog({ open, onClose }: TopUpDialogProps) {
  const { user, updateWallet } = useUser();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [step, setStep] = useState<"amount" | "method" | "add-card" | "paynow" | "qr" | "success">("amount");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("amount");
    setTopUpAmount("");
    setQrImage(null);
  }, [open]);

  async function loadMethods() {
    if (!user) return;
    setMethodsLoading(true);
    try {
      const res = await fetch(`${SERVER}/get-or-create-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCustomerId(data.customerId);
      const pmRes = await fetch(`${SERVER}/list-payment-methods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: data.customerId }),
      });
      const pmData = await pmRes.json();
      setPaymentMethods(pmData.paymentMethods || []);
    } catch {
      toast.error("Could not connect to server. Try PayNow instead.");
    } finally {
      setMethodsLoading(false);
    }
  }

  function goToMethod() {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount < 1) { toast.error("Minimum top-up is $1"); return; }
    setStep("method");
    loadMethods();
  }

  async function handleChargeCard(pmId: string) {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/charge-saved-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(topUpAmount), customerId, paymentMethodId: pmId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.status === "succeeded") {
        updateWallet(parseFloat(topUpAmount));
        setStep("success");
      } else {
        throw new Error("Payment did not complete");
      }
    } catch (err) {
      toast.error((err as Error).message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  async function handlePayNow() {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/create-paynow-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(topUpAmount) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load");
      const { paymentIntent, error } = await stripe.confirmPayNowPayment(data.clientSecret, { payment_method: {} });
      if (error) throw new Error(error.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setQrImage((paymentIntent as any)?.next_action?.paynow_display_qr_code?.image_url_png || null);
      setStep("qr");
      pollingRef.current = setInterval(async () => {
        const s = await fetch(`${SERVER}/check-payment-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: data.paymentIntentId }),
        });
        const sd = await s.json();
        if (sd.status === "succeeded") {
          clearInterval(pollingRef.current!);
          updateWallet(parseFloat(topUpAmount));
          setStep("success");
        }
      }, 3000);
    } catch (err) {
      toast.error((err as Error).message || "PayNow failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCard(pmId: string) {
    try {
      await fetch(`${SERVER}/delete-payment-method`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      setPaymentMethods((prev) => prev.filter((m) => m.id !== pmId));
      toast.success("Card removed");
    } catch {
      toast.error("Failed to remove card");
    }
  }

  function handleClose() {
    if (pollingRef.current) clearInterval(pollingRef.current);
    onClose();
  }

  const AmountInput = (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-widest font-bold text-black/40">Amount (SGD)</p>
      <div className="flex items-center bg-black/5 rounded-xl overflow-hidden">
        <span className="pl-4 text-black/40 font-medium text-sm select-none">$</span>
        <input
          type="number"
          min="1"
          placeholder="0.00"
          value={topUpAmount}
          onChange={(e) => setTopUpAmount(e.target.value)}
          className="flex-1 bg-transparent py-3 pr-4 pl-1 text-sm font-semibold outline-none placeholder:text-black/20"
        />
      </div>
      <div className="flex gap-2">
        {[10, 20, 50, 100].map((p) => (
          <button
            key={p}
            onClick={() => setTopUpAmount(String(p))}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              topUpAmount === String(p) ? "bg-black text-white" : "bg-black/5 hover:bg-black hover:text-white"
            }`}
          >
            ${p}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="rounded-3xl border-black/5 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tighter">
            {step === "success" ? "Top Up Successful" : "Top Up Wallet"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Enter amount */}
        {step === "amount" && (
          <div className="space-y-6 pt-2">
            {AmountInput}
            <Button className="w-full rounded-full" onClick={goToMethod} disabled={!topUpAmount}>
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Choose payment method */}
        {step === "method" && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest font-bold text-black/40">Pay With</p>
              <p className="text-sm font-bold">${topUpAmount}</p>
            </div>

            {methodsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-black/30" />
              </div>
            ) : (
              <div className="space-y-2">
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className="flex items-center gap-3 p-3 bg-black/5 rounded-xl">
                    <CreditCard className="w-4 h-4 text-black/40 shrink-0" strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold capitalize">{pm.card.brand} •••• {pm.card.last4}</p>
                      <p className="text-xs text-black/40">Expires {pm.card.exp_month}/{pm.card.exp_year}</p>
                    </div>
                    <button
                      onClick={() => handleChargeCard(pm.id)}
                      disabled={loading}
                      className="text-xs font-semibold bg-black text-white px-3 py-1.5 rounded-full hover:opacity-80 disabled:opacity-30 transition-all"
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Pay"}
                    </button>
                    <button onClick={() => handleDeleteCard(pm.id)} className="text-black/20 hover:text-black/60 transition-colors">
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => setStep("add-card")}
                  className="w-full flex items-center gap-3 p-3 border-2 border-dashed border-black/10 rounded-xl hover:border-black/30 transition-all duration-200"
                >
                  <Plus className="w-4 h-4 text-black/40" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-black/60">Add a card</span>
                </button>

                <button
                  onClick={handlePayNow}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-3 border-2 border-dashed border-black/10 rounded-xl hover:border-black/30 transition-all duration-200"
                >
                  <QrCode className="w-4 h-4 text-black/40" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-black/60">
                    {loading ? "Generating QR..." : "Pay with PayNow"}
                  </span>
                </button>
              </div>
            )}

            <button onClick={() => setStep("amount")} className="w-full text-sm text-black/40 hover:text-black transition-colors flex items-center justify-center gap-1">
              <ChevronLeft className="w-3 h-3" /> Back
            </button>
          </div>
        )}

        {/* Step 3a: Add card */}
        {step === "add-card" && customerId && (
          <div className="pt-2">
            <Elements stripe={stripePromise}>
              <AddCardForm
                customerId={customerId}
                onSaved={() => { loadMethods(); setStep("method"); }}
                onBack={() => setStep("method")}
              />
            </Elements>
          </div>
        )}

        {/* Step 3b: PayNow QR */}
        {step === "qr" && (
          <div className="space-y-4 pt-2 text-center">
            <p className="text-sm text-black/60">
              Scan with your banking app to pay <span className="font-bold text-black">${topUpAmount}</span> via PayNow.
            </p>
            {qrImage ? (
              <img src={qrImage} alt="PayNow QR" className="mx-auto w-48 h-48 rounded-2xl" />
            ) : (
              <div className="mx-auto w-48 h-48 rounded-2xl bg-black/5 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-black/30" />
              </div>
            )}
            <p className="text-xs text-black/40">Waiting for payment confirmation...</p>
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-black/20 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="space-y-4 pt-2 text-center">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-black" strokeWidth={1.5} />
            </div>
            <p className="text-black/60">
              <span className="font-bold text-black">${topUpAmount}</span> has been added to your wallet.
            </p>
            <p className="text-2xl font-bold tracking-tighter">${user?.wallet?.toFixed(2)}</p>
            <p className="text-xs text-black/40">New Balance</p>
            <Button className="w-full rounded-full mt-2" onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
