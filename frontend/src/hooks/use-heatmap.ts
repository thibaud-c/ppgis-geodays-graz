import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

export function useHeatmap(
    map: L.Map | null,
    points: Array<{ lat: number; lng: number }>,
    active: boolean
) {
    const layerRef = useRef<L.Layer | null>(null);

    useEffect(() => {
        if (!map) return;

        // Clean up previous layer
        if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
        }

        if (active && points.length > 0) {
            // Prepare data for leaflet.heat: [lat, lng, intensity]
            // Intensity could be 1 for basic density, or more if weighted
            const heatPoints = points.map(p => [p.lat, p.lng, 1]); // Simple density

            // @ts-expect-error - leaflet.heat adds heatLayer to L
            const layer = L.heatLayer(heatPoints, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient: {
                    0.4: 'blue',
                    0.6: 'cyan',
                    0.7: 'lime',
                    0.8: 'yellow',
                    1.0: 'red'
                }
            }).addTo(map);

            layerRef.current = layer;
        }

        return () => {
            if (layerRef.current) {
                layerRef.current.remove();
                layerRef.current = null;
            }
        };
    }, [map, points, active]);
}
