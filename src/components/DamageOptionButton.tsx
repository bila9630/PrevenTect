import React from 'react';

interface DamageOptionButtonProps {
    damageType: string;
    icon: string;
    onClick: (damageType: string) => void;
}

const DamageOptionButton = ({ damageType, icon, onClick }: DamageOptionButtonProps) => {
    return (
        <button
            onClick={() => onClick(damageType)}
            className="p-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors text-center group min-h-[100px] flex flex-col justify-center"
        >
            <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <div className="text-primary text-lg">{icon}</div>
                </div>
                <span className="text-xs font-medium text-foreground leading-tight text-center break-words">
                    {damageType}
                </span>
            </div>
        </button>
    );
};

export default DamageOptionButton;
