import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getMarkers } from '@/lib/api';
import { MapView, type ViewMode } from '@/components/map-view';
import { ModeToggle } from '@/components/mode-toggle';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { subMinutes, subHours, isAfter, startOfDay } from 'date-fns';
import { Layers, Activity, ShieldCheck, Filter, Hexagon, Map as MapIcon } from 'lucide-react';
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

interface MarkerData {
    id: string;
    latitude: number;
    longitude: number;
    sentiment: 'like' | 'dislike';
    comment?: string;
    created_at: string; // ISO string
    updated_at?: string;
    deleted_at?: string;
    isNew?: boolean;
}

type TimeRange = '15m' | '1h' | 'today' | 'all';
type SentimentFilter = 'all' | 'like' | 'dislike';

export function StatsPage() {
    const [markers, setMarkers] = useState<MarkerData[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('markers');
    const [timeRange, setTimeRange] = useState<TimeRange>('all');
    const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
    const [isLive, setIsLive] = useState(false);
    const [searchVersion, setSearchVersion] = useState<string>('');
    const [isPulling, setIsPulling] = useState(false);

    // Ref to track existing IDs for "new" detection during polling
    const markersRef = useRef<Set<string>>(new Set());

    const fetchMarkers = async (isPolling = false) => {
        if (!isPolling) setIsPulling(true);
        try {
            const data = await getMarkers(searchVersion);
            const dbMarkers = data as MarkerData[];

            // Diffing logic to find NEW items for animation
            const newMarkers = dbMarkers.map(m => {
                const known = markersRef.current.has(m.id);
                // If polling and not known, mark as new
                if (isPolling && !known) {
                    return { ...m, isNew: true };
                }
                return m;
            });

            // Update ID Set
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

            // Clear isNew flags after 5s for newly detected items
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
    };

    // Manual Poll
    const handlePull = () => {
        markersRef.current.clear();
        fetchMarkers(false);
    };

    useEffect(() => {
        handlePull();
    }, [searchVersion]);

    useEffect(() => {
        if (!isLive) return;

        const POLL_INTERVAL = 5000;
        const interval = setInterval(() => {
            fetchMarkers(true);
        }, POLL_INTERVAL);

        return () => clearInterval(interval);
    }, [isLive, searchVersion]);

    // --- Filtering Logic (Unchanged) ---
    const filteredMarkers = useMemo(() => {
        const now = new Date();
        return markers.filter(m => {
            const date = new Date(m.created_at);

            // Time Filter
            let passTime = true;
            if (timeRange === '15m') passTime = isAfter(date, subMinutes(now, 15));
            else if (timeRange === '1h') passTime = isAfter(date, subHours(now, 1));
            else if (timeRange === 'today') passTime = isAfter(date, startOfDay(now));

            // Sentiment Filter
            let passSentiment = true;
            if (sentimentFilter !== 'all') passSentiment = m.sentiment === sentimentFilter;

            // Safety: deleted_at should be null from API, but double check
            return passTime && passSentiment && !m.deleted_at;
        });
    }, [markers, timeRange, sentimentFilter]);

    // --- KPI Calculations (Unchanged) ---
    const kpis = useMemo(() => {
        const total = filteredMarkers.length;
        const likes = filteredMarkers.filter(m => m.sentiment === 'like').length;
        const positivity = total > 0 ? Math.round((likes / total) * 100) : 0;

        const now = new Date();
        const velocity = markers.filter(m => isAfter(new Date(m.created_at), subMinutes(now, 15))).length;

        return { total, positivity, velocity };
    }, [filteredMarkers, markers]);


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
                        <h1 className="text-xl font-bold tracking-tight">PPGIS Live Dashboard</h1>
                        <p className="text-sm text-muted-foreground">Real-time stats (Polling)</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* KPIs */}
                    <div className="hidden md:flex gap-4 mr-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-lg border">
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                            <div>
                                <div className="text-xs text-muted-foreground font-semibold uppercase">Safety Score</div>
                                <div className="font-bold tabular-nums">{kpis.positivity}%</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-lg border">
                            <Activity className="h-4 w-4 text-blue-500" />
                            <div>
                                <div className="text-xs text-muted-foreground font-semibold uppercase">Velocity (15m)</div>
                                <div className="font-bold tabular-nums">{kpis.velocity}</div>
                            </div>
                        </div>
                    </div>
                    <ModeToggle />
                </div>
            </header>

            {/* Map Content */}
            <main className="flex-1 relative isolate min-h-0">
                <MapView markers={filteredMarkers} viewMode={viewMode} />

                {/* Floating Controls Overlay */}
                <div className="absolute top-4 left-4 z-[400] flex flex-col gap-4 max-w-[280px]">

                    {/* Primary Stats Card */}
                    <Card className="shadow-xl border-border/50 backdrop-blur-sm bg-card/90">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div>
                                <div className="text-3xl font-bold tabular-nums">{kpis.total}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Visible Points</div>
                            </div>
                            <div className="h-8 w-px bg-border/50" />
                            {/* Mobile Only KPIs (Mini) */}
                            <div className="md:hidden flex flex-col items-end">
                                <span className="text-xs text-green-600 font-bold">{kpis.positivity}% +</span>
                                <span className="text-xs text-blue-600 font-bold">{kpis.velocity} / 15m</span>
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

                            {/* Version Filter */}
                            <div className="space-y-2 pt-2 border-t">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground px-1 flex items-center gap-1">
                                    <Layers className="h-3 w-3" /> Version Filter
                                </label>
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

                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

export default StatsPage;
