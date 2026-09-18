/**
 * Preset for Buyer Mode placement context ("Where will the buyer use it?").
 */
export type BuyerModePreset =
  | 'hero-banner'       // Website Hero Banner / Header
  | 'social-ad'          // Social Media Ad Campaign / Feed
  | 'annual-report'      // Corporate Annual Report / Presentation
  | 'editorial-article'  // Editorial Publication / Blog Cover
  | 'app-onboarding'     // Mobile App UI / Onboarding Screen
  | 'print-brochure';    // Print Brochure / Marketing Flyer

/**
 * Contract interface for Commercial Brief in the Commercial AI Studio Pipeline (2.2).
 */
export interface CommercialBrief {
  marketCategory: string;
  targetBuyer: string;

  buyerProblem: string;
  buyerIntent: string;
  buyerMode?: BuyerModePreset | string;
  intendedUse: string[];
  licensingScenario: string;

  commercialConcept: string;
  visualHook: string;
  differentiation: string;

  searchIntent: string[];

  compositionStrategy: string;
  copySpace?: 'left' | 'right' | 'top' | 'bottom' | 'none';
  explicitText?: string;
  vectorStrategy: string;

  sceneComplexity?: 'low' | 'medium' | 'high';

  risks: string[];

  scores: {
    commercial: number;
    buyerUtility: number;
    uniqueness: number;
    searchability: number;
    vectorSuitability: number;
    visualClarity: number;
    overall: number;
  };

  decision: 'PASS' | 'REWORK';
  reworkReasons?: string[];
}

/**
 * Single concept item in a Commercial Family.
 */
export interface CommercialFamilyConcept {
  conceptName: string;
  targetBuyer: string;
  buyerIntent: string;
  intendedUse: string[];
  visualHook: string;
  composition: string;
  copySpace: 'left' | 'right' | 'top' | 'bottom' | 'none';
  searchIntent: string[];
}

/**
 * Result of a Commercial Family generation containing 6-10 non-overlapping concepts.
 */
export interface CommercialFamily {
  rootIdea: string;
  totalConcepts: number;
  concepts: CommercialFamilyConcept[];
}

/**
 * Single job item in the Auto Runner Family pipeline.
 */
export interface AutoRunnerFamilyJob {
  conceptName: string;
  brief: CommercialBrief;
  synthesizedPrompt: SynthesizedPrompt;
  seoMetadata: { title: string; description: string; keywords: string[] };
  canProceedToGeneration: boolean;
}

/**
 * Complete result of the Auto Runner Family pipeline execution.
 */
export interface AutoRunnerFamilyResult {
  rootIdea: string;
  family: CommercialFamily;
  totalJobs: number;
  passedJobs: number;
  reworkJobs: number;
  jobs: AutoRunnerFamilyJob[];
}

/**
 * 9 Distinct Concepts of the Commercial Reasoning Flow + Optional Buyer Mode & Scene Complexity controllers.
 * Must NEVER be collapsed into a single field.
 */
export interface CommercialReasoningFlow {
  /** WHY: Strategic commercial direction & market positioning ("Why is this asset commercially relevant?") */
  commercialDirection: string;
  /** WHERE: Buyer Mode placement context ("Where will the buyer use it?") - Optional, auto-inferred if omitted */
  buyerMode?: BuyerModePreset | string;
  /** WHO: Primary buyer demographic & industry persona */
  targetBuyer: string;
  /** PROBLEM: Pain point or commercial gap being addressed */
  buyerProblem: string;
  /** JOB: Core task/intent the buyer needs the asset for */
  buyerIntent: string;
  /** USE: Specific campaign, placement, or asset channels */
  intendedUse: string[];
  /** WHAT: Primary visual concept description & subject scene */
  commercialConcept: string;
  /** HOOK: Primary visual focal point & attention grabber */
  visualHook: string;
  /** HOW: Aesthetic style preset, lighting, color grading & mood */
  stylePreset: string;
  /** ARRANGEMENT: Framing, rule of thirds, aspect ratio & copy space */
  composition: {
    aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16' | string;
    copySpace?: 'left' | 'right' | 'top' | 'bottom' | 'none';
    framingStrategy?: string;
  } | string;
  /** COMPLEXITY: Controller for scene element density ('low' | 'medium' | 'high') */
  sceneComplexity?: 'low' | 'medium' | 'high';
  /** EXPLICIT TEXT: Optional user-provided explicit text. If omitted, strict global visual safety rules apply. */
  explicitText?: string;
}

/**
 * Synthesized Prompt Output structure preserving distinct reasoning layers.
 */
export interface SynthesizedPrompt {
  fullPromptText: string;
  reasoningFlow: CommercialReasoningFlow;
  qualityScore: number;
  qualityCheck: {
    passTrademarkFilter: boolean;
    passCopySpaceCheck: boolean;
    passCommercialClarity: boolean;
  };
}
