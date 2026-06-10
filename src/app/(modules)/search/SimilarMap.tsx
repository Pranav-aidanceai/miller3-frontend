'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface SimilarMapPoint {
    company_id: string;
    company_name: string;
    latitude: number;
    longitude: number;
}

interface SimilarMapProps {
    points: SimilarMapPoint[];
    onSelect: (companyId: string) => void;
}

// A custom pin so we don't depend on Leaflet's bundled marker images
// (which break under bundlers). `currentColor` picks up the `text-primary`
// class set on the icon wrapper.
const pinIcon = L.divIcon({
    className: 'text-primary',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white" stroke="none"/></svg>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    tooltipAnchor: [0, -30],
});

// Keeps the viewport framed around every marker as the points change.
function FitBounds({ points }: { points: SimilarMapPoint[] }) {
    const map = useMap();
    useEffect(() => {
        if (points.length === 0) return;
        const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }, [map, points]);
    return null;
}

export default function SimilarMap({ points, onSelect }: SimilarMapProps) {
    const center: [number, number] = points.length
        ? [points[0].latitude, points[0].longitude]
        : [0, 0];

    return (
        <div className="h-72 w-full overflow-hidden rounded-lg border border-border">
            <MapContainer
                center={center}
                zoom={11}
                scrollWheelZoom={false}
                attributionControl={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitBounds points={points} />
                {points.map(p => (
                    <Marker
                        key={p.company_id}
                        position={[p.latitude, p.longitude]}
                        icon={pinIcon}
                        eventHandlers={{ click: () => onSelect(p.company_id) }}
                    >
                        <Tooltip direction="top" opacity={1}>
                            <p className="text-xs font-semibold leading-snug">{p.company_name}</p>
                        </Tooltip>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
