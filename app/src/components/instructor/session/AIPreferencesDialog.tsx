'use client';

import * as React from 'react';
import { Settings2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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

    // Local state for the form so we don't save until they click "Save"
    const [localPrefs, setLocalPrefs] = React.useState<AIPromptPreferences>({
        difficulty: 'intermediate',
        style: 'socratic',
        length: 'standard',
        focusAreas: '',
    });

    const [isSaving, setIsSaving] = React.useState(false);

    // Sync local state when dialog opens or preferences load
    React.useEffect(() => {
        if (open && !isLoading) {
            setLocalPrefs(preferences);
        }
    }, [open, preferences, isLoading]);

    const handleSave = async () => {
        setIsSaving(true);
        const success = await savePreferences(localPrefs);
        setIsSaving(false);
        if (success) {
            setOpen(false);
        }
    };

    const focusLen = (localPrefs.focusAreas ?? '').length;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
                    <Settings2 className="w-3.5 h-3.5" />
                    Settings
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>AI Generation Preferences</DialogTitle>
                    <DialogDescription>
                        Tailor how the AI generates discussion prompts. These settings apply to all future generations.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-6 flex justify-center">
                      {/* data-testid="loading-dots" is the test anchor — avoids .rounded-full class selector */}
                      <div data-testid="loading-dots" className="flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="block w-1.5 h-1.5 rounded-full"
                            style={{
                              background: 'var(--color-primary-400)',
                              animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <div className="flex items-center justify-end gap-1">
                                    <label htmlFor="difficulty" className="text-sm font-medium">
                                        Difficulty
                                    </label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="About difficulty levels" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Basic tests recall and definitions. Intermediate applies concepts to scenarios. Advanced requires analysis and critical comparison.
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <select
                                    id="difficulty"
                                    value={localPrefs.difficulty}
                                    onChange={(e) => setLocalPrefs({ ...localPrefs, difficulty: e.target.value as AIPromptPreferences['difficulty'] })}
                                    className="col-span-3 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                    <option value="basic">Basic (Foundational Concepts)</option>
                                    <option value="intermediate">Intermediate (Application)</option>
                                    <option value="advanced">Advanced (Critical Analysis)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <div className="flex items-center justify-end gap-1">
                                    <label htmlFor="style" className="text-sm font-medium">
                                        Style
                                    </label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="About question styles" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Socratic encourages open reasoning. Factual tests direct recall. Clinical frames questions as patient scenarios.
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <select
                                    id="style"
                                    value={localPrefs.style}
                                    onChange={(e) => setLocalPrefs({ ...localPrefs, style: e.target.value as AIPromptPreferences['style'] })}
                                    className="col-span-3 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                    <option value="socratic">Socratic (Questioning)</option>
                                    <option value="factual">Factual (Direct Recall)</option>
                                    <option value="clinical_scenario">Clinical Scenario (Case-based)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <div className="flex items-center justify-end gap-1">
                                    <label htmlFor="length" className="text-sm font-medium">
                                        Length
                                    </label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="About question length" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Controls how much context and setup the question includes — not the expected answer length.
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <select
                                    id="length"
                                    value={localPrefs.length}
                                    onChange={(e) => setLocalPrefs({ ...localPrefs, length: e.target.value as AIPromptPreferences['length'] })}
                                    className="col-span-3 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                    <option value="brief">Brief</option>
                                    <option value="standard">Standard</option>
                                    <option value="detailed">Detailed</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-4 items-start gap-4">
                                <div className="flex items-start justify-end gap-1 pt-2">
                                    <label htmlFor="focusAreas" className="text-sm font-medium text-right">
                                        Focus Areas
                                    </label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="About focus areas" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Topics the AI will prioritize when selecting content and generating questions. Comma-separated.
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="col-span-3 flex flex-col gap-1">
                                    <textarea
                                        id="focusAreas"
                                        value={localPrefs.focusAreas ?? ''}
                                        onChange={(e) => setLocalPrefs({ ...localPrefs, focusAreas: e.target.value })}
                                        placeholder="e.g., beta-blocker mechanisms, RAAS pathway, adverse effects..."
                                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y"
                                    />
                                    <p className={`text-xs text-right ${focusLen > 400 ? 'text-amber-500' : 'text-gray-400'}`}>
                                        {focusLen}/500
                                    </p>
                                </div>
                            </div>

                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={isSaving || isLoading} className="bg-black text-white hover:bg-gray-800">
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
