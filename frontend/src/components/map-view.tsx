import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Plus, Minus, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '@/components/theme-provider';
import { useHeatmap } from '@/hooks/use-heatmap';
import { useH3Layer } from '@/hooks/use-h3-layer';

// Fix for default marker icons in Leaflet with bundlers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

export type ViewMode = 'markers' | 'heatmap' | 'h3';

interface MapViewProps {
    onMapClick?: (lat: number, lng: number) => void;
    markers?: Array<{
        id: string;
        latitude: number;
        longitude: number;
        sentiment: 'like' | 'dislike';
        isNew?: boolean;
    }>;
    tempMarker?: { lat: number; lng: number } | null;
    viewMode?: ViewMode;
}

export function MapView({ onMapClick, markers = [], tempMarker, viewMode = 'markers' }: MapViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const tempMarkerRef = useRef<L.CircleMarker | null>(null);
    const { theme } = useTheme();

    const points = markers.map(m => ({ lat: m.latitude, lng: m.longitude }));

    // Layers Hooks
    useHeatmap(mapInstance.current, points, viewMode === 'heatmap');
    useH3Layer(mapInstance.current, points, viewMode === 'h3');

    // CartoDB Basemap URLs (High Contrast)
    const CARTO_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    const CARTO_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    useEffect(() => {
        if (!mapInstance.current) return;

        // Remove existing temp marker
        if (tempMarkerRef.current) {
            tempMarkerRef.current.remove();
            tempMarkerRef.current = null;
        }

        if (tempMarker) {
            tempMarkerRef.current = L.circleMarker([tempMarker.lat, tempMarker.lng], {
                color: '#3b82f6', // blue-500
                fillColor: '#3b82f6',
                fillOpacity: 0.5,
                radius: 8,
                className: 'animate-pulse'
            }).addTo(mapInstance.current);
        }
    }, [tempMarker]);

    useEffect(() => {
        if (!mapContainer.current) return;
        if (mapInstance.current) return; // Initialize only once

        // Initialize map centered on Graz
        // Disable default zoom control to use custom ones
        const map = L.map(mapContainer.current, {
            zoomControl: false,
        }).setView([47.0707, 15.4395], 13);

        // Initial tile layer
        tileLayerRef.current = L.tileLayer(theme === 'dark' ? CARTO_DARK : CARTO_LIGHT, {
            maxZoom: 20,
            attribution: ATTR,
        }).addTo(map);

        mapInstance.current = map;

        // Force map invalidation to correct size issues after render
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

        return () => {
            map.remove();
            mapInstance.current = null;
            tileLayerRef.current = null;
        };
    }, []); // Dependencies: empty array (init once)

    // Handle Theme Change (Switch Basemap)
    useEffect(() => {
        if (!tileLayerRef.current || !mapInstance.current) return;

        const newUrl = theme === 'dark' ? CARTO_DARK : CARTO_LIGHT;

        // Check if the URL actually changed to avoid flickering
        // @ts-expect-error - internal property
        if (tileLayerRef.current._url !== newUrl) {
            tileLayerRef.current.setUrl(newUrl);
        }

        // Recolor map container background to match tile to reduce flicker effect
        if (mapContainer.current) {
            mapContainer.current.style.backgroundColor = theme === 'dark' ? '#222' : '#ddd';
        }

    }, [theme]);

    // Handle Map Clicks
    useEffect(() => {
        if (!mapInstance.current) return;
        const map = mapInstance.current;

        const handleClick = (e: L.LeafletMouseEvent) => {
            if (onMapClick) {
                onMapClick(e.latlng.lat, e.latlng.lng);
            }
        };

        map.on('click', handleClick);

        return () => {
            map.off('click', handleClick);
        };
    }, [onMapClick]);

    // Handle Markers (Only Views MARKERS mode)
    useEffect(() => {
        if (!mapInstance.current) return;

        // Clear existing markers (except temp)
        mapInstance.current.eachLayer((layer) => {
            if (layer instanceof L.CircleMarker && layer !== tempMarkerRef.current) {
                mapInstance.current?.removeLayer(layer);
            }
        });

        if (viewMode === 'markers') {
            markers.forEach((m) => {
                const color = m.sentiment === 'like' ? '#10b981' : '#f43f5e';

                L.circleMarker([m.latitude, m.longitude], {
                    color: 'white',
                    weight: 2,
                    fillColor: color,
                    fillOpacity: m.isNew ? 1 : 0.9,
                    radius: m.isNew ? 12 : 8,
                    className: m.isNew ? 'new-marker-pulse' : '',
                }).addTo(mapInstance.current!);
            });
        }
    }, [markers, viewMode]);

    const handleZoomIn = () => mapInstance.current?.zoomIn();
    const handleZoomOut = () => mapInstance.current?.zoomOut();
    const handleLocate = () => {
        mapInstance.current?.locate({ setView: true, maxZoom: 16 });
    };

    return (
        <div className="relative flex-1 w-full h-full min-h-0 isolate">
            <div ref={mapContainer} className="w-full h-full z-0" style={{ minHeight: '100%' }} />

            {/* Custom Controls */}
            <div className="absolute bottom-8 right-4 z-[400] flex flex-col gap-2">
                <Button variant="secondary" size="icon" onClick={handleLocate} className="rounded-full shadow-lg hover:scale-105 transition-transform">
                    <Navigation className="h-5 w-5" />
                </Button>
                <div className="flex flex-col rounded-lg shadow-lg bg-card/90 backdrop-blur-sm border border-border/50 overflow-hidden">
                    <Button variant="ghost" size="icon" onClick={handleZoomIn} className="rounded-none h-10 w-10 hover:bg-accent/50">
                        <Plus className="h-5 w-5" />
                    </Button>
                    <div className="h-[1px] w-full bg-border/50" />
                    <Button variant="ghost" size="icon" onClick={handleZoomOut} className="rounded-none h-10 w-10 hover:bg-accent/50">
                        <Minus className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
