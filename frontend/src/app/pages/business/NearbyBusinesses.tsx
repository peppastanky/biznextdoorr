import { Link } from "react-router";
import { Card } from "../../components/ui/card";
import { Star, MapPin, CheckCircle2 } from "lucide-react";
import { mockBusinesses } from "../../data/mockData";
import { motion } from "motion/react";
import BusinessMap from "../../components/BusinessMap";

export default function NearbyBusinesses() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-24">
      <div className="mb-12">
        <p className="text-[10px] uppercase tracking-widest font-bold text-black/40 mb-2">See what other businesses are posting</p>
        <h1 className="text-5xl font-bold tracking-tighter leading-tight">Explore</h1>
      </div>

      {/* Map Section */}
      <Card className="p-8 border border-black/5 rounded-3xl bg-black/5 shadow-sm mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-black/40 mb-2">Location</p>
            <h3 className="text-2xl font-bold tracking-tighter">All Businesses</h3>
          </div>
          <MapPin className="w-6 h-6 text-black/20" strokeWidth={1.5} />
        </div>
        <div className="bg-white border border-black/10 rounded-3xl h-[480px] overflow-hidden">
          <BusinessMap businesses={mockBusinesses} basePath="/business/nearby" />
        </div>
      </Card>

      {/* Business Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockBusinesses.map((business, i) => (
          <motion.div
            key={business.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <Link to={`/business/nearby/${business.id}`} className="group block">
              <Card className="overflow-hidden border border-black/5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={business.image}
                    alt={business.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold tracking-tight">{business.name}</h3>
                      {business.verified && (
                        <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm shrink-0">
                      <Star className="w-3.5 h-3.5 fill-black" />
                      <span className="font-bold">{business.rating}</span>
                      <span className="text-black/40">({business.reviews})</span>
                    </div>
                  </div>
                  <p className="text-sm text-black/50 mb-4 leading-relaxed line-clamp-2">{business.description}</p>
                  <div className="flex items-center gap-1.5 text-sm text-black/40">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
                    <span>{business.address}</span>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
