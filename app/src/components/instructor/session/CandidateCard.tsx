'use client';

import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { GeneratedPrompt } from '@/types/ai';
import { MultipleChoiceEditor } from './MultipleChoiceEditor';

/** How long the collapse animation takes. Parent clears exitingIndex after this. */
export const CANDIDATE_COLLAPSE_MS = 250;

// ─── Timing constants ────────────────────────────────────────────────────────
const CARD_BG_MS       = 100;
const DRIFT_MS         = 600;  // <p> slow drift-away duration (enter only)
const EXPANDED_HOLD_MS = 40;   // how long isExpanded stays true after deselect
const SWAP_MS          = 60;
const SWAP_STAGGER_MS  = 80;
const SLIDE_MS         = 220;

interface Props {
  candidate: GeneratedPrompt;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  isConnected: boolean;
  onRequestPublish: (
    candidate: GeneratedPrompt,
    correctOption: string | null,
  ) => void;
}

// ─── CardHeader ───────────────────────────────────────────────────────────────

interface CardHeaderProps {
  promptType: string;
  bloomsLevel?: string;
  topicArea?: string;
  rationale?: string;
  isSelected: boolean;
}

function CardHeader({ promptType, bloomsLevel, topicArea, rationale, isSelected }: Readonly<CardHeaderProps>) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize text-brand-600"
        style={{ background: 'var(--color-primary-alpha-12)' }}
      >
        {promptType.replace('_', ' ')}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3 h-3 text-muted-foreground shrink-0" aria-label="About this question type" />
        </TooltipTrigger>
        <TooltipContent align="start">
          {bloomsLevel && <p><span className="font-semibold">Bloom&apos;s:</span> {bloomsLevel}</p>}
          {topicArea  && <p><span className="font-semibold">Topic:</span> {topicArea}</p>}
          {rationale  && <p><span className="font-semibold">Rationale:</span> {rationale}</p>}
          {!bloomsLevel && !topicArea && !rationale && <p>No metadata</p>}
        </TooltipContent>
      </Tooltip>
      <span
        className="text-xs font-medium text-brand-500"
        style={{
          opacity: isSelected ? 1 : 0,
          transition: `opacity ${SWAP_MS}ms ease`,
          pointerEvents: 'none',
        }}
      >
        Selected (Editing)
      </span>
    </div>
  );
}

// ─── PromptCrossfade ──────────────────────────────────────────────────────────

interface PromptCrossfadeProps {
  promptText: string;
  editText: string;
  onEditTextChange: (v: string) => void;
  isSelected: boolean;
  isExpanded: boolean;
  pRef: React.RefObject<HTMLParagraphElement | null>;
  naturalHeight: number;
}

function PromptCrossfade({
  promptText, editText, onEditTextChange, isSelected, isExpanded, pRef, naturalHeight,
}: Readonly<PromptCrossfadeProps>) {
  const promptTransition = isSelected
    ? `opacity ${DRIFT_MS}ms ease, transform ${SWAP_MS}ms ease`
    : `opacity ${SWAP_MS}ms ease, transform ${SWAP_MS}ms ease`;

  return (
    <div
      style={{
        position: 'relative',
        height: `${isSelected || isExpanded ? Math.max(naturalHeight, 80) : naturalHeight}px`,
        transition: 'height 180ms ease',
      }}
    >
      <p
        ref={pRef}
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
        {promptText}
      </p>
      {isExpanded && (
        <textarea
          value={editText}
          onChange={(e) => onEditTextChange(e.target.value)}
          className="w-full px-3 py-2.5 text-sm rounded-[10px] resize-none leading-snug bg-surface-raised text-content-primary"
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
  );
}

// ─── CandidateCard ────────────────────────────────────────────────────────────

export function CandidateCard({
  candidate, index, isSelected, onSelect, isConnected, onRequestPublish,
}: Readonly<Props>) {
  const [editText, setEditText]                           = React.useState(candidate.promptText);
  const [editingOptions, setEditingOptions]               = React.useState<Record<string, string>>({});
  const [overrideCorrectOption, setOverrideCorrectOption] = React.useState<string | null>(null);
  const [isHovered, setIsHovered]                         = React.useState(false);

  const pRef          = React.useRef<HTMLParagraphElement>(null);
  const isExpandedRef = React.useRef(false);
  const [naturalHeight, setNaturalHeight] = React.useState(24);

  React.useLayoutEffect(() => {
    const el = pRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!isExpandedRef.current) setNaturalHeight(el.scrollHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [isExpanded, setIsExpanded]   = React.useState(false);
  const expandedTimerRef              = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (expandedTimerRef.current) clearTimeout(expandedTimerRef.current);
    if (isSelected) {
      isExpandedRef.current = true;
      setIsExpanded(true);
      setEditText(candidate.promptText);
      setEditingOptions(
        candidate.mcOptions?.reduce(
          (acc, opt) => ({ ...acc, [opt.label]: opt.text }),
          {} as Record<string, string>,
        ) ?? {},
      );
      setOverrideCorrectOption(candidate.mcOptions?.find((o) => o.is_correct)?.label ?? null);
    } else {
      expandedTimerRef.current = setTimeout(() => {
        isExpandedRef.current = false;
        setIsExpanded(false);
      }, EXPANDED_HOLD_MS);
    }
    return () => { if (expandedTimerRef.current) clearTimeout(expandedTimerRef.current); };
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
    onRequestPublish(published, overrideCorrectOption);
  };

  const hasMc      = (candidate.mcOptions?.length ?? 0) > 0;
  const slideEase  = `cubic-bezier(0.16,1,0.3,1)`;
  // Shared styles for any "inner animated div" — owns transform + opacity,
  // is the sole source of the visible animation (no double-fade from a parent).
  const innerSlide = (visible: boolean): React.CSSProperties => ({
    transform:  visible ? 'translateY(0px)' : 'translateY(-8px)',
    opacity:    visible ? 1 : 0,
    transition: `transform ${SLIDE_MS}ms ${slideEase}, opacity ${SLIDE_MS}ms ease`,
  });

  return (
    <div
      className="p-3 rounded-xl text-sm"
      style={{
        background:    isSelected ? 'rgba(45,158,45,0.06)' : 'var(--surface-raised)',
        border:        `1px solid ${!isSelected && isHovered ? 'var(--color-primary-300)' : 'var(--border-default)'}`,
        outline:       '2px solid',
        outlineColor:  isSelected ? 'var(--color-primary-400)' : 'transparent',
        outlineOffset: '-1px',
        boxSizing:     'border-box',
        cursor:        isSelected ? 'default' : 'pointer',
        transition: `background ${CARD_BG_MS}ms${!isSelected ? ', border-color 120ms ease' : ''}`,
      }}
      role={isSelected ? undefined : 'button'}
      tabIndex={isSelected ? undefined : 0}
      onClick={isSelected ? undefined : onSelect}
      onKeyDown={isSelected ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      onMouseEnter={isSelected ? undefined : () => setIsHovered(true)}
      onMouseLeave={isSelected ? undefined : () => setIsHovered(false)}
    >
      <CardHeader
        promptType={candidate.promptType}
        bloomsLevel={candidate.bloomsLevel}
        topicArea={candidate.topicArea}
        rationale={candidate.rationale}
        isSelected={isSelected}
      />

      <PromptCrossfade
        promptText={candidate.promptText}
        editText={editText}
        onEditTextChange={setEditText}
        isSelected={isSelected}
        isExpanded={isExpanded}
        pRef={pRef}
        naturalHeight={naturalHeight}
      />

      {/* ── MC choices: slide up + fade simultaneously as editor slides down ──
          Both are driven by isSelected at the same time, so they animate
          in parallel with no waiting. translateY reverses cleanly on exit. */}
      {hasMc && (
        <ul
          className="mt-2 space-y-1"
          style={{
            overflow:   'hidden',
            maxHeight:  isSelected ? '0px' : '300px',
            // transform + opacity live here (not in a child) so they
            // animate at the same moment maxHeight collapses
            transform:  isSelected ? 'translateY(-8px)' : 'translateY(0px)',
            opacity:    isSelected ? 0 : 1,
            transition: [
              `max-height ${SLIDE_MS}ms ${slideEase}`,
              `transform  ${SLIDE_MS}ms ${slideEase}`,
              `opacity    ${SLIDE_MS}ms ease`,
            ].join(', '),
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

      {/* ── MC editor ──
          Outer div: only clips overflow + collapses height. No opacity here
          so there's no double-fade fighting the inner div's animation.
          Inner div: owns transform + opacity — identical easing each way,
          so exit is the exact reverse of entrance. */}
      {candidate.promptType === 'multiple_choice' && (
        <div
          style={{
            overflow:   'hidden',
            maxHeight:  isSelected ? '600px' : '0px',
            transition: `max-height ${SLIDE_MS}ms ${slideEase}`,
          }}
        >
          <div style={innerSlide(isSelected)}>
            <MultipleChoiceEditor
              nameGroup={`correct-option-${index}`}
              options={
                candidate.mcOptions?.map((opt) => ({
                  label: opt.label,
                  text:  editingOptions[opt.label] ?? opt.text,
                })) ?? []
              }
              correctOption={overrideCorrectOption}
              onCorrectOptionChange={setOverrideCorrectOption}
              onOptionTextChange={(label, text) =>
                setEditingOptions((prev) => ({ ...prev, [label]: text }))
              }
            />
          </div>
        </div>
      )}

      {/* ── Publish button: same outer-clip / inner-animate pattern ── */}
      <div
        style={{
          overflow:   'hidden',
          maxHeight:  isSelected ? '52px' : '0px',
          transition: `max-height ${SLIDE_MS}ms ${slideEase}`,
        }}
      >
        <div style={innerSlide(isSelected)}>
          <button
            onClick={handlePublish}
            disabled={!editText.trim() || !isConnected}
            className="mt-2 w-full rounded-[10px] text-xs py-2 font-semibold text-white transition-all duration-150 disabled:opacity-50 btn-primary-glow"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
            }}
          >
            Publish This Question →
          </button>
        </div>
      </div>
    </div>
  );
}