import { useState } from 'react';
import { toast } from 'sonner';
import { saveMarker } from '@/lib/api';

export type Sentiment = 'like' | 'dislike';

export interface MarkerData {
    id: string;
    latitude: number;
    longitude: number;
    sentiment: Sentiment;
}


export function useSubmitMarker(version?: number) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tempMarker, setTempMarker] = useState<{ lat: number; lng: number } | null>(null);
    const [sentiment, setSentiment] = useState<Sentiment | null>(null);
    const [responseText, setResponseText] = useState('');

    // List of permanent markers (would come from DB in real app)
    const [markers, setMarkers] = useState<MarkerData[]>([]);

    const openSheet = (lat: number, lng: number) => {
        setTempMarker({ lat, lng });
        setSentiment(null);
        setResponseText('');
        setIsOpen(true);
    };

    const closeSheet = () => {
        setIsOpen(false);
        setTempMarker(null);
        setSentiment(null);
        setResponseText('');
    };

    const submit = async () => {
        if (!tempMarker || !sentiment) {
            toast.error("Please select a sentiment (Like/Dislike)");
            return;
        }

        setIsLoading(true);

        try {
            const result = await saveMarker({
                latitude: tempMarker.lat,
                longitude: tempMarker.lng,
                sentiment,
                comment: responseText,
                version
            });

            toast.success("Marker saved successfully!");

            // Add to local state (optimistic or confirmed)
            const newMarker: MarkerData = {
                id: result.id || Math.random().toString(),
                latitude: tempMarker.lat,
                longitude: tempMarker.lng,
                sentiment: sentiment
            };

            setMarkers(prev => [...prev, newMarker]);
            closeSheet();

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to save marker");
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isOpen,
        setIsOpen, // Exposed for Sheet onOpenChange
        isLoading,
        tempMarker,
        markers,
        sentiment,
        setSentiment,
        responseText,
        setResponseText,
        openSheet,
        closeSheet,
        submit
    };
}
