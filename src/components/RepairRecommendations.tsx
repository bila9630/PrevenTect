import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hammer, ShieldCheck, PanelLeft as WindowIcon, Home, ExternalLink, AlertTriangle } from 'lucide-react';

type AIItem = { title: string; detail: string; tags?: string[] };

type RepairRecommendationsProps = {
    damageType?: string;
    description?: string;
    location?: string;
    aiItems?: AIItem[];
};

type RecItem = {
    id: string;
    title: string;
    detail: string;
    icon: React.ReactNode;
    tags?: string[];
};

const toLower = (s?: string) => (s || '').toLowerCase();

function buildRecommendations(damageType?: string, description?: string): RecItem[] {
    const t = toLower(damageType);
    const d = toLower(description);

    const recs: RecItem[] = [];

    const has = (re: RegExp) => re.test(d);

    const isHail = /hagel/.test(t) || /hagel/.test(d);
    const isStorm = /sturm|wind/.test(t) || /sturm|wind/.test(d);

    // Windows and glass
    if (has(/fenster|scheibe|glas/)) {
        if (has(/holz|holzrahmen/)) {
            recs.push({
                id: 'win-frame',
                title: 'Fenster-Holzrahmen',
                detail:
                    'Holzrahmen sind bei Hagel anfälliger. Empfehlung: Metallrahmen (Alu/Stahl) oder Holz/Alu-Verbund für höhere Schlagfestigkeit; zusätzlich Kantenschutz/Schlagleisten an Wetterseite.',
                icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
                tags: ['Fenster', 'Holzrahmen'],
            });
        }
        recs.push({
            id: 'win-glass',
            title: 'Sicherheitsglas und Schutz',
            detail:
                'Verbundsicherheitsglas (VSG) oder gehärtetes Glas reduziert Bruchrisiken. Außenliegende Rollläden oder Sturmschutz-Lamellen bieten zusätzlichen Schutz bei Hagel und Sturm.',
            icon: <ShieldCheck className="h-4 w-4 text-primary" />,
            tags: ['Glas', isHail ? 'Hagel' : 'Schlag'],
        });
        recs.push({
            id: 'win-seals',
            title: 'Dichtungen & Beschläge erneuern',
            detail:
                'Poröse Dichtungen ersetzen und Beschläge nachstellen/schmieren. Dadurch werden Wassereintritt und Rahmenverzug nach Starkwetterereignissen reduziert.',
            icon: <Hammer className="h-4 w-4 text-primary" />,
            tags: ['Fenster', 'Wartung'],
        });
    }

    // Roof
    if (has(/dach|ziegel|unterdach|trapez/)) {
        recs.push({
            id: 'roof-material',
            title: 'Hagelresistente Dacheindeckung',
            detail:
                'Setzen Sie auf hagelgeprüfte Materialien (z. B. Hagelwiderstandsklasse 4–5) oder Metall-/Faserzement-Paneele. Sturmklammern erhöhen die Sturmsicherheit von Ziegeln.',
            icon: <Home className="h-4 w-4 text-primary" />,
            tags: ['Dach', 'HW-Klasse 4–5'],
        });
        // Roof-specific: add targeted storm fix as well
        recs.push({
            id: 'roof-storm',
            title: 'Sturmklammern & Firstabdichtung',
            detail:
                'Ziegel mit Sturmklammern sichern, First- und Ortgangbereiche abdichten. Unterdachbahnen und Anschlüsse (z. B. Kamin) auf Risse prüfen und abdichten.',
            icon: <Hammer className="h-4 w-4 text-primary" />,
            tags: ['Dach', 'Sturm'],
        });
    }

    // Facade
    if (has(/fassade|putz/)) {
        recs.push({
            id: 'facade',
            title: 'Schlagzähe Fassadensysteme',
            detail:
                'Elastische, hagelresistente Putze oder vorgehängte Fassadenplatten reduzieren Abplatzungen. Prüfen Sie Systeme mit geprüfter Hagelklasse.',
            icon: <ShieldCheck className="h-4 w-4 text-primary" />,
            tags: ['Fassade', 'Hagelschutz'],
        });
        recs.push({
            id: 'facade-joints',
            title: 'Fassadenfugen & Anprallschutz',
            detail:
                'Fugen im Sockel- und Fensteranschlussbereich elastisch nachziehen. In Schlagbereichen (z. B. Wetterseite) Anprallschutzleisten oder Platten vorsehen.',
            icon: <Hammer className="h-4 w-4 text-primary" />,
            tags: ['Fassade', 'Detail'],
        });
    }

    // Solar PV
    if (has(/solaranlage|pv|photovoltaik/)) {
        recs.push({
            id: 'pv',
            title: 'PV-Hagelschutz & Montage',
            detail:
                'Module mit hagelresistentem Glas, angepasstem Neigungswinkel und robusten Montagesystemen. Schutznetze können punktuelle Einschläge abschwächen.',
            icon: <ShieldCheck className="h-4 w-4 text-primary" />,
            tags: ['PV', 'Hagel'],
        });
    }

    // Storm-specific tips
    if (isStorm) {
        recs.push({
            id: 'storm-fixing',
            title: 'Sturmfeste Befestigungen',
            detail:
                'Verstärkte Befestigungen an Dach- und Fassadenteilen, Sturmklammern sowie geprüftes Beschlagmaterial mindern Windsogschäden.',
            icon: <Hammer className="h-4 w-4 text-primary" />,
            tags: ['Sturm', 'Befestigung'],
        });
    }

    // Gutters/drainage if roof or facade present
    if (has(/dach|rinne|ablauf|fallrohr|fassade/)) {
        recs.push({
            id: 'drainage',
            title: 'Dachrinnen & Abläufe freihalten',
            detail:
                'Laub und Schmutz aus Rinnen/Fallrohren entfernen, Ablaufgitter einsetzen. Freie Entwässerung verhindert Überläufe und Feuchteschäden nach Starkregen.',
            icon: <ShieldCheck className="h-4 w-4 text-primary" />,
            tags: ['Entwässerung'],
        });
    }

    // If nothing specific matched, add a general hail tip
    if (!recs.length) {
        recs.push({
            id: 'general',
            title: 'Wetterfeste Materialien wählen',
            detail:
                'Robuste Materialien und geprüfte Systeme (Hagel- und Sturmklassen) verbessern die Widerstandsfähigkeit Ihres Gebäudes nachhaltig.',
            icon: <ShieldCheck className="h-4 w-4 text-primary" />,
            tags: ['Allgemein'],
        });
    }

    return recs;
}

export default function RepairRecommendations({ damageType, description, location, aiItems }: RepairRecommendationsProps) {
    const recs = (aiItems && aiItems.length)
        ? aiItems.map((it, i) => ({ id: String(i), title: it.title, detail: it.detail, icon: <ShieldCheck className="h-4 w-4 text-primary" />, tags: it.tags }))
        : buildRecommendations(damageType, description);

    const chips = [damageType, ...(description ? [description] : [])]
        .filter(Boolean)
        .slice(0, 2);

    return (
        <Card className="bg-transparent border-border">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Empfehlungen zur Reparatur & Prävention</CardTitle>
                <div className="mt-2 flex flex-wrap gap-2">
                    {chips.map((c, i) => (
                        <Badge key={i} variant="secondary" className="max-w-[200px] truncate">{c as string}</Badge>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {recs.map((r) => (
                    <div key={r.id} className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3">
                        <div className="mt-0.5">{r.icon}</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="font-medium text-sm text-foreground">{r.title}</p>
                                <div className="hidden md:flex flex-wrap gap-1">
                                    {(r.tags || []).map((t) => (
                                        <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {r.detail}
                            </p>
                        </div>
                    </div>
                ))}

                <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="default" className="gap-2">
                        <Hammer className="h-4 w-4" /> Partnerbetriebe anfragen
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-2">
                        <ExternalLink className="h-4 w-4" /> Mehr zu Hagel- und Sturmklassen
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
