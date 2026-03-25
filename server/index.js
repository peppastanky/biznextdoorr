const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

// ── PayNow top-up ────────────────────────────────────────────────────────────

app.post("/create-paynow-intent", async (req, res) => {
  const { amount } = req.body;
  if (!amount || typeof amount !== "number" || amount < 1) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "sgd",
      payment_method_types: ["paynow"],
    });
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/check-payment-status", async (req, res) => {
  const { paymentIntentId } = req.body;
  if (!paymentIntentId) {
    return res.status(400).json({ error: "Missing paymentIntentId" });
  }
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    res.json({ status: paymentIntent.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Stripe Customer + saved cards ────────────────────────────────────────────

// Create or retrieve a Stripe customer for a user
app.post("/get-or-create-customer", async (req, res) => {
  const { userId, email } = req.body;
  if (!userId || !email) {
    return res.status(400).json({ error: "Missing userId or email" });
  }
  try {
    // Search for existing customer by metadata
    const existing = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
    });
    if (existing.data.length > 0) {
      return res.json({ customerId: existing.data[0].id });
    }
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    res.json({ customerId: customer.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a SetupIntent to save a card
app.post("/create-setup-intent", async (req, res) => {
  const { customerId } = req.body;
  if (!customerId) {
    return res.status(400).json({ error: "Missing customerId" });
  }
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });
    res.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List saved payment methods for a customer
app.post("/list-payment-methods", async (req, res) => {
  const { customerId } = req.body;
  if (!customerId) {
    return res.status(400).json({ error: "Missing customerId" });
  }
  try {
    const methods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });
    res.json({ paymentMethods: methods.data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a saved payment method
app.post("/delete-payment-method", async (req, res) => {
  const { paymentMethodId } = req.body;
  if (!paymentMethodId) {
    return res.status(400).json({ error: "Missing paymentMethodId" });
  }
  try {
    await stripe.paymentMethods.detach(paymentMethodId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Charge a saved card for top-up
app.post("/charge-saved-card", async (req, res) => {
  const { amount, customerId, paymentMethodId } = req.body;
  if (!amount || !customerId || !paymentMethodId) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "sgd",
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
    });
    res.json({ status: paymentIntent.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
