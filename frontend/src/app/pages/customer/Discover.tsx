import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Search, Star, MapPin, LocateFixed } from "lucide-react";
import { mockProducts, mockServices, categories, mockBusinesses } from "../../data/mockData";
import { motion } from "motion/react";
import BusinessMap from "../../components/BusinessMap";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Discover() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "products");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [priceRange, setPriceRange] = useState("all");
  const [distanceFilter, setDistanceFilter] = useState("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");

  useEffect(() => {
    const tab = searchParams.get("tab");
    const query = searchParams.get("q");
    if (tab) setActiveTab(tab);
    if (query) setSearchQuery(query);
  }, [searchParams]);

  useEffect(() => {
    if (!navigator.geolocation) { setLocationStatus("denied"); return; }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied")
    );
  }, []);

  const getBusinessDistance = (businessId: string) => {
    if (!userLocation) return null;
    const biz = mockBusinesses.find((b) => b.id === businessId);
    if (!biz) return null;
    return haversineKm(userLocation.lat, userLocation.lng, biz.location.lat, biz.location.lng);
  };

  const filterItems = (items: any[]) => {
    return items.filter((item) => {
      const matchesSearch = searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesPrice =
        priceRange === "all" ||
        (priceRange === "0-25" && item.price <= 25) ||
        (priceRange === "25-50" && item.price > 25 && item.price <= 50) ||
        (priceRange === "50+" && item.price > 50);
      let matchesDistance = true;
      if (distanceFilter !== "all" && userLocation) {
        const dist = getBusinessDistance(item.businessId);
        const maxKm = parseFloat(distanceFilter);
        matchesDistance = dist !== null && dist <= maxKm;
      }
      return matchesSearch && matchesCategory && matchesPrice && matchesDistance;
    });
  };

  const filteredProducts = filterItems(mockProducts);
  const filteredServices = filterItems(mockServices);

  return (
    <div className="max-w-7xl mx-auto px-6 py-24">
      <div className="mb-12">
        <p className="text-[10px] uppercase tracking-widest font-bold text-black/40 mb-2">Explore</p>
        <h1 className="text-5xl font-bold tracking-tighter leading-tight">Discover</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex justify-center">
          <TabsList className="bg-black/5 p-2 rounded-full">
            <TabsTrigger value="products" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-12">
              Products
            </TabsTrigger>
            <TabsTrigger value="services" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-12">
              Services
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="products" className="space-y-12">
          {/* Map Section */}
          <Card className="p-8 border border-black/5 rounded-3xl bg-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-black/40 mb-2">Location</p>
                <h1 className="text-2xl font-bold tracking-tighter">Explore Businesses</h1>
                <p className="text-xs text-black/40 mt-1">Hover over a pin to preview, click to visit the business.</p>
              </div>
              <div className="flex items-center gap-2">
                {locationStatus === "granted" && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-500 font-semibold bg-blue-50 px-3 py-1.5 rounded-full">
                    <LocateFixed className="w-3.5 h-3.5" />
                    Location on
                  </div>
                )}
                {locationStatus === "denied" && (
                  <div className="flex items-center gap-1.5 text-xs text-black/30 font-semibold bg-black/5 px-3 py-1.5 rounded-full">
                    <MapPin className="w-3.5 h-3.5" />
                    Location off
                  </div>
                )}
                {locationStatus === "loading" && (
                  <div className="flex items-center gap-1.5 text-xs text-black/30 font-semibold bg-black/5 px-3 py-1.5 rounded-full animate-pulse">
                    <LocateFixed className="w-3.5 h-3.5" />
                    Locating...
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white border border-black/10 rounded-3xl h-[480px] overflow-hidden">
              <BusinessMap businesses={mockBusinesses} userLocation={userLocation} />
            </div>
          </Card>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
              <Input
                placeholder="Search products..."
                className="pl-11 bg-black/5 border-none rounded-full h-11 focus:ring-2 focus:ring-black/10 transition-all duration-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 bg-black/5 border-none rounded-full h-11">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="border-black/5 rounded-3xl">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="rounded-xl">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-48 bg-black/5 border-none rounded-full h-11">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent className="border-black/5 rounded-3xl">
                <SelectItem value="all" className="rounded-xl">All Prices</SelectItem>
                <SelectItem value="0-25" className="rounded-xl">$0 - $25</SelectItem>
                <SelectItem value="25-50" className="rounded-xl">$25 - $50</SelectItem>
                <SelectItem value="50+" className="rounded-xl">$50+</SelectItem>
              </SelectContent>
            </Select>
            <Select value={distanceFilter} onValueChange={setDistanceFilter} disabled={!userLocation}>
              <SelectTrigger className="w-48 bg-black/5 border-none rounded-full h-11 disabled:opacity-40">
                <SelectValue placeholder="Distance" />
              </SelectTrigger>
              <SelectContent className="border-black/5 rounded-3xl">
                <SelectItem value="all" className="rounded-xl">Any Distance</SelectItem>
                <SelectItem value="1" className="rounded-xl">Within 1 km</SelectItem>
                <SelectItem value="3" className="rounded-xl">Within 3 km</SelectItem>
                <SelectItem value="5" className="rounded-xl">Within 5 km</SelectItem>
                <SelectItem value="10" className="rounded-xl">Within 10 km</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {filteredProducts.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i % 8) * 0.05 }}
              >
                <Link to={`/customer/product/${product.id}`} className="group block">
                  <Card className="overflow-hidden border border-black/5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold mb-1 line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-black/40 mb-3">{product.businessName}</p>
                      <div className="flex items-center justify-between">
                        <p className="font-bold">${product.price}</p>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-3 h-3 fill-black" />
                          <span className="font-bold">{product.rating}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-24 text-black/40">
              <p className="text-lg">No products found matching your criteria</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-12">
          {/* Map Section */}
          <Card className="p-8 border border-black/5 rounded-3xl bg-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-black/40 mb-2">Location</p>
                <h3 className="text-2xl font-bold tracking-tighter">Explore on the Map</h3>
                <p className="text-xs text-black/40 mt-1">Hover over a pin to preview, click to visit the business.</p>
              </div>
              <div className="flex items-center gap-2">
                {locationStatus === "granted" && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-500 font-semibold bg-blue-50 px-3 py-1.5 rounded-full">
                    <LocateFixed className="w-3.5 h-3.5" />
                    Location on
                  </div>
                )}
                {locationStatus === "denied" && (
                  <div className="flex items-center gap-1.5 text-xs text-black/30 font-semibold bg-black/5 px-3 py-1.5 rounded-full">
                    <MapPin className="w-3.5 h-3.5" />
                    Location off
                  </div>
                )}
                {locationStatus === "loading" && (
                  <div className="flex items-center gap-1.5 text-xs text-black/30 font-semibold bg-black/5 px-3 py-1.5 rounded-full animate-pulse">
                    <LocateFixed className="w-3.5 h-3.5" />
                    Locating...
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white border border-black/10 rounded-3xl h-[480px] overflow-hidden">
              <BusinessMap businesses={mockBusinesses} userLocation={userLocation} />
            </div>
          </Card>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
              <Input
                placeholder="Search services..."
                className="pl-11 bg-black/5 border-none rounded-full h-11 focus:ring-2 focus:ring-black/10 transition-all duration-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 bg-black/5 border-none rounded-full h-11">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="border-black/5 rounded-3xl">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="rounded-xl">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-48 bg-black/5 border-none rounded-full h-11">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent className="border-black/5 rounded-3xl">
                <SelectItem value="all" className="rounded-xl">All Prices</SelectItem>
                <SelectItem value="0-25" className="rounded-xl">$0 - $25</SelectItem>
                <SelectItem value="25-50" className="rounded-xl">$25 - $50</SelectItem>
                <SelectItem value="50+" className="rounded-xl">$50+</SelectItem>
              </SelectContent>
            </Select>
            <Select value={distanceFilter} onValueChange={setDistanceFilter} disabled={!userLocation}>
              <SelectTrigger className="w-48 bg-black/5 border-none rounded-full h-11 disabled:opacity-40">
                <SelectValue placeholder="Distance" />
              </SelectTrigger>
              <SelectContent className="border-black/5 rounded-3xl">
                <SelectItem value="all" className="rounded-xl">Any Distance</SelectItem>
                <SelectItem value="1" className="rounded-xl">Within 1 km</SelectItem>
                <SelectItem value="3" className="rounded-xl">Within 3 km</SelectItem>
                <SelectItem value="5" className="rounded-xl">Within 5 km</SelectItem>
                <SelectItem value="10" className="rounded-xl">Within 10 km</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {filteredServices.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i % 8) * 0.05 }}
              >
                <Link to={`/customer/service/${service.id}`} className="group block">
                  <Card className="overflow-hidden border border-black/5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={service.image}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold mb-1 line-clamp-1">{service.name}</h3>
                      <p className="text-sm text-black/40 mb-3">{service.businessName}</p>
                      <div className="flex items-center justify-between">
                        <p className="font-bold">${service.price}</p>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-3 h-3 fill-black" />
                          <span className="font-bold">{service.rating}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {filteredServices.length === 0 && (
            <div className="text-center py-24 text-black/40">
              <p className="text-lg">No services found matching your criteria</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
