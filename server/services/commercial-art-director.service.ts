import { CommercialBrief, CommercialFamily, CommercialFamilyConcept, BuyerModePreset } from "../../src/types.d.js";
import { inferBuyerMode, determineCopySpace, BUYER_MODE_MAP } from "../../src/prompt.js";

export interface AnalyzeBriefOptions {
  rawIdea: string;
  commercialDirection?: string;
  targetBuyer?: string;
  buyerProblem?: string;
  buyerIntent?: string;
  buyerMode?: BuyerModePreset | string;
  intendedUse?: string[];
  copySpace?: 'left' | 'right' | 'top' | 'bottom' | 'none';
  sceneComplexity?: 'low' | 'medium' | 'high';
}

export class CommercialArtDirectorService {
  /**
   * Analyzes raw idea and inputs to generate a validated CommercialBrief.
   * Does NOT generate the final image prompt. Returns structured JSON only.
   */
  public analyzeBrief(options: AnalyzeBriefOptions): CommercialBrief {
    const rawIdea = (options.rawIdea || "commercial photography").trim();
    const commercialDirection = (options.commercialDirection || "Modern High-End Corporate Editorial").trim();

    // 1. Analyze Raw Idea & Interpret Commercial Direction
    const marketCategory = this.determineMarketCategory(rawIdea, commercialDirection);

    // 2 & 3. Determine Target Buyer & Buyer Problem
    const targetBuyer = (options.targetBuyer || this.inferTargetBuyer(rawIdea, commercialDirection)).trim();
    const buyerProblem = (options.buyerProblem || this.inferBuyerProblem(rawIdea, targetBuyer)).trim();

    // 4, 5, 6. Determine Buyer Intent, Buyer Mode & Intended Use
    const buyerIntent = (options.buyerIntent || "Drive conversion and project commercial trust").trim();
    const buyerMode = options.buyerMode || inferBuyerMode(commercialDirection, rawIdea);
    
    const intendedUse = Array.isArray(options.intendedUse) && options.intendedUse.length > 0
      ? options.intendedUse
      : [String(buyerMode), "Digital Marketing Campaign", "Website Hero Banner"];

    // 7, 8, 9. Create Commercial Concept, Visual Hook & Differentiation
    const commercialConcept = this.createCommercialConcept(rawIdea, commercialDirection);
    const visualHook = this.createVisualHook(rawIdea, commercialDirection);
    const differentiation = this.createDifferentiation(commercialDirection, marketCategory);

    // 10 & 11. Determine Copy Space (Copy-Space Aware Art Direction) & Scene Complexity
    const copySpace = determineCopySpace(commercialConcept, commercialDirection, options.copySpace);
    const sceneComplexity = options.sceneComplexity || "medium";

    // 12. Score Buyer Utility and Commercial Viability (Scale 0.0 - 10.0)
    const scores = this.calculateScores({
      rawIdea,
      commercialConcept,
      visualHook,
      copySpace,
      intendedUse,
      sceneComplexity
    });

    // 13. Apply Commercial Quality Gate Rules
    const passOverall = scores.overall >= 7.0;
    const passBuyerUtility = scores.buyerUtility >= 7.0;
    const passVectorSuitability = scores.vectorSuitability >= 7.0;

    const reworkReasons: string[] = [];
    if (!passOverall) reworkReasons.push("Overall commercial score is below threshold (7.0)");
    if (!passBuyerUtility) reworkReasons.push("Buyer utility score is below threshold (7.0)");
    if (!passVectorSuitability) reworkReasons.push("Vector suitability score is below threshold (7.0)");

    if (rawIdea.length < 3 || rawIdea.toLowerCase() === "image" || rawIdea.toLowerCase() === "photo") {
      reworkReasons.push("Concept is too generic");
    }
    if (!buyerIntent || buyerIntent.length < 10) {
      reworkReasons.push("Buyer use case is unclear");
    }
    if (!differentiation || differentiation.length < 10) {
      reworkReasons.push("Visual differentiation is weak");
    }

    const decision: 'PASS' | 'REWORK' = (passOverall && passBuyerUtility && passVectorSuitability && reworkReasons.length === 0) ? 'PASS' : 'REWORK';

    // 14. Return Validated CommercialBrief (Structured JSON Only)
    return {
      marketCategory,
      targetBuyer,
      buyerProblem,
      buyerIntent,
      buyerMode,
      intendedUse,
      licensingScenario: "Commercial Royalty-Free License (Microstock Ready)",
      commercialConcept,
      visualHook,
      differentiation,
      searchIntent: [rawIdea, marketCategory, ...intendedUse.map(u => String(u).toLowerCase())],
      compositionStrategy: copySpace !== 'none'
        ? `Rule of thirds with clean negative copy space allocated on the ${copySpace} for text overlays.`
        : "Isolated studio composition with clean neutral background.",
      copySpace,
      vectorStrategy: "Clean geometric paths with cutout layer hierarchy and max 16 colors limit.",
      sceneComplexity,
      risks: ["Avoid trademarked logos or brand identifiers", "Maintain facial symmetry and hand anatomy integrity", "No text or marketing overlays inside image"],
      scores,
      decision,
      reworkReasons: decision === 'REWORK' ? reworkReasons : undefined
    };
  }

  /**
   * Generates a Commercial Family of 6-10 non-overlapping, commercially distinct concepts for a root idea.
   * Filters out semantic duplicates / near-duplicates.
   * 
   * @param {string} rootIdea
   * @param {{ count?: number, commercialDirection?: string }} [options]
   * @returns {CommercialFamily}
   */
  public generateCommercialFamily(rootIdea: string, options: { count?: number; commercialDirection?: string } = {}): CommercialFamily {
    const cleanIdea = (rootIdea || "commercial asset").trim();
    const targetCount = Math.min(10, Math.max(6, options.count || 8));
    const direction = options.commercialDirection || "Modern Commercial Editorial";

    const archetypes = [
      {
        conceptName: `Executive Vision: ${cleanIdea}`,
        targetBuyer: "C-Suite Executives & Enterprise Strategy Teams",
        buyerIntent: "Project corporate authority, innovation, and long-term vision on executive headers",
        intendedUse: ["Website Hero Banner", "Annual Investor Report"],
        visualHook: "High-contrast golden hour lighting streaming through architectural floor-to-ceiling glass",
        composition: "Rule of thirds wide panoramic framing",
        copySpace: "right" as const,
        searchIntent: [cleanIdea, "executive vision", "enterprise leadership", "corporate strategy"]
      },
      {
        conceptName: `Authentic Lifestyle: ${cleanIdea}`,
        targetBuyer: "D2C Brand Marketing Managers & Consumer Ad Agencies",
        buyerIntent: "Evoke emotional warmth, accessibility, and relatable daily usage",
        intendedUse: ["Social Media Ad Campaign", "Instagram Story Feed"],
        visualHook: "Candid unposed human expression with soft morning ambient flare",
        composition: "Eye-level medium shot with soft background bokeh",
        copySpace: "top" as const,
        searchIntent: [cleanIdea, "authentic lifestyle", "consumer experience", "daily routine"]
      },
      {
        conceptName: `Isolated Asset: ${cleanIdea}`,
        targetBuyer: "App UI/UX Designers & Product Marketing Teams",
        buyerIntent: "Clean technical feature illustration for mobile app onboarding cards and UI graphics",
        intendedUse: ["Mobile App UI", "Onboarding Screen Card"],
        visualHook: "Sleek matte texture with crisp studio edge lighting",
        composition: "Centered studio cutout on pure seamless background",
        copySpace: "none" as const,
        searchIntent: [cleanIdea, "isolated asset", "3d icon", "app ui design"]
      },
      {
        conceptName: `Team Synergy: ${cleanIdea}`,
        targetBuyer: "B2B SaaS Content Directors & HR Talent Acquisition",
        buyerIntent: "Highlight agile teamwork, modern workplace culture, and shared problem solving",
        intendedUse: ["Recruitment Landing Page", "B2B SaaS Blog Feature"],
        visualHook: "Active gesture of engagement centered around a shared digital workspace",
        composition: "Over-the-shoulder wide angle view",
        copySpace: "left" as const,
        searchIntent: [cleanIdea, "team collaboration", "workplace synergy", "b2b saas"]
      },
      {
        conceptName: `Human Customer Care: ${cleanIdea}`,
        targetBuyer: "Customer Success & Service Operations Agencies",
        buyerIntent: "Reassure clients with human warmth, active listening, and service reliability",
        intendedUse: ["Customer Support Portal", "Trust & Assurance Brochure"],
        visualHook: "Genuine empathetic smile with soft warm color grading",
        composition: "Tight portrait framing with generous negative space",
        copySpace: "left" as const,
        searchIntent: [cleanIdea, "customer trust", "human empathy", "support service"]
      },
      {
        conceptName: `Data Performance: ${cleanIdea}`,
        targetBuyer: "Fintech, Data Analytics & Performance Marketers",
        buyerIntent: "Demonstrate measurable growth, analytics clarity, and high performance",
        intendedUse: ["Financial Performance Report", "SaaS Dashboard Hero"],
        visualHook: "Subtle glowing abstract data visualizer overlaying modern physical scene",
        composition: "Asymmetric balanced composition with clean right margin",
        copySpace: "right" as const,
        searchIntent: [cleanIdea, "data analytics", "performance growth", "fintech insights"]
      },
      {
        conceptName: `Sustainable Green Impact: ${cleanIdea}`,
        targetBuyer: "ESG Officers & Green Tech Marketing Campaigns",
        buyerIntent: "Communicate environmental stewardship and sustainable innovation",
        intendedUse: ["Sustainability Impact Report", "Green Tech Campaign Flyer"],
        visualHook: "Natural botanical foliage integrated with modern sleek materials",
        composition: "Low-angle perspective emphasizing growth",
        copySpace: "top" as const,
        searchIntent: [cleanIdea, "sustainability", "green technology", "esg impact"]
      },
      {
        conceptName: `Educational Tutorial Guide: ${cleanIdea}`,
        targetBuyer: "EdTech Platforms & Customer Onboarding Teams",
        buyerIntent: "Guide users step-by-step with clear intuitive visual instructions",
        intendedUse: ["Product Documentation", "EdTech Learning Module"],
        visualHook: "Clean step gesture pointing toward intuitive interaction point",
        composition: "Top-down flatlay perspective",
        copySpace: "bottom" as const,
        searchIntent: [cleanIdea, "educational tutorial", "step by step", "onboarding guide"]
      }
    ];

    const acceptedConcepts: CommercialFamilyConcept[] = [];

    for (const archetype of archetypes) {
      if (acceptedConcepts.length >= targetCount) break;

      // Duplicate / Overlap Filter: Pengecekan kemiripan semantik dengan konsep yang sudah diterima
      const isDuplicate = acceptedConcepts.some((existing) =>
        this.checkSemanticSimilarity(existing, archetype) > 0.45
      );

      if (!isDuplicate) {
        acceptedConcepts.push(archetype);
      }
    }

    return {
      rootIdea: cleanIdea,
      totalConcepts: acceptedConcepts.length,
      concepts: acceptedConcepts
    };
  }

  /**
   * Menghitung kemiripan semantik (Jaccard similarity) antara dua konsep untuk menolak duplikat.
   */
  private checkSemanticSimilarity(a: CommercialFamilyConcept, b: CommercialFamilyConcept): number {
    const textA = `${a.conceptName} ${a.targetBuyer} ${a.buyerIntent}`.toLowerCase();
    const textB = `${b.conceptName} ${b.targetBuyer} ${b.buyerIntent}`.toLowerCase();

    const tokensA = new Set(textA.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((t) => t.length > 3));
    const tokensB = new Set(textB.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((t) => t.length > 3));

    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersectionCount = 0;
    tokensA.forEach((token) => {
      if (tokensB.has(token)) intersectionCount++;
    });

    const unionSize = tokensA.size + tokensB.size - intersectionCount;
    return unionSize > 0 ? intersectionCount / unionSize : 0;
  }

  private determineMarketCategory(rawIdea: string, direction: string): string {
    const combined = (rawIdea + " " + direction).toLowerCase();
    if (combined.includes("tech") || combined.includes("saas") || combined.includes("software")) return "Technology & SaaS";
    if (combined.includes("health") || combined.includes("wellness") || combined.includes("medical")) return "Healthcare & Wellness";
    if (combined.includes("finance") || combined.includes("bank") || combined.includes("corporate")) return "Corporate & Finance";
    if (combined.includes("food") || combined.includes("cafe") || combined.includes("coffee")) return "Food & Beverage Lifestyle";
    return "Commercial Business & Lifestyle";
  }

  private inferTargetBuyer(rawIdea: string, direction: string): string {
    return "Marketing Directors, Creative Agencies, and Enterprise Content Teams";
  }

  private inferBuyerProblem(rawIdea: string, targetBuyer: string): string {
    return `High demand for authentic, high-converting visual assets representing '${rawIdea}' without generic stock clichés.`;
  }

  private createCommercialConcept(rawIdea: string, direction: string): string {
    return `Authentic modern scene illustrating ${rawIdea} rendered in a ${direction} style`;
  }

  private createVisualHook(rawIdea: string, direction: string): string {
    return `Dynamic visual contrast with warm natural lighting accentuating the primary subject of ${rawIdea}`;
  }

  private createDifferentiation(direction: string, category: string): string {
    return `Premium editorial aesthetic with balanced copy space tailored specifically for ${category}`;
  }

  private calculateScores(params: {
    rawIdea: string;
    commercialConcept: string;
    visualHook: string;
    copySpace: string;
    intendedUse: string[];
    sceneComplexity: string;
  }) {
    const isGeneric = params.rawIdea.length < 3 || params.rawIdea.toLowerCase() === "image" || params.rawIdea.toLowerCase() === "photo";
    const commercial = isGeneric ? 5.5 : 8.8;
    const buyerUtility = params.copySpace !== 'none' ? 9.2 : 7.5;
    const uniqueness = isGeneric ? 5.0 : 8.5;
    const searchability = 9.0;
    const vectorSuitability = params.sceneComplexity === 'high' ? 6.5 : 8.2;
    const visualClarity = params.sceneComplexity === 'high' ? 7.8 : 9.2;
    const overall = Number(((commercial + buyerUtility + uniqueness + searchability + vectorSuitability + visualClarity) / 6).toFixed(1));

    return {
      commercial,
      buyerUtility,
      uniqueness,
      searchability,
      vectorSuitability,
      visualClarity,
      overall
    };
  }
}
