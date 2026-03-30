'use client';

import * as React from 'react';
import { Settings2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAIPreferences } from '@/hooks/useAIPreferences';
import { AIPromptPreferences } from '@/types/ai';

export function AIPreferencesDialog() {
    const { preferences, savePreferences, isLoading } = useAIPreferences();
    const [open, setOpen] = React.useState(false);

    const [localPrefs, setLocalPrefs] = React.useState<AIPromptPreferences>({
        difficulty: 'intermediate',
        style: 'socratic',
        length: 'standard',
        focusAreas: '',
    });

    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (open && !isLoading) {
            setLocalPrefs(preferences);
        }
    }, [open, preferences, isLoading]);

    const handleSave = async () => {
        setIsSaving(true);
        const success = await savePreferences(localPrefs);
        setIsSaving(false);
        if (success) setOpen(false);
    };

    const focusLen = (localPrefs.focusAreas ?? '').length;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-semibold" style={{ border: '1px solid var(--border-default)', background: 'var(--surface-raised)' }}>
                    <Settings2 className="w-3.5 h-3.5" />
                    Settings
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">AI Generation Preferences</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-12 flex justify-center">
                        <div data-testid="loading-dots" className="flex items-center gap-1.5">
                            {[0, 1, 2].map((i) => (
                                <span
                                    key={i}
                                    className="block w-2 h-2 rounded-full"
                                    style={{
                                        background: 'var(--color-primary-400)',
                                        animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 py-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Tailor how the AI generates discussion prompts. These settings apply to all future generations.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <label htmlFor="difficulty" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Difficulty</label>
                                    <PrefInfo tooltip="Basic tests recall. Intermediate applies concepts. Advanced requires analysis." />
                                </div>
                                <select
                                    id="difficulty"
                                    value={localPrefs.difficulty}
                                    onChange={(e) => setLocalPrefs({ ...localPrefs, difficulty: e.target.value as AIPromptPreferences['difficulty'] })}
                                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                >
                                    <option value="basic">Basic</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <label htmlFor="style" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Style</label>
                                    <PrefInfo tooltip="Socratic encourages reasoning. Factual tests recall. Clinical is case-based." />
                                </div>
                                <select
                                    id="style"
                                    value={localPrefs.style}
                                    onChange={(e) => setLocalPrefs({ ...localPrefs, style: e.target.value as AIPromptPreferences['style'] })}
                                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                >
                                    <option value="socratic">Socratic</option>
                                    <option value="factual">Factual</option>
                                    <option value="clinical_scenario">Clinical</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <label htmlFor="length" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Length</label>
                                <PrefInfo tooltip="Controls how much setup the prompt includes — not the expected response length." />
                            </div>
                            <select
                                id="length"
                                value={localPrefs.length}
                                onChange={(e) => setLocalPrefs({ ...localPrefs, length: e.target.value as AIPromptPreferences['length'] })}
                                className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                            >
                                <option value="brief">Brief Setup</option>
                                <option value="standard">Standard Context</option>
                                <option value="detailed">Rich Detail</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <label htmlFor="focusAreas" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Focus Areas</label>
                                <PrefInfo tooltip="Topics the AI will prioritize. Comma-separated." />
                            </div>
                            <div className="relative">
                                <textarea
                                    id="focusAreas"
                                    value={localPrefs.focusAreas ?? ''}
                                    onChange={(e) => setLocalPrefs({ ...localPrefs, focusAreas: e.target.value })}
                                    placeholder="e.g., beta-blocker mechanisms, RAAS pathway..."
                                    className="w-full px-3 py-2.5 text-sm rounded-lg resize-none leading-snug min-h-[100px] bg-background text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                />
                                <span className={`absolute bottom-2 right-2 text-[10px] font-mono p-1 rounded bg-background/80 ${focusLen > 400 ? 'text-amber-500 font-bold' : 'text-muted-foreground'}`}>
                                    {focusLen}/500
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving} className="sm:mr-auto">
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6"
                    >
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PrefInfo({ tooltip }: { tooltip: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px] text-[11px]">
                {tooltip}
            </TooltipContent>
        </Tooltip>
    );
}
