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

        if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
        }

        if (active && points.length > 0) {
            const resolution = 9; // ~0.1km2 hexagons
            const counts: Record<string, number> = {};

            // 1. Index points
            points.forEach(p => {
                const h3Index = latLngToCell(p.lat, p.lng, resolution);
                counts[h3Index] = (counts[h3Index] || 0) + 1;
            });

            // 2. Determine scale (simple max)
            const maxCount = Math.max(...Object.values(counts));

            // 3. Generate Features
            const features: GeoJSON.Feature[] = Object.entries(counts).map(([h3Index, count]) => {
                const boundary = cellToBoundary(h3Index, true); // true for GeoJSON conformant (lng, lat)
                // boundary is [lng, lat][], needs to be wrapped in [ boundary ] for Polygon

                return {
                    type: 'Feature',
                    properties: { count, density: count / maxCount },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [boundary]
                    }
                };
            });

            // 4. Create GeoJSON Layer
            layerRef.current = L.geoJSON({ type: 'FeatureCollection', features } as any, { // eslint-disable-line
                style: (feature) => {
                    const density = feature?.properties.density || 0;
                    return {
                        color: 'white',
                        weight: 1,
                        fillColor: getColor(density),
                        fillOpacity: 0.6 + (density * 0.3) // Higher density = more opaque
                    };
                },
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(`${feature.properties.count} submissions`);
                }
            }).addTo(map);
        }

        return () => {
            if (layerRef.current) {
                layerRef.current.remove();
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
