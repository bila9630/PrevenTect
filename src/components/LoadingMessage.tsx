import React from 'react';
import { Loader2 } from 'lucide-react';

type LoadingMessageProps = {
    steps: string[];
    currentStep?: number;
    title?: string;
};

export default function LoadingMessage({ steps, currentStep = 0, title = 'Bitte warten …' }: LoadingMessageProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm font-medium">{title}</p>
            </div>
            <ol className="text-xs space-y-1">
                {(steps || []).map((label, idx) => (
                    <li key={idx} className={`flex items-center gap-2 ${currentStep === idx ? 'text-foreground' : 'text-muted-foreground'}`}>
                        <span className={`inline-flex h-2 w-2 rounded-full ${currentStep === idx ? 'bg-primary' : 'bg-muted-foreground/40'}`}></span>
                        <span>{label}</span>
                        {currentStep === idx && (
                            <span className="ml-auto text-[10px] uppercase tracking-wide text-primary">läuft</span>
                        )}
                    </li>
                ))}
            </ol>
        </div>
    );
}
