'use client';

import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { GeneratedPrompt } from '@/types/ai';
import { MultipleChoiceEditor } from './MultipleChoiceEditor';

/** How long the collapse animation takes. Parent clears exitingIndex after this. */
export const CANDIDATE_COLLAPSE_MS = 250;

// ─── Timing constants ────────────────────────────────────────────────────────
const CARD_TRANSITION_MS = { background: 100, border: 1000 };
const FADE_MS = { choices: 140 };
const DRIFT_MS = 600; // <p> opacity fade-out
const SWAP_MS = 100; // textarea fade-in duration
const SWAP_STAGGER_MS = 50; // delay before textarea fades in
const SLIDE_UP_MS = { duration: 220, publishStagger: 60 };

interface Props {
  candidate: GeneratedPrompt;
  /** Index within the candidates list — used to namespace MC radio inputs. */
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  isConnected: boolean;
  onRequestPublish: (
    candidate: GeneratedPrompt,
    correctOption: string | null,
    feedbackEnabled: boolean,
  ) => void;
}

export function CandidateCard({
  candidate,
  index,
  isSelected,
  onSelect,
  isConnected,
  onRequestPublish,
}: Props) {
  const [editText, setEditText] = React.useState(candidate.promptText);
  const [editingOptions, setEditingOptions] = React.useState<Record<string, string>>({});
  const [overrideCorrectOption, setOverrideCorrectOption] = React.useState<string | null>(null);
  const [feedbackEnabled, setFeedbackEnabled] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  // Increments on each selection — changing key on animated inner divs replays fadeSlideUp.
  const [animKey, setAnimKey] = React.useState(0);

  // Trails isSelected by DRIFT_MS on exit so the <p> position doesn't snap back to
  // `relative` before its opacity/transform transition has finished drifting away.
  const [isExpanded, setIsExpanded] = React.useState(false);
  const expandedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (expandedTimerRef.current) clearTimeout(expandedTimerRef.current);

    if (isSelected) {
      setIsExpanded(true);
      setAnimKey((k) => k + 1);
      setEditText(candidate.promptText);
      setEditingOptions(
        candidate.mcOptions?.reduce(
          (acc, opt) => ({ ...acc, [opt.label]: opt.text }),
          {} as Record<string, string>,
        ) ?? {},
      );
      setOverrideCorrectOption(candidate.mcOptions?.find((o) => o.is_correct)?.label ?? null);
      setFeedbackEnabled(false);
    } else {
      // Keep isExpanded true until the <p> drift animation has completed.
      expandedTimerRef.current = setTimeout(() => setIsExpanded(false), DRIFT_MS);
    }

    return () => {
      if (expandedTimerRef.current) clearTimeout(expandedTimerRef.current);
    };
  }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePublish = () => {
    const published: GeneratedPrompt =
      candidate.promptType === 'multiple_choice' && candidate.mcOptions
        ? {
            ...candidate,
            promptText: editText,
            mcOptions: candidate.mcOptions.map((opt) => ({
              ...opt,
              text: editingOptions[opt.label] ?? opt.text,
            })),
          }
        : { ...candidate, promptText: editText };

    onRequestPublish(published, overrideCorrectOption, feedbackEnabled);
  };

  const hasMc = (candidate.mcOptions?.length ?? 0) > 0;

  // <p> enter: slow fade-out + drift. <p> exit: quick fade-in staged after textarea disappears.
  const promptTransition = isSelected
    ? `opacity ${DRIFT_MS}ms ease, transform ${SWAP_MS}ms ease`
    : `opacity ${SWAP_MS}ms ease, transform ${SWAP_MS}ms ease`;

  const choicesTransition  = `max-height ${FADE_MS.choices}ms ease, opacity ${FADE_MS.choices}ms ease`;
  const wrapTransition     = `max-height ${SLIDE_UP_MS.duration}ms cubic-bezier(0.16,1,0.3,1), opacity 140ms ease`;

  return (
    <div>
      <div
        className="p-3 rounded-xl text-sm"
        style={{
          background: isSelected ? 'rgba(45,158,45,0.06)' : 'var(--surface-raised)',
          border: `1px solid ${
            !isSelected && isHovered ? 'var(--color-primary-300)' : 'var(--border-default)'
          }`,
          outline: '2px solid',
          outlineColor: isSelected ? 'var(--color-primary-400)' : 'transparent',
          outlineOffset: '-1px',
          boxSizing: 'border-box',
          cursor: isSelected ? 'default' : 'pointer',
          transition: `background ${CARD_TRANSITION_MS.background}ms, outline-color ${CARD_TRANSITION_MS.border}ms, border-color 120ms ease`,
        }}
        role={isSelected ? undefined : 'button'}
        tabIndex={isSelected ? undefined : 0}
        onClick={isSelected ? undefined : onSelect}
        onKeyDown={
          isSelected
            ? undefined
            : (e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect();
              }
        }
        onMouseEnter={isSelected ? undefined : () => setIsHovered(true)}
        onMouseLeave={isSelected ? undefined : () => setIsHovered(false)}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize text-brand-600"
            style={{ background: 'var(--color-primary-alpha-12)' }}
          >
            {candidate.promptType.replace('_', ' ')}
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Info
                className="w-3 h-3 text-muted-foreground shrink-0"
                aria-label="About this question type"
              />
            </TooltipTrigger>
            <TooltipContent align="start">
              {candidate.bloomsLevel && (
                <p>
                  <span className="font-semibold">Bloom&apos;s:</span> {candidate.bloomsLevel}
                </p>
              )}
              {candidate.topicArea && (
                <p>
                  <span className="font-semibold">Topic:</span> {candidate.topicArea}
                </p>
              )}
              {candidate.rationale && (
                <p>
                  <span className="font-semibold">Rationale:</span> {candidate.rationale}
                </p>
              )}
              {!candidate.bloomsLevel && !candidate.topicArea && !candidate.rationale && (
                <p>No metadata</p>
              )}
            </TooltipContent>
          </Tooltip>

          {isSelected && (
            <span className="text-xs font-medium text-brand-500">
              Selected (Editing)
            </span>
          )}
        </div>

        {/* p ↔ textarea crossfade — wrapper is the stage; children are pure visuals */}
        <div
          style={{
            position: 'relative',
            height: isSelected ? '80px' : '24px',
            transition: 'height 180ms ease',
          }}
        >
          <p
            className="leading-snug text-sm text-content-primary"
            style={{
              margin:        0,
              opacity:       isSelected ? 0 : 1,
              transform:     isSelected ? 'translate(14px, 11px)' : 'translate(0, 0)',
              transition:    promptTransition,
              pointerEvents: 'none',
              position:      isExpanded ? 'absolute' : 'relative',
              inset:         isExpanded ? 0 : 'auto',
              zIndex:        2,
            }}
          >
            {candidate.promptText}
          </p>

          {isExpanded && (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-[10px] resize-none leading-snug min-h-[80px] bg-surface-raised text-content-primary"
              style={{
                position:      'absolute',
                inset:         0,
                zIndex:        1,
                border:        '1px solid var(--border-default)',
                opacity:       isSelected ? 1 : 0,
                transition:    `opacity ${SWAP_MS}ms ease ${isSelected ? SWAP_STAGGER_MS : 0}ms`,
                pointerEvents: isSelected ? 'auto' : 'none',
              }}
              placeholder="Edit this prompt..."
            />
          )}
        </div>

        {/* MC choices */}
        {hasMc && (
          <ul
            className="mt-2 space-y-1"
            style={{
              overflow: 'hidden',
              maxHeight: isSelected ? '0px' : '300px',
              opacity: isSelected ? 0 : 1,
              transition: choicesTransition,
            }}
          >
            {candidate.mcOptions?.map((opt) => (
              <li key={opt.label} className="text-xs text-content-muted">
                <span className="font-semibold mr-1 text-content-secondary">{opt.label}.</span>
                {opt.text}
              </li>
            ))}
          </ul>
        )}

        {/* MC editor */}
        {candidate.promptType === 'multiple_choice' && (
          <div
            style={{
              overflow: 'hidden',
              maxHeight: isSelected ? '600px' : '0px',
              opacity: isSelected ? 1 : 0,
              transition: wrapTransition,
            }}
          >
            <div
              key={animKey}
              style={{
                animation: isSelected
                  ? `fadeSlideUp ${SLIDE_UP_MS.duration}ms cubic-bezier(0.16,1,0.3,1) both`
                  : undefined,
              }}
            >
              <MultipleChoiceEditor
                nameGroup={`correct-option-${index}`}
                options={
                  candidate.mcOptions?.map((opt) => ({
                    label: opt.label,
                    text: editingOptions[opt.label] ?? opt.text,
                  })) ?? []
                }
                correctOption={overrideCorrectOption}
                onCorrectOptionChange={setOverrideCorrectOption}
                onOptionTextChange={(label, text) =>
                  setEditingOptions((prev) => ({ ...prev, [label]: text }))
                }
                feedbackEnabled={feedbackEnabled}
                onFeedbackChange={setFeedbackEnabled}
              />
            </div>
          </div>
        )}
      </div>

      {/* Publish button */}
      {isSelected && <div
        style={{
          overflow: 'hidden',
          maxHeight: isSelected ? '52px' : '0px',
          opacity: isSelected ? 1 : 0,
          transition: wrapTransition,
        }}
      >
        <button
          key={animKey}
          onClick={handlePublish}
          disabled={!editText.trim() || !isConnected}
          className="mt-2 w-full rounded-[10px] text-xs py-2 font-semibold text-white transition-all duration-150 disabled:opacity-50 btn-primary-glow"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
            animation: isSelected
              ? `fadeSlideUp ${SLIDE_UP_MS.duration}ms cubic-bezier(0.16,1,0.3,1) ${SLIDE_UP_MS.publishStagger}ms both`
              : undefined,
          }}
        >
          Publish This Question →
        </button>
      </div>}
    </div>
  );
}