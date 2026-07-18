"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet marker icon
const iconDefault = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const iconOrigin = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const iconDest = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const iconCurrent = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface TripEvent {
  id: number;
  event_type: string;
  location_description: string;
  recorded_at: string;
  latitude: number | null;
  longitude: number | null;
}

interface ShipmentMapProps {
  origin: string;
  destination: string;
  events: TripEvent[];
  currentPosition: [number, number] | null;
  routePoints: [number, number][];
}

export default function ShipmentMap({ origin, destination, events, currentPosition, routePoints }: ShipmentMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [-18, 28],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Origin + destination markers
    const originMarker = L.marker([-12.1734, 26.3945], { icon: iconOrigin }).bindPopup(origin).addTo(map);
    const destMarker = L.marker([-29.8587, 31.0218], { icon: iconDest }).bindPopup(destination).addTo(map);

    // Route polyline
    if (routePoints.length >= 2) {
      L.polyline(routePoints, {
        color: "#3b82f6",
        weight: 3,
        opacity: 0.7,
        dashArray: "8 4",
      }).addTo(map);
    }

    // Current position marker
    if (currentPosition) {
      L.marker(currentPosition, { icon: iconCurrent }).bindPopup("Current position").addTo(map);
    }

    // Event markers along the route
    events.forEach((e) => {
      if (e.latitude && e.longitude) {
        const markerIcon = e.event_type === "delay"
          ? L.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
              shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
              iconSize: [20, 32],
              iconAnchor: [10, 32],
              shadowSize: [32, 32],
            })
          : L.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
              shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
              iconSize: [16, 26],
              iconAnchor: [8, 26],
              shadowSize: [26, 26],
            });

        L.marker([e.latitude, e.longitude], { icon: markerIcon })
          .bindPopup(`<b>${e.event_type.replace(/_/g, " ")}</b><br/>${e.location_description}<br/><small>${e.recorded_at}</small>`)
          .addTo(map);
      }
    });

    // Fit bounds to show all markers
    if (routePoints.length > 1 || currentPosition) {
      const allPoints = routePoints.length > 0 ? routePoints : (currentPosition ? [currentPosition] : []);
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds.pad(0.2));
      }
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mapRef} className="h-[300px] w-full rounded-lg" />;
}
