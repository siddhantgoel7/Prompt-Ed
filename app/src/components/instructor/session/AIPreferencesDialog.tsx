'use client';

import * as React from 'react';
import { Settings2 } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // DEBUG
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
                    <div className="py-6 text-center text-sm text-gray-500">Loading preferences...</div>
                ) : (
                    <TooltipProvider> {/* DEBUG */}
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <label htmlFor="difficulty" className="text-right text-sm font-medium cursor-default">
                                            Difficulty
                                        </label>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Basic tests recall and definitions. Intermediate applies concepts to scenarios. Advanced requires analysis and critical comparison.
                                    </TooltipContent>
                                </Tooltip>
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
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <label htmlFor="style" className="text-right text-sm font-medium cursor-default">
                                            Style
                                        </label>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Socratic encourages open reasoning. Factual tests direct recall. Clinical frames questions as patient scenarios.
                                    </TooltipContent>
                                </Tooltip>
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
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <label htmlFor="length" className="text-right text-sm font-medium cursor-default">
                                            Length
                                        </label>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Controls how much context and setup the question includes — not the expected answer length.
                                    </TooltipContent>
                                </Tooltip>
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
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <label htmlFor="focusAreas" className="text-right text-sm font-medium pt-2 cursor-default">
                                            Focus Areas
                                        </label>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Topics the AI will prioritize when selecting content and generating questions. Comma-separated.
                                    </TooltipContent>
                                </Tooltip>
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
                    </TooltipProvider>
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
