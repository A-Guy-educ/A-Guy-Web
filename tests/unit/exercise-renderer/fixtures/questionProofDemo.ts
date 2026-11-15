/**
 * Hand-written `question_proof` fixtures matching the two exercises in the
 * design demo (aguy_proof_diagram_aligned.html). Shape follows the schema
 * Admin emits for the block.
 */

import type { InlineRichText, QuestionProofBlock } from '@/infra/types/exercise'

const rt = (value: string): InlineRichText => ({
  type: 'rich_text',
  format: 'md-math-v1',
  value,
  mediaIds: [],
})

/** ג — △KLM ≅ △XYZ by SAS; the student picks the final reason. */
export const proofSasKlmXyz: QuestionProofBlock = {
  id: 'proof-klm-xyz',
  type: 'question_proof',
  prompt: rt('הוכיחו כי $\\triangle KLM \\cong \\triangle XYZ$ לפי צ–ז–צ.'),
  given: rt('$KL = XY$, $LM = YZ$, $\\angle KLM = \\angle XYZ$'),
  table: {
    headers: ['טענה', 'נימוק'],
    rowsData: [
      ['$KL = XY$', 'נתון'],
      ['$LM = YZ$', 'נתון'],
      ['$\\angle KLM = \\angle XYZ$', 'נתון'],
      ['$\\triangle KLM \\cong \\triangle XYZ$', ''],
    ],
    answers: { '3-1': 'לפי צ–ז–צ' },
    options: { '3-1': ['לפי צ–ז–צ', 'לפי ז–צ–ז', 'נתון'] },
  },
  solution: rt('שתי צלעות והזווית הכלואה ביניהן שוות בהתאמה, ולכן המשולשים חופפים לפי צ–ז–צ.'),
  attachment: {
    kind: 'svg',
    layout: 'textRight',
    svg: {
      value:
        '<svg viewBox="0 0 380 335" xmlns="http://www.w3.org/2000/svg"><path d="M75 38 L47 296 L172 38 Z M330 38 L306 296 L211 296 Z" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
      altText: 'משולשים KLM ו-XYZ',
    },
  },
}

/** ד — △ABC ≅ △ADC with the common side AC; the student picks the middle reason. */
export const proofCommonSideAbcAdc: QuestionProofBlock = {
  id: 'proof-abc-adc',
  type: 'question_proof',
  prompt: rt('הוכיחו כי $\\triangle ABC \\cong \\triangle ADC$ לפי צ–ז–צ.'),
  given: rt('במרובע $ABCD$ מעבירים את האלכסון $AC$.\n\n$AB = AD$, $\\angle BAC = \\angle DAC$'),
  table: {
    headers: ['טענה', 'נימוק'],
    rowsData: [
      ['$AB = AD$', 'נתון'],
      ['$\\angle BAC = \\angle DAC$', 'נתון'],
      ['$AC = AC$', ''],
      ['$\\triangle ABC \\cong \\triangle ADC$', 'לפי צ–ז–צ'],
    ],
    answers: { '2-1': 'צלע משותפת' },
    options: { '2-1': ['נתון', 'צלע משותפת', 'זוויות קודקודיות'] },
  },
  solution: rt(
    'הקטע $AC$ שייך לשני המשולשים, ולכן $AC = AC$ — צלע משותפת. מתקיימת חפיפה לפי צ–ז–צ.',
  ),
}
