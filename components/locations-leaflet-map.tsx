"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Point = {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: string;
  isLatest?: boolean;
};

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

export function LocationsLeafletMap({ points }: { points: Point[] }) {
  if (points.length === 0) return null;

  const center: [number, number] = [points[0].lat, points[0].lng];

  // scroll to map area
  useEffect(() => {}, []);

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "420px", width: "100%", borderRadius: "0.5rem" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        detectRetina={true}
      />
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lng]}
          radius={p.isLatest ? 12 : 8}
          pathOptions={{
            color: p.isLatest ? "#f97316" : "#3b82f6",
            fillColor: p.isLatest ? "#f97316" : "#3b82f6",
            fillOpacity: p.isLatest ? 0.9 : 0.6,
            weight: p.isLatest ? 3 : 1.5,
          }}
        >
          <Popup>
            <div style={{ fontSize: "12px", lineHeight: "1.6" }}>
              {p.isLatest && <strong style={{ color: "#f97316" }}>📍 Most Recent</strong>}
              {!p.isLatest && <span>📌 Location #{i + 1}</span>}
              <br />
              <span>Lat: {p.lat.toFixed(6)}</span>
              <br />
              <span>Lng: {p.lng.toFixed(6)}</span>
              {p.accuracy != null && <><br /><span>Accuracy: ±{p.accuracy.toFixed(1)}m</span></>}
              {p.timestamp && <><br /><span>{fmt(p.timestamp)}</span></>}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
