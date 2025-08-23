import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound } from 'lucide-react';

interface ApiKeySetupCardProps {
    value: string;
    onValueChange: (value: string) => void;
    onSave: () => void;
}

const ApiKeySetupCard: React.FC<ApiKeySetupCardProps> = ({ value, onValueChange, onSave }) => {
    return (
        <div className="m-4 p-4 bg-muted/50 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">OpenAI API-Schlüssel erforderlich</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
                Gib deinen OpenAI API-Schlüssel ein, um KI-Antworten zu aktivieren
            </p>
            <div className="flex items-center gap-2">
                <Input
                    type="password"
                    placeholder="sk-..."
                    value={value}
                    onChange={(e) => onValueChange(e.target.value)}
                    className="bg-background border-border text-sm"
                />
                <Button size="sm" onClick={onSave}>Speichern</Button>
            </div>
        </div>
    );
};

export default ApiKeySetupCard;
