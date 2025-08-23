import React from 'react';
import { MapPin, Calendar as CalendarIcon, Image as ImageIcon, FileText, CloudLightning, Wrench, AlertTriangle, Hammer, Clock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export interface DamageSummaryProps {
    location?: string;
    damageType?: string;
    description?: string;
    dateISO?: string;
    imagesCount?: number;
    className?: string;
}

const LabelRow = ({ icon, label, children, className }: { icon: React.ReactNode; label: string; children: React.ReactNode; className?: string }) => (
    <div className={cn("flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/15 p-3 shadow-sm", className)}>
        <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-wide text-primary/80">{label}</div>
            <div className="text-sm text-foreground/90 truncate" title={typeof children === 'string' ? children : undefined as unknown as string}>
                {children}
            </div>
        </div>
    </div>
);

const DamageSummary: React.FC<DamageSummaryProps> = ({ location, damageType, description, dateISO, imagesCount, className }) => {
    const hasAny = location || damageType || description || dateISO || typeof imagesCount === 'number';
    if (!hasAny) return null;

    const formattedDate = dateISO ? format(parseISO(dateISO), 'dd.MM.yyyy') : undefined;

    // Heuristic analysis to derive insights from provided info
    const analyze = () => {
        const desc = (description || '').toLowerCase();
        const type = (damageType || '').toLowerCase();

        const componentRules: Array<{ key: string; comp: string }>
            = [
                { key: 'fenster', comp: 'Fenster' },
                { key: 'scheibe', comp: 'Fenster' },
                { key: 'glas', comp: 'Fenster' },
                { key: 'dach', comp: 'Dach' },
                { key: 'ziegel', comp: 'Dach' },
                { key: 'unterdach', comp: 'Dach' },
                { key: 'fassade', comp: 'Fassade' },
                { key: 'putz', comp: 'Fassade' },
                { key: 'pv', comp: 'Solaranlage' },
                { key: 'solaranlage', comp: 'Solaranlage' },
                { key: 'photovoltaik', comp: 'Solaranlage' },
                { key: 'keller', comp: 'Keller' },
                { key: 'leitung', comp: 'Leitung' },
            ];

        let component = 'Unbekannt';
        for (const r of componentRules) {
            if (desc.includes(r.key)) { component = r.comp; break; }
        }
        if (component === 'Unbekannt') {
            if (type.includes('hagel')) component = 'Dach/Fenster';
            if (type.includes('sturm')) component = 'Dach/Fassade';
        }

        const isSevere = /(zerstört|komplett|völlig|zerbrochen|eingedrückt|durchgebrochen|durchlöchert|wasser(austritt|eintritt)|stark undicht)/i.test(desc);
        const isModerate = /(beschädigt|riss|risse|undicht|leck|abgedeckt|abgeplatzt)/i.test(desc) || /hagel|sturm/.test(type);
        const isMinor = /(kratzer|klein|oberflächlich|leichte)/i.test(desc);

        let severity: 'gering' | 'mittel' | 'schwer' = 'mittel';
        if (isSevere) severity = 'schwer';
        else if (isMinor) severity = 'gering';
        else if (isModerate) severity = 'mittel';

        let action = 'Prüfung/Offerte einholen';
        if (component.includes('Fenster')) action = severity === 'schwer' ? 'Austausch empfohlen' : 'Reparatur möglich';
        if (component === 'Dach' || component === 'Dach/Fenster') action = severity === 'schwer' ? 'Notabdeckung & Teilsanierung' : 'Reparatur der Deckung';
        if (component === 'Fassade') action = severity === 'schwer' ? 'Teilfläche erneuern' : 'Putz ausbessern';
        if (component === 'Solaranlage') action = severity === 'schwer' ? 'Module austauschen' : 'Module prüfen & Einzeltausch';
        if (component === 'Keller' || component === 'Leitung') action = 'Lecksuche & Trocknung';

        let risk = 'Geringe Folgerisiken';
        if (/(wasser|nässe|leck|undicht|keller|leitung)/i.test(desc)) risk = 'Wassereintritt/Schimmelrisiko';
        if (/(strom|elektrik|kabel)/i.test(desc)) risk = 'Elektrorisiko';
        if (/(glas|scheibe|fenster)/i.test(desc) && isSevere) risk = 'Sicherheitsrisiko (Scherben)';

        // Urgency based on risk and recency
        let urgency: 'niedrig' | 'normal' | 'hoch' = 'normal';
        if (risk !== 'Geringe Folgerisiken' || severity === 'schwer') urgency = 'hoch';
        // removed date-diff based urgency relaxation

        // Confidence from images and description richness
        let confidence = 55;
        if ((imagesCount || 0) >= 4) confidence += 20; else if ((imagesCount || 0) >= 1) confidence += 10;
        const len = desc.length;
        if (len > 180) confidence += 15; else if (len > 80) confidence += 8; else if (len < 20) confidence -= 10;
        if (isSevere || isModerate || isMinor) confidence += 5;
        confidence = Math.max(20, Math.min(95, confidence));

        // Reasoning snippets
        const reasons: string[] = [];
        if (component !== 'Unbekannt') reasons.push(`Erkanntes Bauteil: ${component.toLowerCase()}.`);
        if (isSevere) reasons.push('Begriffe wie "zerbrochen/zerstört" deuten auf hohen Schaden.');
        else if (isModerate) reasons.push('Formulierungen wie "beschädigt/undicht" deuten auf mittleren Schaden.');
        else if (isMinor) reasons.push('Begriffe wie "klein/oberflächlich" deuten auf geringeren Schaden.');
        if ((imagesCount || 0) > 0) reasons.push(`${imagesCount} Bild(er) erhöhen die Einschätzungssicherheit.`);

        // Natural sentence for action
        let actionSentence = '';
        if (component.includes('Fenster') && severity === 'schwer') actionSentence = 'Das Fenster ist stark beschädigt – vollständiger Austausch empfohlen.';
        else if (component === 'Dach' && severity === 'schwer') actionSentence = 'Am Dach liegt ein erheblicher Schaden vor – Notabdeckung und Teilsanierung sinnvoll.';
        else if (component === 'Solaranlage' && severity === 'schwer') actionSentence = 'Mehrere PV-Module könnten defekt sein – Austausch einzelner Module nötig.';
        else if (component === 'Keller' || component === 'Leitung') actionSentence = 'Vermutete Undichtigkeit – Lecksuche und Trocknung zeitnah durchführen.';
        else actionSentence = severity === 'schwer' ? 'Austausch wahrscheinlicher als Reparatur.' : 'Reparatur voraussichtlich ausreichend.';

        return { component, severity, action, urgency, risk, confidence, reasons, actionSentence };
    };

    const derived = analyze();

    return (
        <Card className={cn('bg-emerald-900/10 border-emerald-600/30', className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
                        <CloudLightning className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base text-foreground">Erfasste Angaben</CardTitle>
                    {damageType && (
                        <Badge variant="secondary" className="ml-auto bg-emerald-500/20 text-emerald-200 border-emerald-400/30 dark:text-emerald-200">
                            {damageType}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(location || damageType) && (
                        <LabelRow icon={<MapPin className="h-4 w-4" />} label="Ort">
                            {location || <span className="text-muted-foreground">Nicht angegeben</span>}
                        </LabelRow>
                    )}

                    {dateISO && (
                        <LabelRow icon={<CalendarIcon className="h-4 w-4" />} label="Datum">
                            {formattedDate}
                        </LabelRow>
                    )}

                    {typeof imagesCount === 'number' && (
                        <LabelRow icon={<ImageIcon className="h-4 w-4" />} label="Bilder" className="md:col-span-2">
                            {imagesCount > 0 ? `${imagesCount} ${imagesCount === 1 ? 'Bild' : 'Bilder'}` : 'Keine Bilder'}
                        </LabelRow>
                    )}

                    {description && (
                        <div className="md:col-span-2">
                            <LabelRow icon={<FileText className="h-4 w-4" />} label="Beschreibung" className="bg-primary/10">
                                <span className="line-clamp-3 break-words">{description}</span>
                            </LabelRow>
                        </div>
                    )}
                </div>

                {/* Derived insights */}
                <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Automatische Einschätzung</span>
                        <Badge variant="secondary" className="ml-auto bg-muted/30 text-muted-foreground">Heuristisch</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <LabelRow icon={<Hammer className="h-4 w-4" />} label="Bauteil">
                            {derived.component}
                        </LabelRow>
                        <LabelRow icon={<AlertTriangle className="h-4 w-4" />} label="Schadensgrad">
                            <span className={cn(
                                'px-2 py-0.5 rounded-full border text-xs',
                                derived.severity === 'schwer' && 'bg-red-500/15 text-red-200 border-red-500/30',
                                derived.severity === 'mittel' && 'bg-amber-500/15 text-amber-200 border-amber-500/30',
                                derived.severity === 'gering' && 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
                            )}>
                                {derived.severity}
                            </span>
                        </LabelRow>
                        <LabelRow icon={<Clock className="h-4 w-4" />} label="Dringlichkeit">
                            {derived.urgency === 'hoch' ? 'hoch' : derived.urgency}
                        </LabelRow>
                        {/* Make Empfehlung and Hauptrisiko equal width by placing them in a two-column sub-grid */}
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                            <LabelRow icon={<Wrench className="h-4 w-4" />} label="Empfehlung">
                                {derived.action}
                            </LabelRow>
                            <LabelRow icon={<AlertTriangle className="h-4 w-4" />} label="Hauptrisiko">
                                {derived.risk}
                            </LabelRow>
                        </div>
                    </div>

                    <div className="mt-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Vertrauen</span>
                            <span>{derived.confidence}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background/40">
                            <div className="h-full rounded-full bg-primary/70" style={{ width: `${derived.confidence}%` }} />
                        </div>
                    </div>

                    <div className="text-xs text-foreground/80 leading-relaxed">
                        <span className="font-medium">Begründung: </span>
                        {derived.actionSentence} {derived.reasons.join(' ')}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default DamageSummary;
