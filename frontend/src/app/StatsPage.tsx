import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMarkers } from '@/lib/api';
import { MapView, type ViewMode, type MarkerData as BaseMarkerData } from '@/components/map-view';
import { MarkerDetailSheet } from '@/components/marker-detail-sheet';
import { ModeToggle } from '@/components/mode-toggle';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { subMinutes, subHours, isAfter, startOfDay } from 'date-fns';
import { Layers, Activity, ShieldCheck, Filter, Hexagon, Map as MapIcon, GitCompareArrows } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface StatsMarkerData extends BaseMarkerData {
    created_at: string;
    updated_at?: string;
    deleted_at?: string;
    source?: 'A' | 'B';
}

type TimeRange = '15m' | '1h' | 'today' | 'all';
type SentimentFilter = 'all' | 'like' | 'dislike';

export function StatsPage() {
    const [markers, setMarkers] = useState<StatsMarkerData[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('markers');
    const [timeRange, setTimeRange] = useState<TimeRange>('all');
    const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
    const [isLive, setIsLive] = useState(false);
    const [isPulling, setIsPulling] = useState(false);

    // Single version mode
    const [searchVersion, setSearchVersion] = useState<string>('');

    // Compare mode
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [versionA, setVersionA] = useState<string>('');
    const [versionB, setVersionB] = useState<string>('');
    const [compareView, setCompareView] = useState<'both' | 'A' | 'B'>('both');

    // Selected marker for viewing
    const [selectedMarker, setSelectedMarker] = useState<BaseMarkerData | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const markersRef = useRef<Set<string>>(new Set());

    const fetchMarkers = useCallback(async (isPolling = false) => {
        if (!isPolling) setIsPulling(true);
        try {
            let combinedMarkers: StatsMarkerData[] = [];

            if (isCompareMode) {
                // Fetch both versions
                const [dataA, dataB] = await Promise.all([
                    getMarkers(versionA),
                    getMarkers(versionB),
                ]);

                const markersA = (dataA as StatsMarkerData[]).map(m => ({ ...m, source: 'A' as const }));
                const markersB = (dataB as StatsMarkerData[]).map(m => ({ ...m, source: 'B' as const }));

                combinedMarkers = [...markersA, ...markersB];
            } else {
                // Single version mode
                const data = await getMarkers(searchVersion);
                combinedMarkers = data as StatsMarkerData[];
            }

            // Diffing logic for "new" detection
            const newMarkers = combinedMarkers.map(m => {
                const known = markersRef.current.has(m.id);
                if (isPolling && !known) {
                    return { ...m, isNew: true };
                }
                return m;
            });

            newMarkers.forEach(m => markersRef.current.add(m.id));

            setMarkers(current => {
                const currentMap = new Map(current.map(m => [m.id, m]));
                return newMarkers.map(m => {
                    const existing = currentMap.get(m.id);
                    return {
                        ...m,
                        isNew: m.isNew || existing?.isNew
                    };
                });
            });

            if (newMarkers.some(m => m.isNew)) {
                setTimeout(() => {
                    setMarkers(prev => prev.map(m => ({ ...m, isNew: false })));
                }, 5000);
            }

        } catch (error) {
            console.error('Error fetching stats:', error);
            if (!isPolling) toast.error('Failed to load data');
        } finally {
            if (!isPolling) setIsPulling(false);
        }
    }, [isCompareMode, versionA, versionB, searchVersion]);

    const handlePull = useCallback(() => {
        markersRef.current.clear();
        fetchMarkers(false);
    }, [fetchMarkers]);

    useEffect(() => {
        handlePull();
    }, [searchVersion, isCompareMode, versionA, versionB]);

    useEffect(() => {
        if (!isLive) return;

        const POLL_INTERVAL = 5000;
        const interval = setInterval(() => {
            fetchMarkers(true);
        }, POLL_INTERVAL);

        return () => clearInterval(interval);
    }, [isLive, fetchMarkers]);

    // --- Filtering Logic ---
    const filteredMarkers = useMemo(() => {
        const now = new Date();
        return markers.filter(m => {
            const date = new Date(m.created_at);

            let passTime = true;
            if (timeRange === '15m') passTime = isAfter(date, subMinutes(now, 15));
            else if (timeRange === '1h') passTime = isAfter(date, subHours(now, 1));
            else if (timeRange === 'today') passTime = isAfter(date, startOfDay(now));

            let passSentiment = true;
            if (sentimentFilter !== 'all') passSentiment = m.sentiment === sentimentFilter;

            // Compare mode source filter
            let passSource = true;
            if (isCompareMode && compareView !== 'both') {
                passSource = m.source === compareView;
            }

            return passTime && passSentiment && passSource && !m.deleted_at;
        });
    }, [markers, timeRange, sentimentFilter, isCompareMode, compareView]);

    // --- KPI Calculations ---
    const kpis = useMemo(() => {
        if (isCompareMode) {
            const markersA = filteredMarkers.filter(m => m.source === 'A');
            const markersB = filteredMarkers.filter(m => m.source === 'B');

            const totalA = markersA.length;
            const totalB = markersB.length;

            const likesA = markersA.filter(m => m.sentiment === 'like').length;
            const likesB = markersB.filter(m => m.sentiment === 'like').length;

            const positivityA = totalA > 0 ? Math.round((likesA / totalA) * 100) : 0;
            const positivityB = totalB > 0 ? Math.round((likesB / totalB) * 100) : 0;

            return {
                total: `${totalA} / ${totalB}`,
                positivity: `${positivityA}% / ${positivityB}%`,
                velocity: '-',
                isCompare: true,
            };
        } else {
            const total = filteredMarkers.length;
            const likes = filteredMarkers.filter(m => m.sentiment === 'like').length;
            const positivity = total > 0 ? Math.round((likes / total) * 100) : 0;

            const now = new Date();
            const velocity = markers.filter(m => isAfter(new Date(m.created_at), subMinutes(now, 15))).length;

            return { total: String(total), positivity: `${positivity}%`, velocity: String(velocity), isCompare: false };
        }
    }, [filteredMarkers, markers, isCompareMode]);


    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground">
            {/* Header */}
            <header className="flex-none p-4 border-b flex items-center justify-between bg-card z-10 shadow-sm relative">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-xl">
                        <Link to="/">
                            <MapIcon className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Community Safety Map Perspectives</h1>
                        <p className="text-sm text-muted-foreground">
                            {isCompareMode ? `Comparing: ${versionA || 'All'} vs ${versionB || 'All'}` : 'Real-time stats'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* KPIs */}
                    <div className="hidden md:flex gap-4 mr-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-lg border">
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                            <div>
                                <div className="text-xs text-muted-foreground font-semibold uppercase">Safety Score</div>
                                <div className="font-bold tabular-nums">{kpis.positivity}</div>
                            </div>
                        </div>
                        {!kpis.isCompare && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-lg border">
                                <Activity className="h-4 w-4 text-blue-500" />
                                <div>
                                    <div className="text-xs text-muted-foreground font-semibold uppercase">Velocity (15m)</div>
                                    <div className="font-bold tabular-nums">{kpis.velocity}</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <ModeToggle />
                </div>
            </header>

            {/* Map Content */}
            <main className="flex-1 relative isolate min-h-0">
                <MapView
                    markers={filteredMarkers}
                    viewMode={viewMode}
                    onMarkerClick={(marker) => {
                        setSelectedMarker(marker);
                        setIsDetailOpen(true);
                    }}
                />

                {/* Marker Detail Sheet (Read-Only) */}
                <MarkerDetailSheet
                    marker={selectedMarker}
                    isOpen={isDetailOpen}
                    onClose={() => setIsDetailOpen(false)}
                    editable={false}
                />

                {/* Floating Controls Overlay */}
                <div className="absolute top-4 left-4 z-[400] flex flex-col gap-4 max-w-[280px]">

                    {/* Primary Stats Card */}
                    <Card className="shadow-xl border-border/50 backdrop-blur-sm bg-card/90">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div>
                                <div className="text-3xl font-bold tabular-nums">{kpis.total}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                    {isCompareMode ? 'A / B Points' : 'Visible Points'}
                                </div>
                            </div>
                            <div className="h-8 w-px bg-border/50" />
                            <div className="md:hidden flex flex-col items-end">
                                <span className="text-xs text-green-600 font-bold">{kpis.positivity}</span>
                                {!kpis.isCompare && <span className="text-xs text-blue-600 font-bold">{kpis.velocity} / 15m</span>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* View Control */}
                    <Card className="shadow-lg border-border/50 backdrop-blur-md bg-card/80">
                        <CardContent className="p-2 space-y-3">
                            {/* Visualization Mode */}
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground px-1 flex items-center gap-1">
                                    <Layers className="h-3 w-3" /> Visualization
                                </label>
                                <ToggleGroup type="single" value={viewMode} onValueChange={(v: ViewMode) => v && setViewMode(v)} className="justify-start">
                                    <ToggleGroupItem value="markers" aria-label="Markers" size="sm" className="flex-1">
                                        Markers
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="heatmap" aria-label="Heatmap" size="sm" className="flex-1">
                                        Heatmap
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="h3" aria-label="Grid" size="sm" className="flex-1">
                                        <Hexagon className="h-3 w-3 mr-1" /> Grid
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </div>

                            {/* Live & Pull Controls */}
                            <div className="space-y-2 pt-2 border-t">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground px-1 flex items-center gap-1">
                                    <Activity className="h-3 w-3" /> Controls
                                </label>
                                <div className="flex gap-2">
                                    <Button
                                        variant={isLive ? "default" : "outline"}
                                        size="sm"
                                        className={cn("flex-1 h-8 text-[11px]", isLive && "bg-blue-600 hover:bg-blue-700")}
                                        onClick={() => setIsLive(!isLive)}
                                    >
                                        <Activity className={cn("h-3 w-3 mr-1", isLive && "animate-pulse")} />
                                        {isLive ? "Stop Live" : "Go Live"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-8 text-[11px]"
                                        onClick={handlePull}
                                        disabled={isPulling}
                                    >
                                        <Filter className={cn("h-3 w-3 mr-1", isPulling && "animate-spin")} />
                                        {isPulling ? "Pulling..." : "Pull Data"}
                                    </Button>
                                </div>
                            </div>

                            {/* Compare Mode Toggle */}
                            <div className="space-y-2 pt-2 border-t">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground px-1 flex items-center gap-1">
                                    <GitCompareArrows className="h-3 w-3" /> Compare Mode
                                </label>
                                <Button
                                    variant={isCompareMode ? "default" : "outline"}
                                    size="sm"
                                    className={cn("w-full h-8 text-[11px]", isCompareMode && "bg-purple-600 hover:bg-purple-700")}
                                    onClick={() => {
                                        setIsCompareMode(!isCompareMode);
                                        setCompareView('both');
                                    }}
                                >
                                    <GitCompareArrows className="h-3 w-3 mr-1" />
                                    {isCompareMode ? "Exit Compare" : "Compare Versions"}
                                </Button>

                                {/* View Toggle: A / Both / B */}
                                {isCompareMode && (
                                    <div className="flex gap-1 pt-2">
                                        <Button
                                            variant={compareView === 'A' ? "default" : "outline"}
                                            size="sm"
                                            className={cn("flex-1 h-7 text-[10px]", compareView === 'A' && "bg-blue-600 hover:bg-blue-700")}
                                            onClick={() => setCompareView('A')}
                                        >
                                            Version A
                                        </Button>
                                        <Button
                                            variant={compareView === 'both' ? "default" : "outline"}
                                            size="sm"
                                            className={cn("flex-1 h-7 text-[10px]", compareView === 'both' && "bg-purple-600 hover:bg-purple-700")}
                                            onClick={() => setCompareView('both')}
                                        >
                                            Both
                                        </Button>
                                        <Button
                                            variant={compareView === 'B' ? "default" : "outline"}
                                            size="sm"
                                            className={cn("flex-1 h-7 text-[10px]", compareView === 'B' && "bg-orange-600 hover:bg-orange-700")}
                                            onClick={() => setCompareView('B')}
                                        >
                                            Version B
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Version Filter(s) */}
                            <div className="space-y-2 pt-2 border-t">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground px-1 flex items-center gap-1">
                                    <Layers className="h-3 w-3" /> {isCompareMode ? 'Versions A / B' : 'Version Filter'}
                                </label>
                                {isCompareMode ? (
                                    <div className="grid grid-cols-2 gap-2 px-1">
                                        <input
                                            type="text"
                                            placeholder="Version A"
                                            className="w-full h-8 px-2 text-xs bg-muted/50 border rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-foreground"
                                            value={versionA}
                                            onChange={(e) => setVersionA(e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Version B"
                                            className="w-full h-8 px-2 text-xs bg-muted/50 border rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-foreground"
                                            value={versionB}
                                            onChange={(e) => setVersionB(e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <div className="px-1">
                                        <input
                                            type="text"
                                            placeholder="All versions"
                                            className="w-full h-8 px-2 text-xs bg-muted/50 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                                            value={searchVersion}
                                            onChange={(e) => setSearchVersion(e.target.value)}
                                        />
                                        <p className="text-[9px] text-muted-foreground mt-1">Leave empty to show all campaigns</p>
                                    </div>
                                )}
                            </div>

                            {/* Filters */}
                            <div className="space-y-2 pt-2 border-t">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground px-1 flex items-center gap-1">
                                    <Filter className="h-3 w-3" /> Filters
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Select value={timeRange} onValueChange={(v: TimeRange) => setTimeRange(v)}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="15m">Last 15m</SelectItem>
                                            <SelectItem value="1h">Last Hour</SelectItem>
                                            <SelectItem value="today">Today</SelectItem>
                                            <SelectItem value="all">All Time</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={sentimentFilter} onValueChange={(v: SentimentFilter) => setSentimentFilter(v)}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Sentiment" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="like">Safe</SelectItem>
                                            <SelectItem value="dislike">Unsafe</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Compare Mode Legend */}
                            {isCompareMode && (
                                <div className="space-y-2 pt-2 border-t">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Legend</label>
                                    <div className="flex gap-4 px-1 text-[10px]">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                                            <span>Version A (solid)</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500/40 border-2 border-emerald-500 border-dashed" />
                                            <span>Version B (dashed)</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

export default StatsPage;
