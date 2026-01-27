import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet';
import { ShieldCheck, TriangleAlert, Pencil, Trash2 } from 'lucide-react';
import type { MarkerData } from '@/components/map-view';

interface MarkerDetailSheetProps {
    marker: MarkerData | null;
    isOpen: boolean;
    onClose: () => void;
    editable?: boolean;
    onEdit?: (marker: MarkerData) => void;
    onDelete?: (marker: MarkerData) => void;
}

export function MarkerDetailSheet({
    marker,
    isOpen,
    onClose,
    editable = false,
    onEdit,
    onDelete,
}: MarkerDetailSheetProps) {
    if (!marker) return null;

    const isSafe = marker.sentiment === 'like';

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="bottom" className="m-4 rounded-2xl border border-border/50 shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto z-[500] dark:bg-card/95 backdrop-blur-sm overflow-hidden pb-6 px-6 pt-6">
                <SheetHeader className="text-left mb-4">
                    <SheetTitle className="text-xl font-bold flex items-center gap-2">
                        {isSafe ? (
                            <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        ) : (
                            <TriangleAlert className="h-6 w-6 text-rose-500" />
                        )}
                        {isSafe ? 'Safe Location' : 'Unsafe Location'}
                    </SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground">
                        Marker Details
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-4">
                    {/* Comment Display */}
                    <div className="p-4 bg-muted/50 rounded-xl min-h-[80px]">
                        <p className="text-foreground text-base">
                            {marker.comment || <span className="text-muted-foreground italic">No comment provided.</span>}
                        </p>
                    </div>

                    {/* Actions (Only if editable) */}
                    {editable && (
                        <SheetFooter className="flex-row gap-3 mt-4">
                            <Button
                                variant="outline"
                                className="flex-1 h-11 rounded-xl"
                                onClick={() => onEdit?.(marker)}
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 h-11 rounded-xl"
                                onClick={() => onDelete?.(marker)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        </SheetFooter>
                    )}

                    {/* Close Button (Read-only mode) */}
                    {!editable && (
                        <SheetFooter className="mt-4">
                            <Button variant="ghost" onClick={onClose} className="w-full h-11 rounded-xl">
                                Close
                            </Button>
                        </SheetFooter>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
