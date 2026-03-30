import { GoogleMap, useJsApiLoader, OverlayView } from "@react-google-maps/api";
import { useState } from "react";
import { Link } from "react-router";
import { Star } from "lucide-react";
import { mockProducts, mockServices } from "../data/mockData";

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
const DEFAULT_CENTER = { lat: 1.3521, lng: 103.8198 };

interface Business {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  image?: string;
  rating?: number;
}

function getCategoriesForBusiness(businessId: string): string[] {
  const productCats = mockProducts
    .filter((p) => p.businessId === businessId)
    .map((p) => p.category);
  const serviceCats = mockServices
    .filter((s) => s.businessId === businessId)
    .map((s) => s.name);
  return [...new Set([...productCats, ...serviceCats])];
}

function BusinessPin({
  business,
  onHover,
  onLeave,
  hovered,
  basePath,
}: {
  business: Business;
  onHover: () => void;
  onLeave: () => void;
  hovered: boolean;
  basePath: string;
}) {
  const categories = getCategoriesForBusiness(business.id);

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{ transform: "translate(-50%, -100%)", cursor: "pointer", position: "relative" }}
    >
      {/* Tooltip */}
      {hovered && (
        <Link
          to={`${basePath}/${business.id}`}
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            borderRadius: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)",
            padding: "10px 12px",
            minWidth: 170,
            maxWidth: 200,
            textDecoration: "none",
            color: "inherit",
            display: "block",
            zIndex: 10,
          }}
        >
          {/* Business name */}
          <p style={{ fontWeight: 800, fontSize: 13, margin: 0, lineHeight: 1.3, color: "#111", letterSpacing: "-0.2px" }}>
            {business.name}
          </p>

          {/* Rating */}
          {business.rating && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
              <Star style={{ width: 10, height: 10, fill: "#FBBF24", stroke: "#FBBF24", flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>{business.rating}</span>
            </div>
          )}

          {/* Category tags */}
          {categories.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {categories.map((cat) => (
                <span
                  key={cat}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#555",
                    background: "#f4f4f4",
                    borderRadius: 20,
                    padding: "2px 8px",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.1px",
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Arrow */}
          <div style={{
            position: "absolute",
            bottom: -5,
            left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
            width: 10,
            height: 10,
            background: "white",
            boxShadow: "2px 2px 4px rgba(0,0,0,0.06)",
          }} />
        </Link>
      )}

      {/* Pin */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "2.5px solid white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          overflow: "hidden",
          background: "white",
          transition: "transform 0.15s ease",
          transform: hovered ? "scale(1.15)" : "scale(1)",
        }}>
          {business.image ? (
            <img src={business.image} alt={business.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#aaa" }}>
              {business.name[0]}
            </div>
          )}
        </div>
        {/* Tail */}
        <div style={{
          width: 0, height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "7px solid white",
          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))",
        }} />
      </div>
    </div>
  );
}

export default function BusinessMap({ businesses, basePath = "/customer/business" }: { businesses: Business[]; basePath?: string }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
  });

  if (loadError) return <div className="flex items-center justify-center h-full text-black/40">Failed to load map</div>;
  if (!isLoaded) return <div className="flex items-center justify-center h-full text-black/40">Loading map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={DEFAULT_CENTER}
      zoom={13}
      options={{
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      }}
    >
      {businesses.map((business) => (
        <OverlayView
          key={business.id}
          position={business.location}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <BusinessPin
            business={business}
            hovered={hoveredId === business.id}
            onHover={() => setHoveredId(business.id)}
            onLeave={() => setHoveredId(null)}
            basePath={basePath}
          />
        </OverlayView>
      ))}
    </GoogleMap>
  );
}
