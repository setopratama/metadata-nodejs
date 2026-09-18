import { CommercialArtDirectorService, AnalyzeBriefOptions } from "./commercial-art-director.service.js";
import { synthesizeOptimizedPrompt, validateQualityGate, generateSeoStockMetadata } from "../../src/prompt.js";
import {
  CommercialBrief,
  CommercialReasoningFlow,
  SynthesizedPrompt,
  AutoRunnerFamilyJob,
  AutoRunnerFamilyResult,
  CommercialFamily
} from "../../src/types.d.js";

export class PromptEngineService {
  private artDirectorService: CommercialArtDirectorService;

  constructor() {
    this.artDirectorService = new CommercialArtDirectorService();
  }

  /**
   * Generates prompt by first calling CommercialArtDirectorService to produce a validated CommercialBrief,
   * then synthesizing the final prompt preserving all 9 distinct reasoning concepts.
   */
  public generatePrompt(options: AnalyzeBriefOptions & { stylePreset?: string }): {
    brief: CommercialBrief;
    synthesizedPrompt: SynthesizedPrompt;
    seoMetadata: { title: string; description: string; keywords: string[] };
    canProceedToGeneration: boolean;
  } {
    // 1. Call CommercialArtDirectorService to produce validated CommercialBrief
    const brief = this.artDirectorService.analyzeBrief(options);

    // 2. Map brief to CommercialReasoningFlow preserving distinct concepts (WHY, WHERE, WHO, PROBLEM, JOB, USE, WHAT, HOOK, HOW, ARRANGEMENT)
    const reasoningFlow: CommercialReasoningFlow = {
      commercialDirection: brief.marketCategory + " - Commercial Direction",
      buyerMode: brief.buyerMode,
      targetBuyer: brief.targetBuyer,
      buyerProblem: brief.buyerProblem,
      buyerIntent: brief.buyerIntent,
      intendedUse: brief.intendedUse,
      commercialConcept: brief.commercialConcept,
      visualHook: brief.visualHook,
      stylePreset: options.stylePreset || "Commercial Photography, Soft Natural Lighting, Professional Color Grading",
      composition: {
        copySpace: brief.copySpace || "right",
        framingStrategy: brief.compositionStrategy
      }
    };

    // 3. Final Prompt Synthesis
    const synthesizedPrompt = synthesizeOptimizedPrompt(reasoningFlow);

    // 4. Generate SEO Metadata for Stock Upload
    const seoMetadata = generateSeoStockMetadata(reasoningFlow);

    // 5. Commercial Quality Gate Guard: Block REWORK concepts by default
    const canProceedToGeneration = brief.decision === 'PASS';

    return {
      brief,
      synthesizedPrompt,
      seoMetadata,
      canProceedToGeneration
    };
  }

  /**
   * Refactored Auto Runner Pipeline:
   * Root Idea -> Commercial Family -> Select Concepts -> Commercial Quality Gate -> Visual Prompt Synthesis -> Image Generation Prep.
   * Prioritizes semantic commercial diversity (use case, buyer, message, scenario, composition)
   * rather than superficial camera angle or pose tweaks.
   */
  public runAutoRunnerPipeline(options: {
    rootIdea: string;
    count?: number;
    commercialDirection?: string;
    stylePreset?: string;
  }): AutoRunnerFamilyResult {
    const rootIdea = (options.rootIdea || "commercial photography").trim();

    // 1. Generate Commercial Family (6-10 non-overlapping commercially distinct concepts)
    const family: CommercialFamily = this.artDirectorService.generateCommercialFamily(rootIdea, {
      count: options.count,
      commercialDirection: options.commercialDirection
    });

    const jobs: AutoRunnerFamilyJob[] = [];
    let passedJobs = 0;
    let reworkJobs = 0;

    // 2 & 3 & 4. Iterate selected family concepts -> Commercial Quality Gate -> Prompt Synthesis
    for (const concept of family.concepts) {
      const generated = this.generatePrompt({
        rawIdea: `${rootIdea} - ${concept.conceptName}`,
        commercialDirection: options.commercialDirection || concept.conceptName,
        targetBuyer: concept.targetBuyer,
        buyerIntent: concept.buyerIntent,
        intendedUse: concept.intendedUse,
        copySpace: concept.copySpace,
        stylePreset: options.stylePreset
      });

      if (generated.canProceedToGeneration) {
        passedJobs++;
      } else {
        reworkJobs++;
      }

      jobs.push({
        conceptName: concept.conceptName,
        brief: generated.brief,
        synthesizedPrompt: generated.synthesizedPrompt,
        seoMetadata: generated.seoMetadata,
        canProceedToGeneration: generated.canProceedToGeneration
      });
    }

    return {
      rootIdea,
      family,
      totalJobs: jobs.length,
      passedJobs,
      reworkJobs,
      jobs
    };
  }

  /**
   * Enforces Commercial Quality Gate before sending concepts to GPT Image 2.5.
   * REWORK concepts are blocked by default unless explicitly overridden.
   */
  public canSendToGptImage(brief: CommercialBrief, allowOverride = false): {
    allowed: boolean;
    reason?: string;
  } {
    if (brief.decision === 'REWORK' && !allowOverride) {
      return {
        allowed: false,
        reason: `Concept decision is REWORK (${brief.reworkReasons?.join('; ') || 'Quality thresholds not met'}). System blocks REWORK concepts from GPT Image 2.5 by default.`
      };
    }
    return { allowed: true };
  }
}
