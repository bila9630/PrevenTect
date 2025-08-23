import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export interface ImageUploadProps {
    images: File[];
    onAdd: (files: File[]) => void;
    onRemove: (index: number) => void;
    onDone: () => void | Promise<void>;
    onSkip: () => void | Promise<void>;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ images, onAdd, onRemove, onDone, onSkip }) => {
    const { toast } = useToast();

    const handleFiles = (files: File[]) => {
        if (files.length > 0) {
            onAdd(files);
            toast({ description: `${files.length} Bild(er) hochgeladen` });
        }
    };

    return (
        <div className="mt-3 ml-8">
            <div className="max-w-md">
                <div
                    className="relative border-2 border-dashed border-border rounded-lg p-6 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-primary', 'bg-primary/10');
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-primary', 'bg-primary/10');
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-primary', 'bg-primary/10');
                        const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
                        handleFiles(files);
                    }}
                    onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.multiple = true;
                        input.onchange = (e) => {
                            const files = Array.from(((e.target as HTMLInputElement).files) || []);
                            handleFiles(files);
                        };
                        input.click();
                    }}
                >
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">Bilder hochladen</p>
                            <p className="text-xs text-muted-foreground mt-1">Bilder hier ablegen oder klicken zum Auswählen</p>
                        </div>
                    </div>
                </div>

                {images.length > 0 ? (
                    <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">Hochgeladene Bilder:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {images.map((file, index) => (
                                <div key={index} className="relative bg-card border border-border rounded-lg p-2 group">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center shrink-0">
                                            <Upload className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemove(index);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                                        >
                                            <X className="h-3 w-3 text-destructive" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end mt-3">
                            <Button size="sm" onClick={onDone}>
                                Fertig
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm" onClick={onSkip}>
                            Überspringen
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageUpload;
