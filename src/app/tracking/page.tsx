"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  Clock,
  AlertTriangle,
  X,
  ChevronRight,
  Truck,
  Gauge,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

// ── Types ──

interface ActiveShipment {
  id: number;
  shipment_id: string;
  status: string;
  origin: string;
  destination: string;
  origin_country: string;
  destination_country: string;
  cargo_type: string;
  departure_scheduled: string;
  departure_actual: string | null;
  eta: string | null;
  mission_readiness_score: number | null;
  operational_confidence_score: number | null;
  latest_latitude: number | null;
  latest_longitude: number | null;
  latest_speed_kmh: number | null;
  latest_heading: number | null;
  latest_location: string | null;
  latest_recorded_at: string | null;
  driver_name: string | null;
  vehicle_registration: string | null;
  vehicle_type: string | null;
}

// ── Status helpers ──

function getMarkerColor(status: string): string {
  switch (status) {
    case "in_transit":
    case "at_border":
      return "#22c55e"; // green
    case "delayed":
      return "#ef4444"; // red
    default:
      return "#3b82f6"; // blue
  }
}

function getMarkerShape(status: string): string {
  switch (status) {
    case "in_transit":
    case "at_border":
      return "circle";
    case "delayed":
      return "triangle";
    default:
      return "circle";
  }
}

function formatEta(etaStr: string | null): string {
  if (!etaStr) return "—";
  const eta = new Date(etaStr);
  const now = new Date();
  const diffMs = eta.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / 3600000);
  if (diffHours < 0) return "Overdue";
  if (diffHours < 24) return `${diffHours}h remaining`;
  const days = Math.floor(diffHours / 24);
  const hours = diffHours % 24;
  return `${days}d ${hours}h`;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Simple Grid-based Clustering ──

interface ClusterGroup {
  lat: number;
  lng: number;
  count: number;
  shipments: ActiveShipment[];
}

function clusterShipments(
  shipments: ActiveShipment[],
  zoom: number
): (ActiveShipment | ClusterGroup)[] {
  if (zoom >= 6 || shipments.length <= 3) return shipments;

  // Grid cell size in degrees — larger at lower zoom
  const cellSize = Math.pow(2, 6 - zoom) * 0.8;

  const grid = new Map<string, ActiveShipment[]>();

  for (const s of shipments) {
    if (s.latest_latitude == null || s.latest_longitude == null) continue;
    const cellLat = Math.floor(s.latest_latitude / cellSize) * cellSize;
    const cellLng = Math.floor(s.latest_longitude / cellSize) * cellSize;
    const key = `${cellLat.toFixed(2)},${cellLng.toFixed(2)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(s);
  }

  const result: (ActiveShipment | ClusterGroup)[] = [];

  for (const [key, group] of grid) {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      const [latStr, lngStr] = key.split(",");
      result.push({
        lat: parseFloat(latStr) + cellSize / 2,
        lng: parseFloat(lngStr) + cellSize / 2,
        count: group.length,
        shipments: group,
      });
    }
  }

  return result;
}

// ── Leaflet Map (dynamically imported, no SSR) ──

function TrackingMapInner() {
  const { theme } = useTheme();
  const [shipments, setShipments] = useState<ActiveShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedShipment, setSelectedShipment] =
    useState<ActiveShipment | null>(null);
  const [zoom, setZoom] = useState(5);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Fetch active shipments
  const fetchShipments = useCallback(async () => {
    try {
      const res = await fetch("/api/tracking/active");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setShipments(data);
      setError(null);
    } catch (err) {
      setError("Unable to load shipment data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(fetchShipments, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchShipments]);

  // Initialize map and markers
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Dynamic import Leaflet
    const L = require("leaflet");

    // Only create map once
    if (!mapRef.current) {
      const mapEl = document.getElementById("tracking-map");
      if (!mapEl) return;

      const map = L.map("tracking-map", {
        center: [-22, 28],
        zoom: 5,
        zoomControl: true,
        attributionControl: true,
      });

      // Tile layer based on theme
      const tileUrl =
        theme === "dark"
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      const tileAttribution =
        theme === "dark"
          ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          : '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

      L.tileLayer(tileUrl, {
        attribution: tileAttribution,
        maxZoom: 18,
      }).addTo(map);

      map.on("zoomend", () => {
        setZoom(map.getZoom());
      });

      mapRef.current = map;
    }

    return () => {
      // Don't destroy on re-render — we manage it manually
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update tile layer when theme changes
  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;
    const L = require("leaflet");
    const map = mapRef.current;

    // Remove existing tile layers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl =
      theme === "dark"
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    const tileAttribution =
      theme === "dark"
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

    L.tileLayer(tileUrl, {
      attribution: tileAttribution,
      maxZoom: 18,
    }).addTo(map);
  }, [theme]);

  // Update markers when shipments or zoom change
  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;
    const L = require("leaflet");
    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    const items = clusterShipments(shipments, zoom);

    for (const item of items) {
      if ("count" in item) {
        // Cluster
        const cluster = item as ClusterGroup;
        const icon = L.divIcon({
          className: "cluster-icon",
          html: `<div style="
            width: ${Math.min(50, 30 + cluster.count * 3)}px;
            height: ${Math.min(50, 30 + cluster.count * 3)}px;
            background: #3b82f6;
            border: 3px solid #1d4ed8;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: ${Math.min(16, 12 + cluster.count)}px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">${cluster.count}</div>`,
          iconSize: [Math.min(50, 30 + cluster.count * 3), Math.min(50, 30 + cluster.count * 3)],
          iconAnchor: [Math.min(50, 30 + cluster.count * 3) / 2, Math.min(50, 30 + cluster.count * 3) / 2],
        });

        const marker = L.marker([cluster.lat, cluster.lng], { icon }).addTo(map);
        marker.bindTooltip(`${cluster.count} shipments`, {
          direction: "top",
          offset: [0, -5],
        });
        markersRef.current.push(marker);
      } else {
        // Individual shipment
        const s = item as ActiveShipment;
        if (s.latest_latitude == null || s.latest_longitude == null) continue;

        const color = getMarkerColor(s.status);
        const isDelayed = s.status === "delayed";
        const isActive = s.status === "in_transit" || s.status === "at_border";

        // Build custom HTML marker with pulsing animation for active
        const markerHtml = `
          <div style="position: relative; width: 28px; height: 28px;">
            ${
              isActive
                ? `<div class="marker-pulse" style="
                  position: absolute;
                  top: 50%; left: 50%;
                  width: 28px; height: 28px;
                  margin-left: -14px; margin-top: -14px;
                  border-radius: 50%;
                  background: ${color}40;
                  animation: pulse-ring 2s ease-out infinite;
                "></div>`
                : ""
            }
            <div style="
              position: absolute;
              top: 50%; left: 50%;
              width: ${isDelayed ? "0" : "16px"};
              height: ${isDelayed ? "0" : "16px"};
              margin-left: ${isDelayed ? "-10px" : "-8px"};
              margin-top: ${isDelayed ? "-10px" : "-8px"};
              border-radius: ${isDelayed ? "0" : "50%"};
              border-left: ${isDelayed ? "10px solid transparent" : "none"};
              border-right: ${isDelayed ? "10px solid transparent" : "none"};
              border-bottom: ${isDelayed ? `18px solid ${color}` : "none"};
              background: ${isDelayed ? "transparent" : color};
              border: ${isDelayed ? "none" : "3px solid white"};
              box-shadow: 0 1px 4px rgba(0,0,0,0.4);
            "></div>
          </div>
        `;

        const icon = L.divIcon({
          className: "custom-marker",
          html: markerHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([s.latest_latitude, s.latest_longitude], {
          icon,
        }).addTo(map);

        // Tooltip
        marker.bindTooltip(
          `<strong>${s.shipment_id}</strong><br/>
           ${s.origin} → ${s.destination}<br/>
           ${s.latest_speed_kmh ? `${s.latest_speed_kmh} km/h · ` : ""}ETA: ${formatEta(s.eta)}`,
          { direction: "top", offset: [0, -18], className: "marker-tooltip" }
        );

        // Popup on click
        marker.on("click", () => {
          setSelectedShipment(s);
          setSidebarOpen(true);
        });

        markersRef.current.push(marker);
      }
    }
  }, [shipments, zoom]);

  // Stats
  const stats = useMemo(() => {
    const active = shipments.filter(
      (s) => s.status === "in_transit" || s.status === "at_border"
    ).length;
    const delayed = shipments.filter((s) => s.status === "delayed").length;
    const total = shipments.length;
    return { active, delayed, total };
  }, [shipments]);

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 64px)" }}>
      {/* Map Container */}
      <div id="tracking-map" className="absolute inset-0 z-0" />

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-xl text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Loading active shipments…
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
          <button
            onClick={fetchShipments}
            className="ml-3 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
          Legend
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span
              className="inline-block w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"
            />
            <span className="text-slate-600 dark:text-slate-300">Active</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-amber-500" />
            <span className="text-slate-600 dark:text-slate-300">
              At Risk / Delayed
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
            <span className="text-slate-600 dark:text-slate-300">Cluster</span>
          </div>
        </div>
      </div>

      {/* Stats Bar (top) */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        {[
          {
            label: "Active",
            value: stats.total,
            icon: MapPin,
            color: "text-emerald-500",
            bg: "bg-white dark:bg-slate-900/95",
          },
          {
            label: "On Track",
            value: stats.active,
            icon: Navigation,
            color: "text-blue-500",
            bg: "bg-white dark:bg-slate-900/95",
          },
          {
            label: "Delayed",
            value: stats.delayed,
            icon: AlertTriangle,
            color: "text-red-500",
            bg: "bg-white dark:bg-slate-900/95",
          },
        ].map((item, i) => (
          <div
            key={i}
            className={`${item.bg} backdrop-blur border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg`}
          >
            <div className="flex items-center gap-2">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {item.value}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {item.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`absolute top-4 z-10 p-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/95 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all ${
          sidebarOpen ? "right-[376px]" : "right-4"
        }`}
      >
        <ChevronRight
          className={`h-5 w-5 transition-transform ${
            sidebarOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Sidebar Panel */}
      <div
        className={`absolute top-0 right-0 z-20 h-full w-[360px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Active Shipments
            </h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Shipment List */}
          <div className="flex-1 overflow-y-auto">
            {shipments.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Truck className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No active shipments
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {shipments.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedShipment(s);
                      // Fly to marker on map
                      if (
                        mapRef.current &&
                        s.latest_latitude &&
                        s.latest_longitude
                      ) {
                        mapRef.current.flyTo(
                          [s.latest_latitude, s.latest_longitude],
                          8,
                          { duration: 1 }
                        );
                      }
                    }}
                    className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      selectedShipment?.id === s.id
                        ? "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <Link
                        href={`/shipments/${s.shipment_id}`}
                        className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.shipment_id}
                      </Link>
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          s.status === "delayed"
                            ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                            : s.status === "at_border"
                            ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                            : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {s.status.replace("_", " ")}
                      </span>
                    </div>

                    <p className="text-sm text-slate-900 dark:text-white font-medium truncate">
                      {s.origin} → {s.destination}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {s.latest_speed_kmh && (
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          {s.latest_speed_kmh} km/h
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatEta(s.eta)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                      {s.driver_name && <span>{s.driver_name}</span>}
                      {s.vehicle_registration && (
                        <span>{s.vehicle_registration}</span>
                      )}
                    </div>

                    {s.latest_location && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                        {s.latest_location} · {formatTimeAgo(s.latest_recorded_at)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
              Auto-refreshes every 30s · Last updated:{" "}
              {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet (replaces sidebar on small screens) */}
      <div className="lg:hidden absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-white dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              {shipments.length} Active Shipments
            </p>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-xs text-blue-600 dark:text-blue-400 font-medium"
            >
              View All
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {shipments.slice(0, 5).map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedShipment(s);
                  if (mapRef.current && s.latest_latitude && s.latest_longitude) {
                    mapRef.current.flyTo(
                      [s.latest_latitude, s.latest_longitude],
                      8,
                      { duration: 1 }
                    );
                  }
                }}
                className="flex-shrink-0 bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-2 cursor-pointer min-w-[140px]"
              >
                <p className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {s.shipment_id}
                </p>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
                  {s.origin.split(",")[0]} → {s.destination.split(",")[0]}
                </p>
                <p className="text-[10px] text-slate-400">{formatEta(s.eta)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pulse animation style */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          .marker-tooltip {
            background: white;
            border: none;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 6px 10px;
            font-size: 12px;
            line-height: 1.5;
          }
          .dark .marker-tooltip {
            background: #1e293b;
            color: #e2e8f0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px;
            padding: 0;
          }
          .leaflet-popup-content {
            margin: 0;
            min-width: 240px;
          }
        `,
        }}
      />
    </div>
  );
}

// ── Page Export (dynamically load map component to avoid SSR) ──

const TrackingMap = dynamic(() => Promise.resolve(TrackingMapInner), {
  ssr: false,
});

export default function TrackingPage() {
  return <TrackingMap />;
}
