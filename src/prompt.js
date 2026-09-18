// Modul Sintesis Prompt & Reasoning Flow Commercial AI Studio (Roadmap 2.2) — Zero External Dependencies.
// Mengelola 9 konsep terpisah: WHY, WHO, PROBLEM, JOB, USE, WHAT, HOOK, HOW, ARRANGEMENT + Buyer Mode (WHERE) + Global Visual Safety + Scene Complexity + SEO Stock Metadata.

import https from "node:https";
import http from "node:http";

/**
 * Daftar kata terlarang (trademark & brand) untuk Commercial Quality Gate & SEO Metadata.
 */
export const RESTRICTED_TRADEMARKS = [
  "apple", "iphone", "ipad", "macbook", "nike", "adidas", "puma", "reebok",
  "starbucks", "coca-cola", "pepsi", "mcdonalds", "google", "microsoft",
  "windows", "facebook", "instagram", "twitter", "tiktok", "amazon",
  "tesla", "bmw", "mercedes", "audi", "porsche", "disney", "marvel"
];

/**
 * Mapping Preset Buyer Mode ("Where will the buyer use it?").
 */
export const BUYER_MODE_MAP = {
  "hero-banner": "Website Hero Banner & Desktop Header",
  "social-ad": "Social Media Ad Campaign & Mobile Feed",
  "annual-report": "Corporate Annual Report & Investor Presentation",
  "editorial-article": "Editorial Article Cover & Feature Publication",
  "app-onboarding": "Mobile App UI & Onboarding Screen",
  "print-brochure": "Print Marketing Brochure & Display Flyer"
};

/**
 * Menentukan copySpace secara otomatis berdasarkan konteks komposisi.
 * Untuk komposisi isolated-object (objek terisolasi / studio cutout / 3d icon) -> default "none".
 * Untuk komposisi adegan komersial / konteks -> default "right" / "left".
 * 
 * @param {string} commercialConcept
 * @param {string} stylePreset
 * @param {string} [userCopySpace]
 * @returns {'left' | 'right' | 'top' | 'bottom' | 'none'}
 */
export function determineCopySpace(commercialConcept = "", stylePreset = "", userCopySpace = "") {
  if (userCopySpace && ["left", "right", "top", "bottom", "none"].includes(userCopySpace.toLowerCase())) {
    return /** @type {'left' | 'right' | 'top' | 'bottom' | 'none'} */ (userCopySpace.toLowerCase());
  }

  const combined = (commercialConcept + " " + stylePreset).toLowerCase();
  const isIsolatedObject = Boolean(
    combined.includes("isolated") ||
    combined.includes("white background") ||
    combined.includes("cutout") ||
    combined.includes("studio background") ||
    combined.includes("3d icon") ||
    combined.includes("single object") ||
    combined.includes("isolated object")
  );

  if (isIsolatedObject) {
    return "none";
  }

  // Auto-determine untuk contextual/commercial-scene compositions
  if (combined.includes("vertical") || combined.includes("mobile") || combined.includes("story")) {
    return "top";
  }
  return "right";
}

/**
 * Infer Buyer Mode (WHERE) secara otomatis dari Commercial Direction (WHY) atau Commercial Concept (WHAT)
 * apabila pengguna tidak mengisinya secara manual.
 * 
 * @param {string} commercialDirection
 * @param {string} commercialConcept
 * @returns {string}
 */
export function inferBuyerMode(commercialDirection = "", commercialConcept = "") {
  const combined = (commercialDirection + " " + commercialConcept).toLowerCase();

  if (combined.includes("social") || combined.includes("instagram") || combined.includes("feed") || combined.includes("ad")) {
    return BUYER_MODE_MAP["social-ad"];
  }
  if (combined.includes("report") || combined.includes("enterprise") || combined.includes("corporate") || combined.includes("annual")) {
    return BUYER_MODE_MAP["annual-report"];
  }
  if (combined.includes("editorial") || combined.includes("blog") || combined.includes("article") || combined.includes("magazine")) {
    return BUYER_MODE_MAP["editorial-article"];
  }
  if (combined.includes("app") || combined.includes("mobile") || combined.includes("ui") || combined.includes("onboarding")) {
    return BUYER_MODE_MAP["app-onboarding"];
  }
  if (combined.includes("print") || combined.includes("brochure") || combined.includes("flyer") || combined.includes("billboard")) {
    return BUYER_MODE_MAP["print-brochure"];
  }

  // Fallback default cerdas untuk microstock
  return BUYER_MODE_MAP["hero-banner"];
}

/**
 * Normalisasi & validasi alur penalaran komersial (9 Distinct Concepts + Buyer Mode + Scene Complexity).
 * 
 * @param {import("./types.d.ts").CommercialReasoningFlow | import("./types.d.ts").CommercialBrief} inputFlow
 * @returns {import("./types.d.ts").CommercialReasoningFlow}
 */
export function normalizeReasoningFlow(inputFlow = {}) {
  const directionStr = String(inputFlow.commercialDirection || inputFlow.marketCategory || "Modern High-End Corporate Editorial").trim();
  const conceptStr = String(inputFlow.commercialConcept || "Diverse team collaborating around a sunlit wooden workspace").trim();
  const styleStr = String(inputFlow.stylePreset || "Commercial Photography, Soft Natural Lighting, Warm Neutral Palette, 85mm f/1.8 lens").trim();

  let resolvedBuyerMode = "";
  if (inputFlow.buyerMode && typeof inputFlow.buyerMode === "string" && inputFlow.buyerMode.trim()) {
    const rawMode = inputFlow.buyerMode.trim().toLowerCase();
    resolvedBuyerMode = BUYER_MODE_MAP[rawMode] || inputFlow.buyerMode.trim();
  } else {
    resolvedBuyerMode = inferBuyerMode(directionStr, conceptStr);
  }

  const intendedUseArray = Array.isArray(inputFlow.intendedUse)
    ? inputFlow.intendedUse.map((s) => String(s).trim()).filter(Boolean)
    : typeof inputFlow.intendedUse === "string"
    ? inputFlow.intendedUse.split(",").map((s) => s.trim()).filter(Boolean)
    : [resolvedBuyerMode, "Digital Marketing Campaign"];

  let inputCopySpace = "";
  let framingStrat = "Rule of Thirds framing";
  let aspectR = "16:9";

  if (typeof inputFlow.composition === "object" && inputFlow.composition !== null) {
    inputCopySpace = inputFlow.composition.copySpace || "";
    framingStrat = inputFlow.composition.framingStrategy || framingStrat;
    aspectR = inputFlow.composition.aspectRatio || aspectR;
  } else if (typeof inputFlow.composition === "string" && inputFlow.composition.trim()) {
    framingStrat = inputFlow.composition.trim();
  } else if (inputFlow.copySpace) {
    inputCopySpace = inputFlow.copySpace;
  }

  const resolvedCopySpace = determineCopySpace(conceptStr, styleStr, inputCopySpace);

  let resolvedComplexity = inputFlow.sceneComplexity;
  if (!resolvedComplexity || !["low", "medium", "high"].includes(resolvedComplexity)) {
    resolvedComplexity = resolvedCopySpace === "none" ? "low" : "medium";
  }

  const compositionObj = {
    aspectRatio: aspectR,
    copySpace: resolvedCopySpace,
    framingStrategy: framingStrat
  };

  return {
    commercialDirection: directionStr,
    buyerMode: resolvedBuyerMode,
    targetBuyer: String(inputFlow.targetBuyer || "Tech Startup Marketing Director & Enterprise Buyers").trim(),
    buyerProblem: String(inputFlow.buyerProblem || "Lack of authentic, high-converting visual assets for modern SaaS products").trim(),
    buyerIntent: String(inputFlow.buyerIntent || "Drive conversion and project trust on digital marketing hero banners").trim(),
    intendedUse: intendedUseArray,
    commercialConcept: conceptStr,
    visualHook: String(inputFlow.visualHook || "Dynamic warm morning sunlight flare catching a sleek glass coffee mug").trim(),
    stylePreset: styleStr,
    composition: compositionObj,
    sceneComplexity: resolvedComplexity,
    explicitText: inputFlow.explicitText ? String(inputFlow.explicitText).trim() : undefined
  };
}

/**
 * Sintesis Prompt Komersial dari Konsep Terpisah dengan Controller Scene Complexity & Aturan Safety Global.
 * 
 * @param {import("./types.d.ts").CommercialReasoningFlow | import("./types.d.ts").CommercialBrief} rawFlow
 * @returns {import("./types.d.ts").SynthesizedPrompt}
 */
export function synthesizeOptimizedPrompt(rawFlow) {
  const flow = normalizeReasoningFlow(rawFlow);
  const comp = typeof flow.composition === "object" ? flow.composition : { aspectRatio: "16:9", copySpace: "right", framingStrategy: String(flow.composition) };
  const copySpace = comp.copySpace || "right";
  const complexity = flow.sceneComplexity || "medium";

  // 1. WHAT & HOOK: Subjek Utama & Position
  let subjectPositioning = "";
  if (copySpace === "right") {
    subjectPositioning = "Primary subject positioned on the left two-thirds of the frame, keeping the right third completely clear.";
  } else if (copySpace === "left") {
    subjectPositioning = "Primary subject positioned on the right two-thirds of the frame, keeping the left third completely clear.";
  } else if (copySpace === "top") {
    subjectPositioning = "Primary subject positioned on the lower two-thirds of the frame, keeping the top third completely clear.";
  } else if (copySpace === "bottom") {
    subjectPositioning = "Primary subject positioned on the upper two-thirds of the frame, keeping the bottom third completely clear.";
  } else {
    subjectPositioning = "Balanced subject positioning with clean surrounding negative space.";
  }

  const subjectSection = `${flow.commercialConcept}. Visual focal point: ${flow.visualHook}. ${subjectPositioning}`;

  // 2. SCENE COMPLEXITY CONTROLLER & ZERO UNPURPOSED DECORATION RULE
  let complexityDirective = "";
  if (complexity === "low") {
    complexityDirective = "Scene Complexity: LOW (1 hero subject + minimal supporting elements). Ultra-clean visual focus with no distraction.";
  } else if (complexity === "high") {
    complexityDirective = "Scene Complexity: HIGH (multiple interacting elements only when commercially justified). Dynamic story composition.";
  } else {
    complexityDirective = "Scene Complexity: MEDIUM (1 hero subject + 2-4 supporting elements + coherent environment). Balanced commercial realism.";
  }
  const purposeRule = "NO UNPURPOSED DECORATION: Do not add decorative elements or clutter without explicit commercial purpose. Every element must serve a commercial function.";

  // 3. WHY & HOW: Commercial Mood & Style Preset
  const styleSection = `Art Direction & Commercial Intent: ${flow.commercialDirection}, ${flow.stylePreset}. High commercial aesthetic, photorealistic texture, professional color grading.`;

  // 4. ARRANGEMENT: Framing & Copy Space Directive
  let copySpaceDirective = "";
  if (copySpace !== "none") {
    copySpaceDirective = `Dedicated clean negative copy-space allocated on the ${copySpace} for headline text overlay. Uncluttered, smooth out-of-focus background in copy space region.`;
  } else {
    copySpaceDirective = "Studio isolated framing with clean neutral background.";
  }
  const compositionSection = `Framing & Composition: ${comp.framingStrategy}. Aspect Ratio ${comp.aspectRatio || "16:9"}. ${copySpaceDirective}`;

  // 5. WHERE, WHO, PROBLEM, JOB, USE: Buyer Mode & Commercial Alignment
  const commercialContext = `Placement & Buyer Mode: ${flow.buyerMode}. Designed for ${flow.targetBuyer} for ${flow.intendedUse.join(", ")}. Resolving buyer problem: ${flow.buyerProblem}.`;

  // 6. GLOBAL VISUAL SAFETY RULE
  let visualSafetyDirective = "";
  if (flow.explicitText) {
    visualSafetyDirective = `EXPLICIT TEXT DIRECTIVE: Render explicit text '${flow.explicitText}'. No other text, slogans, or logos allowed.`;
  } else {
    visualSafetyDirective = "GLOBAL VISUAL SAFETY RULE: Do not generate readable text, slogans, logos, fake brand names, fictional company names, signage copy, or medical claims. Prefer blank signage, blank packaging labels, abstract interface shapes, and clean copy space.";
  }

  // Combined Final Prompt
  const fullPromptText = `${subjectSection} ${complexityDirective} ${purposeRule} ${styleSection} ${compositionSection} ${commercialContext} ${visualSafetyDirective}`;

  // Validasi Quality Gate
  const qualityGate = validateQualityGate(fullPromptText, comp);

  return {
    fullPromptText,
    reasoningFlow: flow,
    qualityScore: qualityGate.overallScore,
    qualityCheck: {
      passTrademarkFilter: qualityGate.passTrademarkFilter,
      passCopySpaceCheck: qualityGate.passCopySpaceCheck,
      passCommercialClarity: qualityGate.passCommercialClarity
    }
  };
}

/**
 * Validasi Commercial Quality Gate pada prompt.
 * 
 * @param {string} promptText
 * @param {object} composition
 * @returns {object}
 */
export function validateQualityGate(promptText, composition = {}) {
  const lower = promptText.toLowerCase();
  
  // 1. Cek trademark terlarang
  const foundTrademarks = RESTRICTED_TRADEMARKS.filter((tm) => lower.includes(tm));
  const passTrademarkFilter = foundTrademarks.length === 0;

  // 2. Cek kecukupan copy space
  const passCopySpaceCheck = Boolean(
    lower.includes("copy-space") ||
    lower.includes("negative space") ||
    lower.includes("copy space") ||
    (composition.copySpace && composition.copySpace !== "none")
  );

  // 3. Cek kejelasan komersial
  const passCommercialClarity = promptText.length >= 50 && (lower.includes("commercial") || lower.includes("stock") || lower.includes("focal point"));

  let score = 100;
  if (!passTrademarkFilter) score -= 40;
  if (!passCopySpaceCheck) score -= 20;
  if (!passCommercialClarity) score -= 20;

  return {
    overallScore: Math.max(0, score),
    passTrademarkFilter,
    passCopySpaceCheck,
    passCommercialClarity,
    foundTrademarks,
    decision: score >= 70 && passTrademarkFilter ? "PASS" : "REWORK"
  };
}

/**
 * Generasi Metadata SEO & Microstock (Title, Description, Keywords) berbasis CommercialBrief
 * dengan Hierarki Prioritas Terurut 7 Lapis & Kepatuhan Faktual Adobe Stock.
 * 
 * Priority Hierarki:
 * 1. Core subject
 * 2. Commercial concept
 * 3. Specific visual elements
 * 4. Context
 * 5. Intended use
 * 6. Style
 * 7. Secondary themes
 * 
 * @param {import("./types.d.ts").CommercialBrief | import("./types.d.ts").CommercialReasoningFlow} briefOrFlow
 * @returns {{ title: string, description: string, keywords: string[] }}
 */
export function generateSeoStockMetadata(briefOrFlow) {
  const flow = normalizeReasoningFlow(briefOrFlow);
  const comp = typeof flow.composition === "object" ? flow.composition : { copySpace: "right" };

  // 1. Title Faktual Komersial (Adobe Stock Standard: Concise, clear subject description)
  const title = `${flow.commercialConcept} for ${flow.intendedUse[0] || flow.buyerMode || "Commercial Use"}`.slice(0, 150);

  // 2. Description Faktual Komersial
  const description = `${flow.commercialConcept} featuring ${flow.visualHook}. Rendered in ${flow.commercialDirection} style. Suitable for ${flow.intendedUse.join(", ")}.`;

  // 3. Keywords Terstruktur Berdasarkan 7 Lapisan Prioritas
  const priorityLayers = [
    // Layer 1: Core Subject
    [flow.commercialConcept],
    // Layer 2: Commercial Concept
    [flow.buyerIntent, flow.buyerProblem],
    // Layer 3: Specific Visual Elements
    [flow.visualHook],
    // Layer 4: Context
    [flow.commercialDirection, flow.targetBuyer],
    // Layer 5: Intended Use
    [...flow.intendedUse, flow.buyerMode, comp.copySpace && comp.copySpace !== "none" ? `copy space ${comp.copySpace}` : "isolated"],
    // Layer 6: Style
    [flow.stylePreset, "commercial photography", "photorealistic"],
    // Layer 7: Secondary Themes
    ["advertising", "business", "marketing", "stock photo", "commercial use", "background", "authentic"]
  ];

  const keywordSet = new Set();
  const restrictedLower = new Set(RESTRICTED_TRADEMARKS);

  priorityLayers.forEach((layerWords) => {
    layerWords.forEach((phrase) => {
      if (!phrase) return;
      
      const cleanPhrase = String(phrase).trim();

      // Tambahkan frasa 2-3 kata jika relevan secara faktual
      if (cleanPhrase.length >= 4 && cleanPhrase.length <= 40 && !cleanPhrase.includes("http")) {
        const lowerPhrase = cleanPhrase.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim();
        if (lowerPhrase && !restrictedLower.has(lowerPhrase)) {
          keywordSet.add(lowerPhrase);
        }
      }

      // Tokenisasi kata tunggal yang relevan
      cleanPhrase
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !restrictedLower.has(w))
        .forEach((token) => {
          // Filter kata yang tidak informatif / spammy
          if (!["for", "and", "the", "with", "from", "that", "this", "your"].includes(token)) {
            keywordSet.add(token);
          }
        });
    });
  });

  const keywords = Array.from(keywordSet).slice(0, 50);

  return {
    title,
    description,
    keywords
  };
}
