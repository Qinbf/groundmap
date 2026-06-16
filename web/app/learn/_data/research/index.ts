import "server-only";
import type { StepData, SampleMeta } from "../types";
import { step1 } from "./step1";
import { step2 } from "./step2";
import { step3 } from "./step3";
import { step4 } from "./step4";
import { step5 } from "./step5";
import { step6 } from "./step6";
import { step7 } from "./step7";
import { step8 } from "./step8";
import { step9 } from "./step9";
import { step10 } from "./step10";

export function getResearchSteps(): StepData[] {
  return [step1, step2, step3, step4, step5, step6, step7, step8, step9, step10];
}

export const RESEARCH_META: SampleMeta = {
  id: "research",
  labelKey: "learn.sample.research",
  subtitleKey: "learn.sample.research.subtitle",
  pseudoRawPath: "raw/papers/_learn_demo/attention_is_all_you_need.md",
};
