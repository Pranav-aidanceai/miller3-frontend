'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface SimilarMapPoint {
    company_id: string;
    company_name: string;
    latitude: number;
    longitude: number;
}

interface LocationMapProps {
    companyId: string;
    lat: number;
    lng: number;
    companyName?: string | null;
    address?: string | null;
    onSelectSimilar?: (companyId: string) => void;
}


const makePin = (color: string, size: number, highlight = false) => {
    const filter = highlight ? 'filter="drop-shadow(0 0 2px white) drop-shadow(0 1px 2px rgba(0,0,0,0.4))"' : '';
    return L.divIcon({
        className: 'pin-marker',
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ${filter}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white" stroke="none"/></svg>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        tooltipAnchor: [0, -size + 2],
    });
};

const currentPin = makePin('#ef4444', 42, true);
const similarPin = makePin('#3b82f6', 30);

function FrameView({ center, points }: { center: [number, number]; points: [number, number][] }) {
    const map = useMap();
    useEffect(() => {
        if (points.length === 0) {
            map.setView(center, 13);
            return;
        }
        const maxOffset = points.reduce(
            (max, [plat, plng]) =>
                Math.max(max, Math.abs(plat - center[0]), Math.abs(plng - center[1])),
            0,
        );
        const pad = maxOffset || 0.05;
        const bounds = L.latLngBounds(
            [center[0] - pad, center[1] - pad],
            [center[0] + pad, center[1] + pad],
        );
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }, [map, center, points]);
    return null;
}

export default function LocationMap({ companyId, lat, lng, companyName, address, onSelectSimilar }: LocationMapProps) {
    const center: [number, number] = [lat, lng];
    const [points, setPoints] = useState<SimilarMapPoint[]>([]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await axios.get('/api/similar-map', { params: { companyId, limit: 5 } });
                if (active) setPoints(res.data.data ?? []);
            } catch {
                if (active) setPoints([]);
            }
        })();
        return () => { active = false; };
    }, [companyId]);

    const validPoints = points.filter(p => p.latitude != null && p.longitude != null);

    return (
        <div className="h-72 w-full overflow-hidden rounded-lg border border-border">
            <style>{`
                .pin-marker svg {
                    transform-origin: bottom center;
                    transition: transform 0.15s ease-out;
                    cursor: pointer;
                }
                .pin-marker:hover svg {
                    transform: scale(1.3) translateY(-2px);
                }
                .pin-marker:hover {
                    z-index: 1000 !important;
                }
            `}</style>
            <MapContainer
                center={center}
                zoom={13}
                scrollWheelZoom={false}
                attributionControl={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FrameView center={center} points={validPoints.map(p => [p.latitude, p.longitude])} />

                <Marker position={center} icon={currentPin} zIndexOffset={1000}>
                    <Tooltip direction="top" opacity={1}>
                        <div className="text-xs leading-snug">
                            {companyName && <p className="font-semibold">{companyName}</p>}
                            {address && <p className="text-muted-foreground">{address}</p>}
                        </div>
                    </Tooltip>
                </Marker>

                {validPoints.map(p => (
                    <Marker
                        key={p.company_id}
                        position={[p.latitude, p.longitude]}
                        icon={similarPin}
                        eventHandlers={{ click: () => onSelectSimilar?.(p.company_id) }}
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
