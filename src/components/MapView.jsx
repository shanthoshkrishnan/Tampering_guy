import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function MapView({ latitude, longitude, altitude }) {
  // Fallbacks in case props are missing
  const lat = latitude ?? 0;
  const lng = longitude ?? 0;
  const alt = altitude ?? 0;

  return (
    <div className="w-full">
      {/* Responsive map wrapper:
          - Small phones: h-64
          - Larger phones/tablets: h-80
          - Desktop: h-96 */}
      <div className="w-full h-64 sm:h-80 md:h-96 rounded-lg overflow-hidden border border-gray-300">
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          className="leaflet-container"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]}>
            <Popup>
              <div className="text-xs sm:text-sm leading-snug">
                <strong>Current Location</strong>
                <br />
                Lat: {lat.toFixed(6)}
                <br />
                Lng: {lng.toFixed(6)}
                <br />
                Alt: {alt.toFixed(1)} m
              </div>
            </Popup>
          </Marker>
          <RecenterMap lat={lat} lng={lng} />
        </MapContainer>
      </div>
    </div>
  );
}
