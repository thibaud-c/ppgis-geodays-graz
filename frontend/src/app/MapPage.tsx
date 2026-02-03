import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapView, type MarkerData } from '@/components/map-view';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet';
import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { useSubmitMarker } from '@/hooks/use-submit-marker';
import { MarkerDetailSheet } from '@/components/marker-detail-sheet';
import { cn } from '@/lib/utils';

export function MapPage() {
    const [searchParams] = useSearchParams();

    // Parse version from URL (e.g.: ?version=1)
    const version = useMemo(() => {
        const v = searchParams.get('version');
        const num = parseInt(v || '', 10);
        return isNaN(num) ? undefined : num;
    }, [searchParams]);

    const {
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
    } = useSubmitMarker({ version, sessionOnly: true });

    // State for viewing existing marker details
    const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const handleMapClick = (lat: number, lng: number) => {
        openSheet(lat, lng);
    };

    const handleMarkerClick = (marker: MarkerData) => {
        setSelectedMarker(marker);
        setIsDetailOpen(true);
    };

    const handleEdit = (marker: MarkerData) => {
        setIsDetailOpen(false);
        openEditSheet(marker);
    };

    const handleDeleteConfirm = async (marker: MarkerData) => {
        setIsDetailOpen(false);
        await handleDelete(marker);
    };

    return (
        <div className="relative h-screen w-full bg-background text-foreground overflow-hidden">
            {/* Floating Header */}
            <header className="absolute top-4 left-4 right-4 z-[400] flex items-center justify-between pointer-events-none">
                <div className="pointer-events-auto rounded-xl border bg-card/80 backdrop-blur-md shadow-lg p-4 flex-1 mr-4 max-w-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-foreground">Community Safety Map Perspectives</h1>
                            <p className="text-xs text-muted-foreground">Tap map to report safety issues</p>
                        </div>
                        {/* Stats link removed */}
                    </div>
                </div>
                <div className="pointer-events-auto">
                    <ModeToggle />
                </div>
            </header>

            {/* Map Content */}
            <main className="absolute inset-0 z-0">
                <MapView
                    onMapClick={handleMapClick}
                    onMarkerClick={handleMarkerClick}
                    markers={markers}
                    tempMarker={tempMarker}
                />
            </main>

            {/* Marker Detail Sheet (View/Edit/Delete) */}
            <MarkerDetailSheet
                marker={selectedMarker}
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                editable={true}
                onEdit={handleEdit}
                onDelete={handleDeleteConfirm}
            />

            {/* Submission/Edit Sheet */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="bottom" className="m-4 rounded-2xl border border-border/50 shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto z-[500] dark:bg-card/95 backdrop-blur-sm overflow-hidden pb-6 px-6 pt-6">
                    <SheetHeader className="text-left mb-5">
                        <SheetTitle className="text-2xl font-bold text-primary">
                            {tempMarker ? 'Edit Marker' : 'Add Marker'}
                        </SheetTitle>
                        <SheetDescription className="text-base">
                            How safe does this location feel?
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-5">
                        {/* Sentiment Buttons */}
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                className={cn(
                                    "h-24 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all duration-300",
                                    sentiment === 'like' ? "text-emerald-700 dark:text-emerald-400" : "text-foreground",
                                    "hover:scale-[1.02] hover:shadow-md",
                                    sentiment === 'like'
                                        ? "border-emerald-500 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50"
                                        : "hover:border-emerald-500/50 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 opacity-80 hover:opacity-100"
                                )}
                                onClick={() => setSentiment('like')}
                            >
                                <ShieldCheck className={cn("h-8 w-8", sentiment === 'like' && "fill-current")} />
                                <span className="font-bold text-lg">Safe</span>
                            </Button>

                            <Button
                                variant="outline"
                                className={cn(
                                    "h-24 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all duration-300",
                                    sentiment === 'dislike' ? "text-rose-700 dark:text-rose-400" : "text-foreground",
                                    "hover:scale-[1.02] hover:shadow-md",
                                    sentiment === 'dislike'
                                        ? "border-rose-500 bg-rose-500/15 shadow-[0_0_20px_rgba(244,63,94,0.4)] ring-2 ring-rose-500/50"
                                        : "hover:border-rose-500/50 hover:bg-rose-500/5 dark:hover:bg-rose-500/10 opacity-80 hover:opacity-100"
                                )}
                                onClick={() => setSentiment('dislike')}
                            >
                                <TriangleAlert className={cn("h-8 w-8", sentiment === 'dislike' && "fill-current")} />
                                <span className="font-bold text-lg">Unsafe</span>
                            </Button>
                        </div>

                        {/* Comment Area */}
                        <div className="space-y-3 min-h-[120px]">
                            <Label htmlFor="comment" className="text-base font-medium text-foreground">Why? (Optional)</Label>
                            <div className="relative">
                                <Textarea
                                    id="comment"
                                    placeholder="I feel this way because..."
                                    className="resize-none min-h-[90px] text-base bg-muted/40 focus:bg-background transition-colors rounded-xl pr-12 p-3 text-foreground"
                                    maxLength={280}
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                />
                                <span className="absolute bottom-3 right-3 text-xs text-muted-foreground font-mono bg-background/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                                    {responseText.length}/280
                                </span>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <SheetFooter className="flex-col sm:flex-row gap-3 mt-5">
                            <Button onClick={submit} disabled={!sentiment || isLoading} className="w-full sm:w-auto h-12 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow rounded-xl">
                                {isLoading ? 'Saving...' : 'Save Marker'}
                            </Button>
                            <Button variant="ghost" onClick={closeSheet} disabled={isLoading} className="w-full sm:w-auto h-12 rounded-xl text-muted-foreground hover:text-foreground">
                                Cancel
                            </Button>
                        </SheetFooter>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

export default MapPage;
