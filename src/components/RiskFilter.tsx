import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { triggerConfettiSideCannons } from '@/lib/confetti';

interface RiskData {
    GWR_EGID?: number | string;
    STURM?: number;
    STURM_TEXT?: string;
    HOCHWASSER_FLIESSGEWAESSER?: number | null;
    FLIESSGEWAESSER_TEXT_DE?: string;
}

interface MarkerInput {
    lat: number;
    lng: number;
    address: string;
    riskData?: RiskData;
}

interface RiskFilterProps {
    riskMode: 'water' | 'wind';
    setRiskMode: (mode: 'water' | 'wind') => void;
    waterThreshold: number[];
    setWaterThreshold: (threshold: number[]) => void;
    windThreshold: number[];
    setWindThreshold: (threshold: number[]) => void;
    selectedBuilding: {
        address: string;
        riskData?: RiskData;
        markerId: string;
    } | null;
    markersData: MarkerInput[];
    showCard?: boolean;
}

const RiskFilter: React.FC<RiskFilterProps> = ({
    riskMode,
    setRiskMode,
    waterThreshold,
    setWaterThreshold,
    windThreshold,
    setWindThreshold,
    selectedBuilding,
    markersData,
    showCard = true
}) => {
    const content = (
        <>
            {/* Risk Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-10">
                <button
                    onClick={() => setRiskMode('water')}
                    className={`flex items-center justify-center px-3 py-2 rounded-md transition-colors ${riskMode === 'water'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <span className="text-xs font-medium">Wasser</span>
                </button>

                <button
                    onClick={() => setRiskMode('wind')}
                    className={`flex items-center justify-center px-3 py-2 rounded-md transition-colors ${riskMode === 'wind'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <span className="text-xs font-medium">Wind</span>
                </button>
            </div>

            {/* Slider with value above and min/max below */}
            {riskMode === 'water' ? (
                <div className="space-y-1 relative w-full">
                    <div className="relative h-6 w-full">
                        <Slider
                            value={waterThreshold}
                            onValueChange={setWaterThreshold}
                            min={1}
                            max={6}
                            step={1}
                            className="w-full"
                        />
                        <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 pointer-events-none">
                            <span className="text-white font-bold text-sm drop-shadow-[0_0_8px_hsl(var(--primary))]">
                                ~{Math.round((waterThreshold[0] - 1) * 40)}cm
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0cm</span>
                        <span>200cm+</span>
                    </div>
                </div>
            ) : (
                <div className="space-y-1 relative w-full">
                    <div className="relative h-6 w-full">
                        <Slider
                            value={windThreshold}
                            onValueChange={setWindThreshold}
                            min={25}
                            max={38}
                            step={1}
                            className="w-full"
                        />
                        <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 pointer-events-none">
                            <span className="text-white font-bold text-sm drop-shadow-[0_0_8px_hsl(var(--primary))]">
                                {windThreshold[0] * 4} km/h
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>100 km/h</span>
                        <span>152+ km/h</span>
                    </div>
                </div>
            )}

            {/* Send Info Button */}
            <div className="mt-8 pt-6">
                {(() => {
                    if (selectedBuilding) {
                        // Show selected building address
                        return (
                            <ConfirmDialog
                                trigger={
                                    <Button className="w-full py-3 px-4 font-medium bg-red-600 hover:bg-red-700 text-white">
                                        Info an {selectedBuilding.address} senden!
                                    </Button>
                                }
                                title="Sind Sie sicher?"
                                description={`Möchten Sie die Informationen an ${selectedBuilding.address} senden? Diese Aktion kann nicht rückgängig gemacht werden.`}
                                confirmText="Ja, senden"
                                cancelText="Abbrechen"
                                onConfirm={() => {
                                    triggerConfettiSideCannons();
                                    console.log(`Sending info to ${selectedBuilding.address}`);
                                }}
                            />
                        );
                    } else {
                        // No selection - show count of visible markers
                        const visibleMarkersCount = markersData.filter(coord => {
                            let riskValue;
                            if (riskMode === 'water') {
                                riskValue = coord.riskData?.HOCHWASSER_FLIESSGEWAESSER;
                                return Number(riskValue) >= waterThreshold[0];
                            } else {
                                riskValue = coord.riskData?.STURM;
                                return Number(riskValue) >= windThreshold[0];
                            }
                        }).length;

                        const hasEnoughMarkers = visibleMarkersCount > 0;

                        return (
                            <ConfirmDialog
                                trigger={
                                    <Button
                                        className={`w-full py-3 px-4 font-medium ${hasEnoughMarkers
                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                            : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                            }`}
                                        disabled={!hasEnoughMarkers}
                                    >
                                        {hasEnoughMarkers
                                            ? `Info an ${visibleMarkersCount} Liegenschaften senden!`
                                            : 'Info an Liegenschaften senden'
                                        }
                                    </Button>
                                }
                                title="Sind Sie sicher?"
                                description={`Möchten Sie die Informationen an ${visibleMarkersCount} Liegenschaften senden? Diese Aktion kann nicht rückgängig gemacht werden.`}
                                confirmText="Ja, senden"
                                cancelText="Abbrechen"
                                onConfirm={() => {
                                    triggerConfettiSideCannons();
                                    console.log(`Sending info to ${visibleMarkersCount} properties`);
                                }}
                            />
                        );
                    }
                })()}
            </div>
        </>
    );

    if (showCard) {
        return (
            <Card className="w-full bg-background/90 backdrop-blur-sm border-border shadow-lg">
                <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-base font-semibold text-gray-600">
                        Risiko Filter
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                    {content}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4 p-4">
            {content}
        </div>
    );
};

export default RiskFilter;
