'use client';

import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { GeneratedPrompt } from '@/types/ai';
import { MultipleChoiceEditor } from './MultipleChoiceEditor';

/** How long the collapse animation takes. Parent clears exitingIndex after this. */
export const CANDIDATE_COLLAPSE_MS = 250;

// ─── Timing constants ────────────────────────────────────────────────────────
const CARD_BG_MS       = 100;  // background color transition
const DRIFT_MS         = 600;  // prompt text slow drift-away (select enter only)
const EXPANDED_HOLD_MS = 40;   // isExpanded stays true briefly after deselect
const SWAP_MS          = 60;   // MC options swap animation
const SWAP_STAGGER_MS  = 80;   // stagger between swapping option rows
const SLIDE_MS         = 220;  // editor slide-in/out
const SLIDE_EASE       = 'cubic-bezier(0.16,1,0.3,1)';

interface Props {
  candidate: GeneratedPrompt;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onPromptTextChange?: (text: string) => void;
  isConnected: boolean;
  onRequestPublish: (
    candidate: GeneratedPrompt,
    correctOption: string | null,
  ) => void;
}

// ─── Sub-components and Helpers ──────────────────────────────────────────────

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
          <button type="button" className="p-0 border-none bg-transparent focus:outline-none">
            <Info className="w-3 h-3 text-muted-foreground shrink-0" aria-label="About this question type" />
          </button>
        </TooltipTrigger>
        <TooltipContent align="start">
          {bloomsLevel && <p><span className="font-semibold">Bloom&apos;s:</span> {bloomsLevel}</p>}
          {topicArea  && <p><span className="font-semibold">Topic:</span> {topicArea}</p>}
          {rationale  && <p><span className="font-semibold">Rationale:</span> {rationale}</p>}
          {!bloomsLevel && !topicArea && !rationale && <p>No metadata</p>}
        </TooltipContent>
      </Tooltip>
      {isSelected && (
        <span className="text-xs font-medium text-brand-500" style={{ pointerEvents: 'none' }}>
          Selected (Editing)
        </span>
      )}
    </div>
  );
}

const innerSlide = (visible: boolean): React.CSSProperties => ({
  transform:  visible ? 'translateY(0px)' : 'translateY(-8px)',
  opacity:    visible ? 1 : 0,
  transition: `transform ${SLIDE_MS}ms ${SLIDE_EASE}, opacity ${SLIDE_MS}ms ease`,
});

function UnselectedMCList({ isSelected, mcOptions }: Readonly<{ isSelected: boolean, mcOptions?: { label: string, text: string }[] }>) {
  if (!mcOptions?.length) return null;
  return (
    <ul
      className="mt-2 space-y-1 text-left"
      style={{
        overflow: 'hidden',
        maxHeight: isSelected ? '0px' : '300px',
        transform: isSelected ? 'translateY(-8px)' : 'translateY(0px)',
        opacity: isSelected ? 0 : 1,
        transition: [
          `max-height ${SLIDE_MS}ms ${SLIDE_EASE}`,
          `transform  ${SLIDE_MS}ms ${SLIDE_EASE}`,
          `opacity    ${SLIDE_MS}ms ease`,
        ].join(', '),
      }}
    >
      {mcOptions.map((opt) => (
        <li key={opt.label} className="text-xs text-content-muted">
          <span className="font-semibold mr-1 text-content-secondary">{opt.label}.</span>
          {opt.text}
        </li>
      ))}
    </ul>
  );
}

function MCEditorSection({
  isSelected, index, mcOptions, editingOptions, overrideCorrectOption, setOverrideCorrectOption, setEditingOptions
}: Readonly<{
  isSelected: boolean,
  index: number,
  mcOptions?: { label: string, text: string }[],
  editingOptions: Record<string, string>,
  overrideCorrectOption: string | null,
  setOverrideCorrectOption: (v: string | null) => void,
  setEditingOptions: React.Dispatch<React.SetStateAction<Record<string, string>>>
}>) {
  if (!isSelected) {
    return <div style={{ maxHeight: '0px', overflow: 'hidden' }} />;
  }

  return (
    <div
      style={{
        overflow: 'hidden',
        maxHeight: '600px',
        transition: `max-height ${SLIDE_MS}ms ${SLIDE_EASE}`,
      }}
    >
      <div style={innerSlide(true)}>
        <MultipleChoiceEditor
          nameGroup={`correct-option-${index}`}
          options={
            mcOptions?.map((opt) => ({
              label: opt.label,
              text: editingOptions[opt.label] ?? opt.text,
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
  );
}

function PublishSection({
  isSelected, isConnected, editText, handlePublish
}: Readonly<{
  isSelected: boolean,
  isConnected: boolean,
  editText: string,
  handlePublish: () => void
}>) {
  if (!isSelected) {
    return <div style={{ maxHeight: '0px', overflow: 'hidden' }} />;
  }

  return (
    <div
      style={{
        overflow: 'hidden',
        maxHeight: '52px',
        transition: `max-height ${SLIDE_MS}ms ${SLIDE_EASE}`,
      }}
    >
      <div style={innerSlide(true)}>
        <button
          type="button"
          data-testid="publish-ai-question-button"
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
  );
}

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
    <div style={{ position: 'relative', width: '100%', minHeight: isSelected || isExpanded ? '80px' : '24px' }}>
      {/* Ghost element — defines the height of the parent naturally */}
      <p 
        className="leading-snug text-sm select-none invisible" 
        style={{ margin: 0, paddingBottom: isSelected ? '8px' : 0 }}
        aria-hidden="true"
      >
        {isSelected ? editText : promptText}
      </p>

      <p
        ref={pRef}
        aria-hidden={isSelected || undefined}
        className="leading-snug text-sm text-content-primary"
        style={{
          margin:        0,
          opacity:       isSelected ? 0 : 1,
          transform:     isSelected ? 'translate(14px, 11px)' : 'translate(0, 0)',
          transition:    promptTransition,
          pointerEvents: 'none',
          position:      'absolute',
          inset:         0,
          zIndex:        2,
        }}
      >
        {promptText}
      </p>
      {isExpanded && (
        <textarea
          value={editText}
          data-testid={isSelected ? "prompt-editor" : undefined}
          aria-hidden={!isSelected || undefined}
          onChange={(e) => onEditTextChange(e.target.value)}
          className="w-full px-3 py-2.5 text-sm rounded-[10px] resize-none leading-snug bg-surface-raised text-content-primary shadow-inner"
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

// ─── useCardExpansion ─────────────────────────────────────────────────────────

function useCardExpansion(isSelected: boolean, candidate: GeneratedPrompt, onPromptTextChange?: (t: string) => void) {
  const [editText, setEditTextInternal]                   = React.useState(candidate.promptText);
  const [editingOptions, setEditingOptions]               = React.useState<Record<string, string>>({});
  const [overrideCorrectOption, setOverrideCorrectOption] = React.useState<string | null>(null);

  const isExpandedRef    = React.useRef(false);
  const [isExpanded, setIsExpanded]   = React.useState(false);
  const expandedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const setEditText = (t: string) => {
    setEditTextInternal(t);
    onPromptTextChange?.(t);
  };

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
  }, [isSelected, candidate.promptText, candidate.mcOptions]);

  return {
    editText, setEditText,
    editingOptions, setEditingOptions,
    overrideCorrectOption, setOverrideCorrectOption,
    isExpanded, isExpandedRef,
  };
}

// ─── CandidateCard ────────────────────────────────────────────────────────────

export function CandidateCard({
  candidate, index, isSelected, onSelect, onPromptTextChange, isConnected, onRequestPublish,
}: Readonly<Props>) {
  const {
    editText, setEditText,
    editingOptions, setEditingOptions,
    overrideCorrectOption, setOverrideCorrectOption,
    isExpanded, isExpandedRef,
  } = useCardExpansion(isSelected, candidate, onPromptTextChange);

  const [isHovered, setIsHovered] = React.useState(false);
  const pRef = React.useRef<HTMLParagraphElement>(null);
  const [naturalHeight, setNaturalHeight] = React.useState(24);

  React.useLayoutEffect(() => {
    const el = pRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!isExpandedRef.current) setNaturalHeight(el.scrollHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isExpandedRef]);

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

  const hasMc = (candidate.mcOptions?.length ?? 0) > 0;

  return (
    <div
      role="button"
      tabIndex={isSelected ? -1 : 0}
      onClick={!isSelected ? onSelect : undefined}
      onKeyDown={!isSelected ? (e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); } : undefined}
      className={`p-3 rounded-xl text-sm ${!isSelected ? 'cursor-pointer hover:shadow-sm' : ''}`}
      style={{
        background: isSelected ? 'var(--color-primary-alpha-08)' : 'var(--surface-raised)',
        border: `1px solid ${!isSelected && isHovered ? 'var(--color-primary-300)' : 'var(--border-default)'}`,
        outline: '2px solid',
        outlineColor: isSelected ? 'var(--color-primary-500)' : 'transparent',
        outlineOffset: '-1px',
        boxSizing: 'border-box',
        transition: `background ${CARD_BG_MS}ms${isSelected ? '' : ', border-color 120ms ease'}`,
      }}
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

      {isSelected ? (
        <div className="flex flex-col cursor-default">
          <PromptCrossfade
            promptText={candidate.promptText}
            editText={editText}
            onEditTextChange={setEditText}
            isSelected={isSelected}
            isExpanded={isExpanded}
            pRef={pRef}
            naturalHeight={naturalHeight}
          />
          {hasMc && (
            <MCEditorSection
              isSelected={isSelected}
              index={index}
              mcOptions={candidate.mcOptions}
              editingOptions={editingOptions}
              overrideCorrectOption={overrideCorrectOption}
              setOverrideCorrectOption={setOverrideCorrectOption}
              setEditingOptions={setEditingOptions}
            />
          )}
          <PublishSection
            isSelected={isSelected}
            isConnected={isConnected}
            editText={editText}
            handlePublish={handlePublish}
          />
        </div>
      ) : (
        <div
          className="w-full text-left"
          aria-label={`Select: ${candidate.promptText}`}
        >
          <PromptCrossfade
            promptText={candidate.promptText}
            editText={editText}
            onEditTextChange={setEditText}
            isSelected={isSelected}
            isExpanded={isExpanded}
            pRef={pRef}
            naturalHeight={naturalHeight}
          />
          <UnselectedMCList isSelected={isSelected} mcOptions={candidate.mcOptions} />
        </div>
      )}
    </div>
  );
}