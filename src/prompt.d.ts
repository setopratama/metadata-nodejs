import { CommercialReasoningFlow, SynthesizedPrompt } from "./types.d.js";

export const RESTRICTED_TRADEMARKS: string[];
export const BUYER_MODE_MAP: Record<string, string>;

export function determineCopySpace(
  commercialConcept?: string,
  stylePreset?: string,
  userCopySpace?: string
): 'left' | 'right' | 'top' | 'bottom' | 'none';

export function inferBuyerMode(commercialDirection?: string, commercialConcept?: string): string;

export function normalizeReasoningFlow(inputFlow?: Partial<CommercialReasoningFlow>): CommercialReasoningFlow;

export function synthesizeOptimizedPrompt(rawFlow: CommercialReasoningFlow): SynthesizedPrompt;

export function validateQualityGate(promptText: string, composition?: any): {
  overallScore: number;
  passTrademarkFilter: boolean;
  passCopySpaceCheck: boolean;
  passCommercialClarity: boolean;
  foundTrademarks: string[];
  decision: 'PASS' | 'REWORK';
};

export function generateSeoStockMetadata(rawFlow: CommercialReasoningFlow): {
  title: string;
  description: string;
  keywords: string[];
};
