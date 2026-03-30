/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 User's latitude
 * @param lon1 User's longitude
 * @param lat2 Destination latitude
 * @param lon2 Destination longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Get user's current location
 * @returns Promise with { lat, lng } or null if denied
 */
export function getUserLocation(): Promise<{
  lat: number;
  lng: number;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.log("Geolocation not available");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        console.log("Geolocation permission denied or unavailable");
        resolve(null);
      },
      {
        timeout: 10000,
        enableHighAccuracy: false,
      }
    );
  });
}

/**
 * Filter items by distance from user location
 * @param items Array of items with location property
 * @param userLat User's latitude
 * @param userLng User's longitude
 * @param radiusKm Maximum distance in kilometers (default 5km)
 * @param limit Maximum number of items to return
 * @returns Sorted array of nearby items with distance
 */
export function getNearbyItems<T extends { location: { lat: number; lng: number } }>(
  items: T[],
  userLat: number,
  userLng: number,
  radiusKm: number = 5,
  limit: number = 4
): (T & { distance: number })[] {
  return items
    .map((item) => ({
      ...item,
      distance: calculateDistance(userLat, userLng, item.location.lat, item.location.lng),
    }))
    .filter((item) => item.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}
