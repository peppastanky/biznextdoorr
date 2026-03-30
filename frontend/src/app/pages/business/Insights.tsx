import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "react-router";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DollarSign, Users, Eye, TrendingUp, Star, Send, Bot } from "lucide-react";
import { mockReviewsByBusiness } from "../../data/mockData";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Use b1 as the mock business owner's reviews
const BUSINESS_REVIEWS = mockReviewsByBusiness["b1"] ?? [];

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className="w-3.5 h-3.5" fill={rating >= s ? "#000" : "none"} strokeWidth={1.5} />
      ))}
    </div>
  );
}

export default function Insights() {
  const location = useLocation();
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your AI business assistant. Ask me anything about your revenue, customers, top products, or how to improve your performance.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.hash === "#reviews") {
      setTimeout(() => {
        const el = document.getElementById("reviews");
        if (el) window.scrollTo({ top: el.offsetTop - 90, behavior: "smooth" });
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  const sortedReviews = useMemo(() => {
    return [...BUSINESS_REVIEWS].sort((a, b) => {
      if (sortBy === "highest") return b.rating - a.rating;
      if (sortBy === "lowest") return a.rating - b.rating;
      if (sortBy === "oldest") return a.date.localeCompare(b.date);
      return b.date.localeCompare(a.date);
    });
  }, [sortBy]);

  useEffect(() => {
    if (chatMessages.length > 1) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const revenueData = [
    { month: "Jan", revenue: 8500 },
    { month: "Feb", revenue: 9200 },
    { month: "Mar", revenue: 12450 },
  ];

  const customerData = [
    { month: "Jan", new: 45, returning: 28 },
    { month: "Feb", new: 52, returning: 35 },
    { month: "Mar", new: 68, returning: 42 },
  ];

  const topProducts = [
    {
      name: "Chocolate Cake",
      revenue: 1575,
      quantity: 45,
      customers: 42,
      satisfaction: 4.9,
      viewRate: 85,
      clickRate: 68,
      conversionRate: 72,
    },
    {
      name: "Gel Manicure",
      revenue: 1520,
      quantity: 38,
      customers: 38,
      satisfaction: 4.9,
      viewRate: 92,
      clickRate: 75,
      conversionRate: 81,
    },
    {
      name: "Pedicure Service",
      revenue: 1120,
      quantity: 30,
      customers: 30,
      satisfaction: 4.8,
      viewRate: 78,
      clickRate: 62,
      conversionRate: 65,
    },
  ];

  const businessContext = `
You are an AI business assistant for a small business on BizNextDoor, a local neighbourhood marketplace.
Here is the business's current data:

REVENUE:
- Jan: $8,500 | Feb: $9,200 | Mar: $12,450 (total this quarter: $30,150, +18%)

CUSTOMERS:
- Total: 234 | New this month: 68 | Returning: 42% rate

PROFILE:
- Visits: 1,845 (+12% this month) | Conversion rate: 68% (+3%)

TOP PRODUCTS:
1. Chocolate Cake — $1,575 revenue, 45 sold, 4.9★, 72% conversion, 85% view rate
2. Gel Manicure — $1,520 revenue, 38 sold, 4.9★, 81% conversion, 92% view rate
3. Pedicure Service — $1,120 revenue, 30 sold, 4.8★, 65% conversion, 78% view rate

Be concise, friendly, and actionable. Keep responses under 4 sentences. Focus on practical advice.
`;

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || aiLoading) return;
    const userMsg = inputMessage.trim();
    setInputMessage("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setAiLoading(true);

    try {
      const history = chatMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: businessContext }] },
          contents: [...history, { role: "user", parts: [{ text: userMsg }] }],
        }),
      });

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response. Try again.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-12">
        <p className="text-[10px] uppercase tracking-widest font-bold text-black/40 mb-2">Analytics</p>
        <h1 className="text-5xl font-bold tracking-tighter leading-tight">Insights</h1>
      </div>

      {/* Overall Metrics */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        <Card className="p-6 border border-black/5 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-black/60">Total Revenue</p>
            <DollarSign className="w-5 h-5 text-black/30" />
          </div>
          <p className="text-3xl mb-1">$30,150</p>
          <p className="text-sm text-green-600">+18% this quarter</p>
        </Card>

        <Card className="p-6 border border-black/5 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-black/60">Total Customers</p>
            <Users className="w-5 h-5 text-black/30" />
          </div>
          <p className="text-3xl mb-1">234</p>
          <p className="text-sm text-black/60">68 new this month</p>
        </Card>

        <Card className="p-6 border border-black/5 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-black/60">Profile Visits</p>
            <Eye className="w-5 h-5 text-black/30" />
          </div>
          <p className="text-3xl mb-1">1,845</p>
          <p className="text-sm text-green-600">+12% this month</p>
        </Card>

        <Card className="p-6 border border-black/5 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-black/60">Conversion Rate</p>
            <TrendingUp className="w-5 h-5 text-black/30" />
          </div>
          <p className="text-3xl mb-1">68%</p>
          <p className="text-sm text-green-600">+3% this month</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-8 mb-12">
        <Card className="p-6 border border-black/5 rounded-3xl shadow-sm">
          <h2 className="text-2xl font-bold tracking-tighter mb-6">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#000" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 border border-black/5 rounded-3xl shadow-sm">
          <h2 className="text-2xl font-bold tracking-tighter mb-6">Customer Acquisition</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={customerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="new" fill="#000" name="New Customers" />
              <Bar dataKey="returning" fill="#666" name="Returning" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Product/Service Metrics */}
      <Card className="p-6 mb-8 border border-black/5 rounded-3xl shadow-sm">
        <h2 className="text-2xl font-bold tracking-tighter mb-6">Top Performers</h2>
        <div className="space-y-4">
          {topProducts.map((item, index) => (
            <div key={index} className="border border-black/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center">
                  {index + 1}
                </div>
                <h3 className="text-lg">{item.name}</h3>
              </div>

              <div className="grid grid-cols-4 gap-6 text-sm">
                <div>
                  <p className="text-black/60 mb-1">Revenue</p>
                  <p className="text-xl font-medium">${item.revenue}</p>
                  <p className="text-black/40">
                    {((item.revenue / 30150) * 100).toFixed(1)}% of total
                  </p>
                </div>
                <div>
                  <p className="text-black/60 mb-1">Quantity Sold</p>
                  <p className="text-xl font-medium">{item.quantity}</p>
                  <p className="text-black/40">{item.customers} customers</p>
                </div>
                <div>
                  <p className="text-black/60 mb-1">Satisfaction</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-black" />
                    <p className="text-xl font-medium">{item.satisfaction}</p>
                  </div>
                  <p className="text-black/40">Highly rated</p>
                </div>
                <div>
                  <p className="text-black/60 mb-1">Conversion</p>
                  <p className="text-xl font-medium">{item.conversionRate}%</p>
                  <p className="text-black/40">
                    {item.viewRate}% view, {item.clickRate}% click
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Chatbot */}
      <div className="rounded-3xl bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500 p-[1.5px] shadow-sm">
        <div className="rounded-[22px] bg-white overflow-hidden">

          {/* Header */}
          <div className="px-8 py-5 border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-black/40" strokeWidth={1.5} />
              <div>
                <h2 className="text-lg font-bold tracking-tighter text-black">Gemini AI Business Assistant</h2>
                <p className="text-[10px] uppercase tracking-widest font-semibold bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">Powered by Gemini</p>
              </div>
            </div>
          </div>

          {/* Chat messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4 bg-black/[0.02]">
            {chatMessages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-black text-white"
                    : "bg-white border border-black/5 text-black/70 shadow-sm"
                }`}>
                  {message.content}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-black/5 shadow-sm px-4 py-3 rounded-2xl flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-3 px-6 py-4 bg-white border-t border-black/5">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask Gemini about your business insights..."
              disabled={aiLoading}
              className="bg-black/5 border-none rounded-full focus:ring-2 focus:ring-black/10 text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={aiLoading}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Footer hint */}
          <p className="text-[10px] text-black/30 text-center pb-4 tracking-wide">
            Try: "How's my revenue?", "What should I improve?", "Who are my best customers?"
          </p>

        </div>
      </div>

      {/* Reviews */}
      <div id="reviews" className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-black/40 mb-2">Customer Feedback</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tighter">
                {(BUSINESS_REVIEWS.reduce((s, r) => s + r.rating, 0) / BUSINESS_REVIEWS.length).toFixed(1)}
              </h2>
              <div>
                <StarRow rating={Math.round(BUSINESS_REVIEWS.reduce((s, r) => s + r.rating, 0) / BUSINESS_REVIEWS.length)} />
                <p className="text-xs text-black/40 mt-1">{BUSINESS_REVIEWS.length} reviews</p>
              </div>
            </div>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44 rounded-full bg-black/5 border-none h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-black/5">
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="highest">Highest rated</SelectItem>
              <SelectItem value="lowest">Lowest rated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {sortedReviews.map((review) => (
            <Card key={review.id} className="p-5 border border-black/5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-xs font-bold text-black/50">
                    {review.author[0].toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm">@{review.author}</span>
                </div>
                <span className="text-xs text-black/30">{review.date}</span>
              </div>
              <StarRow rating={review.rating} />
              {review.text && (
                <p className="text-sm text-black/60 leading-relaxed mt-3">{review.text}</p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
