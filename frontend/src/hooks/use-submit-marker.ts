import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { saveMarker, deleteMarker, getMarkers } from '@/lib/api';

export type Sentiment = 'like' | 'dislike';

export interface MarkerData {
    id: string;
    latitude: number;
    longitude: number;
    sentiment: Sentiment;
    comment?: string;
}

interface UseSubmitMarkerOptions {
    version?: number;
    sessionOnly?: boolean; // When true, only show markers from this session
}

export function useSubmitMarker(options: UseSubmitMarkerOptions = {}) {
    const { version, sessionOnly = false } = options;

    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tempMarker, setTempMarker] = useState<{ lat: number; lng: number } | null>(null);
    const [sentiment, setSentiment] = useState<Sentiment | null>(null);
    const [responseText, setResponseText] = useState('');
    const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);

    // List of markers (from database OR session-only)
    const [markers, setMarkers] = useState<MarkerData[]>([]);

    // Fetch markers from API
    const fetchMarkers = useCallback(async () => {
        if (sessionOnly) return; // Skip fetch in session-only mode
        try {
            const data = await getMarkers(version);
            setMarkers(data || []);
        } catch (error) {
            console.error('Failed to fetch markers:', error);
        }
    }, [version, sessionOnly]);

    // Fetch on mount and version change (skipped if sessionOnly)
    useEffect(() => {
        fetchMarkers();
    }, [fetchMarkers]);

    const openSheet = (lat: number, lng: number) => {
        setTempMarker({ lat, lng });
        setSentiment(null);
        setResponseText('');
        setEditingMarkerId(null);
        setIsOpen(true);
    };

    const openEditSheet = (marker: MarkerData) => {
        setTempMarker({ lat: marker.latitude, lng: marker.longitude });
        setSentiment(marker.sentiment);
        setResponseText(marker.comment || '');
        setEditingMarkerId(marker.id);
        setIsOpen(true);
    };

    const closeSheet = () => {
        setIsOpen(false);
        setTempMarker(null);
        setSentiment(null);
        setResponseText('');
        setEditingMarkerId(null);
    };

    const submit = async () => {
        if (!tempMarker || !sentiment) {
            toast.error("Please select a sentiment (Safe/Unsafe)");
            return;
        }

        setIsLoading(true);

        try {
            const savedMarker = await saveMarker({
                id: editingMarkerId || undefined,
                latitude: tempMarker.lat,
                longitude: tempMarker.lng,
                sentiment,
                comment: responseText,
                version
            });

            toast.success(editingMarkerId ? "Marker updated!" : "Marker saved!");
            closeSheet();

            if (sessionOnly) {
                // In session-only mode, append to local state
                const completeMarker: MarkerData = {
                    ...savedMarker, // ID and backend fields
                    // Ensure we use the coordinates we just submitted if backend response is missing them
                    latitude: tempMarker.lat,
                    longitude: tempMarker.lng,
                    sentiment,
                    comment: responseText,
                };

                if (editingMarkerId) {
                    // Update existing marker in state
                    setMarkers(prev => prev.map(m => m.id === editingMarkerId ? completeMarker : m));
                } else {
                    // Add new marker to state
                    setMarkers(prev => [...prev, completeMarker]);
                }
            } else {
                fetchMarkers(); // Refresh data from DB
            }

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to save marker");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (marker: MarkerData) => {
        try {
            await deleteMarker(marker.id);
            toast.success("Marker deleted");
            fetchMarkers(); // Refresh data
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to delete marker");
        }
    };

    return {
        isOpen,
        setIsOpen,
        isLoading,
        tempMarker,
        markers,
        sentiment,
        setSentiment,
        responseText,
        setResponseText,
        openSheet,
        openEditSheet,
        closeSheet,
        submit,
        handleDelete,
        fetchMarkers,
    };
}
