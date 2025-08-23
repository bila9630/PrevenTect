import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Banknote, Info } from 'lucide-react';

interface EstimateResultProps {
    text: string;
}

// A compact, visually appealing estimation result card
const EstimateResult: React.FC<EstimateResultProps> = ({ text }) => {
    // Split into soft paragraphs to improve readability
    const parts = text.split(/\n+|(?<=\.)\s{1,}/).filter(Boolean);

    return (
        <Card className="bg-emerald-900/10 border-emerald-600/30">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-emerald-500" />
                    <CardTitle className="text-base text-foreground">Vorläufige Kostenschätzung</CardTitle>
                </div>
                <div className="mt-2 flex gap-2">
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-200 border-amber-500/30">Vorläufig</Badge>
                    <Badge variant="secondary" className="bg-muted/30 text-muted-foreground">Unverbindlich</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {parts.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-foreground/90">{p}</p>
                ))}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 rounded-md border border-border/50 bg-background/40 p-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs text-foreground/80">Deckung abhängig von Police & Selbstbehalt</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-border/50 bg-background/40 p-2">
                        <Info className="h-4 w-4 text-blue-400" />
                        <span className="text-xs text-foreground/80">Endgültig nach Schadenprüfung vor Ort</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default EstimateResult;
