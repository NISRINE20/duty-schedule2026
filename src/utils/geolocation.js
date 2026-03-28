// Workplace coordinates (Davao City, Plus Code 5M35+3F)
export const WORKPLACE_LAT = 7.070625;
export const WORKPLACE_LNG = 125.6128125;
export const ALLOWED_RADIUS_METERS = 100; // Allow 100 meters radius

/**
 * Calculates the Haversine distance between two coordinates in meters.
 */
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const toRadians = (deg) => deg * (Math.PI / 180);

  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Verifies if the user is within the allowed radius of the workplace.
 * @returns {Promise<{ allowed: boolean, distance: number, error?: string }>}
 */
export function verifyLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      resolve({ allowed: false, distance: 0, error: "Geolocation is not supported by your browser." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        const distance = getDistanceInMeters(userLat, userLng, WORKPLACE_LAT, WORKPLACE_LNG);
        const allowed = distance <= ALLOWED_RADIUS_METERS;

        resolve({ allowed, distance: Math.round(distance) });
      },
      (error) => {
        let errorMessage = "An unknown error occurred while getting your location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Please allow location access to log your time. We need to verify you are at the workplace.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable. Please check your GPS signal.";
            break;
          case error.TIMEOUT:
            errorMessage = "The request to get your location timed out.";
            break;
        }
        resolve({ allowed: false, distance: 0, error: errorMessage });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}
