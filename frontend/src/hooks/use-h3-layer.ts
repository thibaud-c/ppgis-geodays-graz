import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { latLngToCell, cellToBoundary } from 'h3-js';

export function useH3Layer(
    map: L.Map | null,
    points: Array<{ lat: number; lng: number }>,
    active: boolean
) {
    const layerRef = useRef<L.GeoJSON | null>(null);

    useEffect(() => {
        if (!map) return;

        // --- 1. Zoom Listener ---
        const handleZoom = () => {
            // Force re-render with new zoom
            // Note: In a real component, we'd use state, but here we can just 
            // re-run the effect if we add `map.getZoom()` to a dependency or simpler:
            // We can just define the logic inside the effect and listen to moveend
            updateLayer();
        };

        map.on('zoomend', handleZoom);


        // --- 2. Layer Logic ---
        const updateLayer = () => {
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }

            if (active && points.length > 0) {
                const zoom = map.getZoom();

                // Determine resolution based on zoom
                let resolution = 9;
                if (zoom > 14) resolution = 10;      // High detail
                else if (zoom >= 12) resolution = 9; // City
                else if (zoom >= 10) resolution = 8; // Region
                else resolution = 7;                 // Country

                const counts: Record<string, number> = {};

                // Index points
                points.forEach(p => {
                    const h3Index = latLngToCell(p.lat, p.lng, resolution);
                    counts[h3Index] = (counts[h3Index] || 0) + 1;
                });

                const maxCount = Math.max(...Object.values(counts));

                const features: GeoJSON.Feature[] = Object.entries(counts).map(([h3Index, count]) => {
                    const boundary = cellToBoundary(h3Index, true);
                    return {
                        type: 'Feature',
                        properties: { count, density: count / maxCount },
                        geometry: {
                            type: 'Polygon',
                            coordinates: [boundary]
                        }
                    };
                });

                layerRef.current = L.geoJSON({ type: 'FeatureCollection', features } as any, { // eslint-disable-line
                    style: (feature) => {
                        const density = feature?.properties.density || 0;
                        return {
                            color: 'white',
                            weight: 1,
                            fillColor: getColor(density),
                            fillOpacity: 0.6 + (density * 0.3)
                        };
                    },
                    onEachFeature: (feature, layer) => {
                        layer.bindPopup(`${feature.properties.count} submissions`);
                    }
                }).addTo(map);
            }
        };

        // Initial draw
        updateLayer();

        return () => {
            map.off('zoomend', handleZoom);
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
        };
    }, [map, points, active]);
}

function getColor(offset: number) {
    // Offset 0-1
    // Purple to Yellow/Red scale
    return offset > 0.8 ? '#800026' :
        offset > 0.6 ? '#BD0026' :
            offset > 0.4 ? '#E31A1C' :
                offset > 0.2 ? '#FC4E2A' :
                    '#FFEDA0';
}
