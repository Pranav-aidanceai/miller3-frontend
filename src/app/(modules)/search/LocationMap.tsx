'use client';

import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
    lat: number;
    lng: number;
    companyName?: string | null;
    address?: string | null;
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

export default function LocationMap({ lat, lng, companyName, address }: LocationMapProps) {
    return (
        <div className="h-72 w-full overflow-hidden rounded-lg border border-border">
            <MapContainer
                center={[lat, lng]}
                zoom={13}
                scrollWheelZoom={false}
                attributionControl={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[lat, lng]} icon={pinIcon}>
                    <Tooltip direction="top" opacity={1}>
                        <div className="text-xs leading-snug">
                            {companyName && <p className="font-semibold">{companyName}</p>}
                            {address && <p className="text-muted-foreground">{address}</p>}
                        </div>
                    </Tooltip>
                </Marker>
            </MapContainer>
        </div>
    );
}
