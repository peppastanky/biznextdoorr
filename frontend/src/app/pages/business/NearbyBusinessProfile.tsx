import { useParams } from "react-router";
import { useEffect, useState, useMemo } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Star, MapPin, CheckCircle2, Sparkles, RefreshCw } from "lucide-react";
import { mockBusinesses, mockProducts, mockServices, mockReviewsByBusiness } from "../../data/mockData";
import { useReviews } from "../../context/ReviewContext";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className="w-3.5 h-3.5" fill={rating >= s ? "#000" : "none"} strokeWidth={1.5} />
      ))}
    </div>
  );
}

function useGeminiInsights(businessName: string, reviews: { rating: number; text: string }[]) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (reviews.length === 0) return;
    setLoading(true);
    setError(null);
    setSummary(null);

    const reviewText = reviews
      .map((r, i) => `Review ${i + 1} (${r.rating}/5): "${r.text}"`)
      .join("\n");

    const prompt = `You are a business analyst. Based solely on the following customer reviews for "${businessName}", write a concise 3-sentence insight summary covering: overall sentiment, what customers love most, and one area for improvement. Be specific and use evidence from the reviews. Do not use bullet points — write in flowing prose.\n\n${reviewText}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) setSummary(text.trim());
      else setError("Could not generate summary.");
    } catch {
      setError("Failed to connect to Gemini.");
    } finally {
      setLoading(false);
    }
  };

  return { summary, loading, error, generate };
}

export default function NearbyBusinessProfile() {
  const { id } = useParams();
  const business = mockBusinesses.find((b) => b.id === id);
  const { reviews: userReviews } = useReviews();
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  if (!business) {
    return <div className="max-w-7xl mx-auto px-6 py-12"><p>Business not found</p></div>;
  }

  const businessProducts = mockProducts.filter((p) => p.businessId === id);
  const businessServices = mockServices.filter((s) => s.businessId === id);

  const baseReviews = mockReviewsByBusiness[id!] ?? [];
  const businessItemIds = [...businessProducts.map((p) => p.id), ...businessServices.map((s) => s.id)];
  const allReviews = [
    ...baseReviews,
    ...userReviews.filter((r) => businessItemIds.includes(r.id)).map((r) => ({ ...r, author: "you" })),
  ];

  const sortedReviews = useMemo(() => {
    return [...allReviews].sort((a, b) => {
      if (sortBy === "highest") return b.rating - a.rating;
      if (sortBy === "lowest") return a.rating - b.rating;
      if (sortBy === "oldest") return a.date.localeCompare(b.date);
      return b.date.localeCompare(a.date);
    });
  }, [sortBy, userReviews, id]);

  const avgRating = allReviews.length
    ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)
    : business.rating;

  const { summary, loading, error, generate } = useGeminiInsights(business.name, allReviews);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">

      {/* Header */}
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-1">
          <img src={business.image} alt={business.name} className="w-full aspect-square object-cover rounded-3xl" />
        </div>
        <div className="col-span-2 flex flex-col justify-center">
          <div className="flex items-start gap-3 mb-3">
            <h1 className="text-5xl font-bold tracking-tighter leading-tight">{business.name}</h1>
            {business.verified && <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-2" />}
          </div>
          <p className="text-lg text-black/60 mb-6">{business.description}</p>
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-black" />
              <span className="font-semibold">{avgRating}</span>
              <span className="text-black/40">({allReviews.length} reviews)</span>
            </div>
            {business.verified && (
              <div className="flex items-center gap-2 text-blue-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Verified Business</span>
              </div>
            )}
          </div>
          <div className="flex items-start gap-2 text-black/60">
            <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{business.address}</span>
          </div>
        </div>
      </div>

      {/* Products & Services */}
      <Tabs defaultValue="products">
        <TabsList className="bg-black/5 p-2 rounded-full mb-8">
          <TabsTrigger value="products" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
            Products ({businessProducts.length})
          </TabsTrigger>
          <TabsTrigger value="services" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
            Services ({businessServices.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          {businessProducts.length === 0 ? (
            <Card className="p-12 text-center text-black/40 rounded-3xl">No products available</Card>
          ) : (
            <div className="grid grid-cols-4 gap-6">
              {businessProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden rounded-3xl border border-black/5">
                  <div className="aspect-square overflow-hidden">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold mb-2 line-clamp-1">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <p className="font-medium">${product.price}</p>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3 h-3 fill-black" />{product.rating}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="services">
          {businessServices.length === 0 ? (
            <Card className="p-12 text-center text-black/40 rounded-3xl">No services available</Card>
          ) : (
            <div className="grid grid-cols-4 gap-6">
              {businessServices.map((service) => (
                <Card key={service.id} className="overflow-hidden rounded-3xl border border-black/5">
                  <div className="aspect-square overflow-hidden">
                    <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold mb-2 line-clamp-1">{service.name}</h3>
                    <div className="flex items-center justify-between">
                      <p className="font-medium">${service.price}</p>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3 h-3 fill-black" />{service.rating}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* AI Insights */}
      <div>
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-black/40">AI Insights</p>
        </div>
        <Card className="p-8 border border-black/5 rounded-3xl bg-black/5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-black/50" strokeWidth={1.5} />
                <h3 className="text-xl font-bold tracking-tighter">Review Summary</h3>
              </div>
              <p className="text-[10px] text-black/30 uppercase tracking-widest font-semibold mb-5">
                Generated by Gemini AI · Based on {allReviews.length} reviews
              </p>

              {!summary && !loading && !error && (
                <p className="text-sm text-black/40 leading-relaxed">
                  Generate an AI-powered summary of what customers are saying about this business.
                </p>
              )}
              {loading && (
                <div className="space-y-2">
                  <div className="h-3 bg-black/10 rounded-full animate-pulse w-full" />
                  <div className="h-3 bg-black/10 rounded-full animate-pulse w-5/6" />
                  <div className="h-3 bg-black/10 rounded-full animate-pulse w-4/6" />
                </div>
              )}
              {summary && !loading && (
                <p className="text-sm text-black/70 leading-relaxed">{summary}</p>
              )}
              {error && !loading && (
                <p className="text-sm text-red-400">{error}</p>
              )}
            </div>

            <Button
              onClick={generate}
              disabled={loading}
              className="rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:opacity-90 shrink-0 flex items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {summary ? "Regenerate" : "Generate"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Reviews */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-black/40 mb-2">Reviews</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tighter">{avgRating}</h2>
              <div>
                <StarRow rating={Math.round(Number(avgRating))} />
                <p className="text-xs text-black/40 mt-1">{allReviews.length} reviews</p>
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
