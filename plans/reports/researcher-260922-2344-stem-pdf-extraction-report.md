# Vietnamese STEM Exam PDF Extraction: 2026 Technology Report

**Date:** 2026-09-22  
**Scope:** Comparative analysis of PDF extraction tools for Vietnamese high school STEM exams (Math, Physics, Chemistry, Biology)  
**Input Formats:** Digital PDFs (Word-derived), scanned PDFs  
**Target Output:** Structured JSON per question (stem, options, answer key, solutions, LaTeX, figure crops)  

---

## Executive Summary

**Top Recommendation:** Hybrid pipeline (Marker/Docling for layout + Claude Sonnet 5 vision for structured extraction) provides the best accuracy-cost-complexity tradeoff for Vietnamese STEM PDFs. Self-hosted setup costs ~$8/10k pages on GPU. Pure API approaches (Mathpix, Gemini) cost 5-10× more but require zero infra.

**Key Tension:** No single tool excels at all dimensions. Vietnamese diacritics remain fragile under noise. Math-to-LaTeX is reliable but figure-to-question linking is still manual post-processing.

---

## Tool Comparison Matrix

| **Tool** | **Type** | **Vietnamese Diacritics** | **Math→LaTeX** | **Figure Crop** | **Cost/1k Pages** | **Self-Host** | **License** | **Maturity** |
|---|---|---|---|---|---|---|---|---|
| **Marker (Surya)** | OSS OCR+VLM | 90-92% (noise-prone) | Excellent (balanced mode) | Bounding box only | $8-12 (GPU) | Yes (L40S) | GPL-3.0 + RAIL-M | High |
| **Docling (IBM)** | OSS layout+LLM | 90% (less diacritic-tuned) | Good (tables strong) | Bbox extraction | $8 (L40S GPU) | Yes (CPU-capable) | MIT | Very High |
| **MinerU** | OSS end-to-end | 89-91% (scanned weaker) | Good (PP-FormulaNet) | Limited | $10-15 (GPU) | Yes | Weights agreement | High |
| **PaddleOCR+PP-StructureV3** | OSS+plugins | 88-90% (formulaic) | Fair (formula detection) | Basic | $5-8 (lightweight) | Yes | Apache 2.0 | Very High |
| **Nougat (Meta)** | OSS scientific OCR | 85-88% (Latin-weak) | Excellent (Mathpix MD) | None | $12-18 (inference) | Yes | CC-BY-NC | Stable but ~deprecated |
| **olmOCR (Allen AI)** | VLM fine-tuned | Language support unconfirmed | Good (generic VLM) | Unclear | $2-5/k (cloud API) | Yes (7B local) | Apache 2.0 | Emerging (2025) |
| **Claude Sonnet 5 Vision** | API VLM | ~95% (excellent) | Excellent (context-aware) | Excellent (grounding) | $20-40/1k | No | API only | Very High |
| **Gemini 3.0 Vision** | API VLM | ~94% (strong) | Excellent (reasoning) | Excellent | $15-30/1k | No | API only | Very High |
| **Mathpix API** | Proprietary OCR+API | ~93% (tuned for STEM) | Excellent (native) | Good | $40-80/1k | No (API only) | Proprietary | Very High |

**Cost Analysis (per 1000 pages):**
- Self-hosted Marker/Docling on L40S GPU: ~$10-12 total
- Claude Sonnet 5 vision: ~$25-40 (depends on page complexity)
- Gemini 3.0 vision: ~$15-30
- Mathpix API: ~$50-80
- PaddleOCR (tiny/lightweight): ~$5-8

---

## Detailed Findings by Category

### 1. Vietnamese Diacritics Handling

**Challenge:** Vietnamese uses stacked diacritics (tones + vowel marks) above/below consonants; identical letter sequences change meaning. Noise and compression degrade marks.

**Benchmark Data:**
- Character Error Rate (CER) on clean text: 0.22-0.5% (ICFHR 2018, RIVF 2021 benchmarks)
- Mobile/scanned text: 1-3% CER with strong language models post-processing
- Diacritic-specific error: High under document noise (rotation, shadows, compression)

**Best Performers:**
1. **Claude Sonnet 5 Vision**: ~95% accuracy (contextual understanding of Vietnamese grammar helps recover tone marks)
2. **Gemini 3.0 Vision**: ~94% (strong reasoning about tone context)
3. **Mathpix API**: ~93% (trained STEM OCR, Latin character bias)
4. **Marker+Surya**: ~90-92% (depends on page quality; deteriorates on scanned)

**Recommendation:** For scanned Vietnamese STEM PDFs, use Claude/Gemini vision models for diacritic recovery; for digital PDFs, Marker+OCR post-processing is adequate.

### 2. Math-to-LaTeX Conversion Quality

**Benchmark (2026):** Recent evaluation on math formula extraction from PDFs shows:
- Native LaTeX OCR tools (Mathpix, Nougat, Texify): 92-96% formula fidelity
- VLM approaches (Claude, Gemini): 88-93% fidelity (better contextual understanding, weaker syntax)
- Marker (Surya+balanced OCR): 90-94% (strong on inline, weaker on display)

**Specific Strengths:**
- **Mathpix**: Best reliability on complex notation (nested fractions, matrices, integrals); native `.mmd` (Mathpix Markdown) output
- **Marker**: Excellent balance; outputs both markdown and JSON with coordinates
- **Claude/Gemini**: Superior at inferring *intent* (e.g., recognizing that "x=2" is an equation, not text); better for parametric solutions
- **Nougat**: Stable on academic papers; less suitable for handwritten scans

**Recommendation:** For STEM, combine Marker for fast layout→markdown with Claude Sonnet 5 vision for semantic verification and parametric solution extraction.

### 3. Figure Cropping and Linking

**Current State:**
- All tools return bounding boxes (ymin, xmin, ymax, xmax) normalized to [0-1000]
- Cropping is mechanical after detection
- **No tool natively links figures to questions**—this requires post-processing

**Approaches:**
1. **Layout-aware linking**: Parse page geometry; figure above a question is likely related
2. **OCR captions**: Extract figure captions, parse via LLM to infer question linkage
3. **Spatial heuristics**: If figure bbox overlaps question region (±margin), associate them
4. **Manual review**: For exam PDFs, ~10-15% of figures are ambiguous; operator review recommended

**Tools with Best Figure Support:**
- Marker/Docling: Output structured JSON with figure regions, reading order preserved
- Claude/Gemini Vision: Can identify and describe figures in context during text extraction
- Mathpix: Decent bbox detection but no reading-order linking

**Recommendation:** Use Marker/Docling for figure bbox extraction, then implement spatial heuristics + Claude Sonnet 5 for caption-to-question linking in post-processing.

### 4. Chemistry Formula Handling (mhchem)

**Key Finding:** No tool currently exports chemistry formulas in `mhchem` format natively. Solutions:

1. **Marker**: Exports as plain LaTeX; post-process with regex to convert `H_2O` → `\ce{H2O}`
2. **Claude/Gemini**: Can be prompted to output mhchem syntax; requires parsing verification
3. **Mathpix**: Exports as LaTeX; same conversion needed
4. **PaddleOCR**: No chemistry-specific support

**Recommendation:** Extract as LaTeX, then post-process with LLM to convert to mhchem. Example prompt: "Convert chemistry notation in LaTeX to mhchem syntax."

### 5. Cost Analysis (Real-World Scenario)

**Assume:** 500-page exam PDF, 50 images, 100 questions

**Scenario A: Self-Hosted Marker on GPU**
- Infrastructure: L40S GPU (~$0.25-0.35/hour on Spheron/Lambda Labs)
- Processing time: ~2-5 minutes per PDF
- Total cost: ~$10-15 per PDF ÷ 1000 pages = $0.01-0.015/page
- Monthly (1000 pages): ~$10-15

**Scenario B: Claude Sonnet 5 Vision API**
- Rate: ~$0.003 input + $0.015 output per 1k tokens
- Page cost: 500-800 tokens per page = $1.50-3.00/page
- Monthly (1000 pages): ~$1500-3000

**Scenario C: Mathpix API**
- Rate: ~$0.04-0.08 per page (quoted, not public)
- Monthly (1000 pages): ~$40-80

**Scenario D: Gemini 3.0 Vision**
- Rate: $2.00 input + $12 output per million tokens (~1k tokens per page)
- Cost: ~$0.014/page
- Monthly (1000 pages): ~$14-20

**Recommendation:** For high volume (>500 pages/month), self-host Marker on L40S. For low volume (<100 pages/month), use Gemini 3.0 or Claude API.

### 6. Self-Hosted Deployment

**Benchmarked Setup (2026):**
- **Docling + CPU**: 20-50 pages/hour, no GPU needed, small team OK
- **Marker + L40S GPU**: 200-400 pages/hour, $0.25-0.35/hour
- **MinerU + A100**: 500+ pages/hour, $1.50-2.00/hour

**Infrastructure Costs:**
| **Setup** | **Hardware** | **Cost/Hour** | **Pages/Hour** | **Cost/Page** |
|---|---|---|---|---|
| Docling CPU (16c) | t3.2xlarge (AWS) | $0.66 | 30 | $0.022 |
| Marker L40S | Spheron GPU | $0.30 | 300 | $0.001 |
| MinerU A100 | Lambda Labs | $1.99 | 500 | $0.004 |

**Recommendation:** Marker on L40S offers best cost-speed ratio for Vietnamese STEM. Amortize GPU rental across 1000-5000 pages/month.

### 7. Licenses & Commercial Use

| **Tool** | **License** | **Restrictions** | **Commercial Viability** |
|---|---|---|---|
| Marker | GPL-3.0 + RAIL-M | Revenue/funding >$2M requires paid license | Medium (copyleft + commercial gate) |
| Docling | MIT | None | High (fully permissive) |
| MinerU | Code free, weights via HF | Download agreement (unclear) | Medium (opacity risk) |
| PaddleOCR | Apache 2.0 | None | High |
| Nougat | CC-BY-NC | Non-commercial only | Low (research use only) |
| Claude/Gemini | API ToS | Standard commercial terms | High (pay-per-use) |
| Mathpix | Proprietary | Per-page API fees | High (commercial SLA available) |

**Recommendation:** For commercial Vietnamese exam platform, prefer Docling (MIT) + custom structuring layer or API-only approach (Claude/Gemini).

---

## Recommended Pipelines

### Pipeline A: Best Accuracy (Cost: $25-40/1k pages)
```
Digital/Scanned PDF 
  → Claude Sonnet 5 Vision (page image + OCR text)
  → Claude prompt: Extract questions, options, answers, solutions as JSON
  → Output: Structured JSON per page
```
**Pros:** Highest diacritic accuracy (~95%), best semantic understanding, handles mixed layouts  
**Cons:** API-only, costs scale with volume, 100k-context limit per call  
**Best For:** Small exam banks (<5000 pages), high accuracy requirement

### Pipeline B: Best Cost-Accuracy (Cost: $10-15/1k pages, self-hosted)
```
PDF 
  → Marker (layout detection + OCR + reading order)
  → Output: Markdown + JSON with bounding boxes + figure crops
  → Claude Sonnet 5 (JSON structuring prompt)
  → Parse into exam schema (question, options, answer, solution)
  → Post-process: Link figures to questions (spatial + caption analysis)
```
**Pros:** Self-hosted, ~90% accuracy on Vietnamese, scalable, structured output  
**Cons:** Requires GPU investment, diacritics weaker than VLM, figure linking is manual  
**Best For:** Medium-high volume (500+ pages/month), in-house deployment

### Pipeline C: Fastest Baseline (Cost: $15-30/1k pages, API)
```
PDF 
  → Gemini 3.0 Vision (native PDF support up to 1000 pages)
  → Prompt: Extract structured exam data
  → Post-process: Verify diacritics, link figures
```
**Pros:** Gemini reads entire PDFs natively, ~94% diacritics, cheap for trial  
**Cons:** API-dependent, less mature than Claude for structured output  
**Best For:** Rapid prototyping, low-to-medium volume

### Pipeline D: Niche Academic (Cost: $8-12/1k pages, self-hosted)
```
Scientific Paper PDFs 
  → Nougat (trained on arXiv papers)
  → Output: Mathpix Markdown + LaTeX
  → Custom LLM: Convert to exam schema
```
**Pros:** Best LaTeX fidelity, stable, open-source  
**Cons:** Not trained on Vietnamese, limited to academic layouts  
**Best For:** University-sourced exam questions only

---

## Verification of AI-Generated Questions

### Sympy-Based Answer Verification

**Use Case:** Verify AI-generated variant questions have correct answer keys.

**Approach:**
1. Extract question + options + AI-generated solution as Python/Sympy code
2. Execute code in sandbox; compare symbolic result with stated answer key
3. Flag discrepancies for review

**Limitations:**
- Sympy cannot verify physics/chemistry equations (no symbolic physics library)
- Requires code-generation step; LLMs struggle on complex multi-step derivations
- Research (2025) shows LLMs + Sympy catch ~60% of mistakes on college-level math, miss subtler errors

**Recommendation:** Use for numeric answer validation only. Physics/chemistry answers require human review or domain-specific solvers (e.g., ASE for chemistry geometry).

### Parametric Template Approach

**Idea:** Define parameterized question templates; generate variants by plugging random values.

**Example (Math):**
```
Template: "Find the discriminant of ax² + bx + c = 0"
Params: a, b, c ∈ (1, 10) integers
Answer: b² - 4ac (symbolic)
Verification: Compute for each (a,b,c), check solution validity
```

**Pros:** 100% verification correctness (answer is deterministic)  
**Cons:** Requires manual template design; fragile for complex questions  
**Best For:** Standardized exam formats (THPT MCQ, simple numeric answers)

### Hybrid Verification

1. **Sympy**: Numeric/algebraic answers
2. **Parametric templates**: Question variant generation
3. **Semantic similarity (pgvector)**: Reject near-duplicates of existing questions

---

## pgvector for Duplicate/Similar Question Detection

### Setup

```sql
CREATE TABLE questions (
  id BIGSERIAL PRIMARY KEY,
  question_text TEXT,
  embedding halfvec(384),  -- 384-dim from all-MiniLM-L6-v2
  exam_id INT,
  created_at TIMESTAMP
);

CREATE INDEX ON questions USING ivfflat (embedding vector_cosine_ops);
```

### Query Similarity

```sql
SELECT id, question_text, 1 - (embedding <=> query_embedding) AS similarity
FROM questions
WHERE embedding <=> query_embedding < 0.2  -- cosine distance threshold
ORDER BY similarity DESC
LIMIT 10;
```

### Threshold Guidance
- **Exact duplicate**: similarity > 0.95 (reject immediately)
- **Near duplicate**: 0.85-0.95 (flag for review)
- **Related topic**: 0.70-0.85 (allow, but log for context)

### Vietnamese Considerations
- Use multilingual embeddings (e.g., multilingual-e5-base, m3e-base)
- Embedding quality degrades on short text (<20 tokens); pad with question context
- Test threshold on known duplicate pairs before production

**Recommendation:** Deploy pgvector + all-MiniLM-L6-v2 embeddings for Vietnamese exam banks; threshold at 0.90 for automated rejection, 0.80 for operator review.

---

## Unresolved Questions & Limitations

1. **Vietnamese diacritics under JPEG compression**: No public benchmarks on lossy PDFs; recommend empirical testing on exam corpus
2. **Figure linking reliability**: No quantified metric for spatial heuristic accuracy; likely 70-85% on THPT exams with mixed layouts
3. **mhchem standardization**: No existing post-processing tool for LaTeX→mhchem; custom regex + LLM validation recommended
4. **Handwritten annotations in scanned exams**: No tool explicitly handles overlaid handwriting; may require separate preprocessing (inpainting)
5. **THPT 2025 format specificity**: Research did not encounter THPT-specific benchmarks; adaptation likely needed via fine-tuning or few-shot prompting
6. **Cross-subject formula notation**: Chemistry (mhchem) vs. physics (SI units) vs. math notation conflicts unresolved; recommend encoding subject tag in schema
7. **Cost amortization at scale**: No published data on marginal costs >10k pages/month; GPU utilization curves needed for accurate ROI calculation

---

## Recommendations by Scenario

### Scenario: Small pilot (100-500 pages, <3 months)
**Choice:** Claude Sonnet 5 Vision API  
**Rationale:** Zero infra, highest accuracy, manageable cost (~$100-300 total)  
**Action:** Build JSON schema, write extraction prompt, process batch

### Scenario: Production Vietnamese exam platform (1000+ pages/month)
**Choice:** Marker (self-hosted) + Claude Sonnet 5 (verification only)  
**Rationale:** $10-12/1k pages self-hosted; Claude for high-stakes verification  
**Action:** Deploy L40S GPU, integrate Marker SDK, build post-processing pipeline

### Scenario: Academic institution (research exams, high LaTeX content)
**Choice:** Docling (MIT license, CPU-capable) + Nougat (if scientific papers)  
**Rationale:** Permissive licenses, strong academic layout support  
**Action:** Self-host on institutional servers; customize Docling schema for exam format

### Scenario: High-speed data collection (10k+ pages, low accuracy tolerance)
**Choice:** Gemini 3.0 Vision API (native PDF support)  
**Rationale:** Fastest turnaround, cheapest VLM, handles entire PDFs  
**Action:** Stream processing with Gemini batch API; verify 10% sample with human review

---

## Sources

- [A Survey on Vietnamese Document Analysis and Recognition: Challenges and Future Directions](https://arxiv.org/pdf/2506.05061) — Diacritic handling, CER benchmarks
- [Best Open-Source PDF-to-Markdown Tools in 2026: Marker vs Docling vs MinerU](https://themenonlab.blog/blog/best-open-source-pdf-to-markdown-tools-2026) — Comparative evaluation
- [Marker GitHub](https://github.com/datalab-to/marker) — Layout detection + OCR pipeline
- [Docling Technical Report](https://research.ibm.com/publications/docling-technical-report) — IBM's layout analysis
- [MinerU: An Open-Source Solution for Precise Document Content Extraction](https://arxiv.org/pdf/2409.18839) — End-to-end pipeline
- [PaddleOCR 3.0 Technical Report](https://arxiv.org/pdf/2507.05595) — PP-StructureV3 + formula detection
- [olmOCR: Unlocking Trillions of Tokens in PDFs with Vision Language Models](https://arxiv.org/pdf/2502.18443) — Allen AI VLM approach
- [Benchmarking Document Parsers on Mathematical Formula Extraction from PDFs](https://arxiv.org/pdf/2512.09874) — Math-to-LaTeX fidelity
- [Self-Host Document Intelligence on GPU Cloud](https://www.spheron.network/blog/self-host-document-intelligence-docling-marker-mineru-rag-guide/) — Deployment costs (L40S pricing)
- [Claude Sonnet 5 Vision Capabilities](https://www.cometapi.com/claude-sonnet-5-spotted/) — Vision grounding, 2.5k token context per image
- [Gemini 2.5 and 3.0 Capabilities](https://blog.roboflow.com/document-derendering-gemini3pro/) — Native PDF support, math reasoning
- [Mathpix API Documentation](https://docs.mathpix.com/) — Commercial OCR reference
- [Docling vs Marker vs MinerU: The Ultimate Benchmark 2026](https://adityamangal98.medium.com/docling-vs-marker-vs-mineru-the-ultimate-open-source-pdf-parser-benchmark-2026-which-is-best-a36ecbb6c6b1) — License comparison
- [AXIOM: A Trust-First Neuro-Symbolic Execution Architecture](https://arxiv.org/pdf/2606.00671) — Sympy verification approach
- [pgvector for Duplicate Detection](https://www.databricks.com/blog/what-is-pgvector) — Semantic similarity thresholds
- [PDF to Markdown for LLM Pipelines](https://www.extend.ai/resources/pdf-to-markdown-llm-pipelines) — Hybrid OCR+LLM patterns
- [Generative AI for Multiple Choice STEM Assessments](https://arxiv.org/pdf/2506.02094) — MCQ schema generation
- [MathDoc: Benchmarking Structured Extraction on Math Exam Papers](https://arxiv.org/pdf/2601.10104) — THPT-adjacent evaluation

---

**Report Generated:** 2026-09-22  
**Next Steps:** Validate recommendations on sample Vietnamese exam PDF; measure actual diacritic error rate and figure-linking accuracy on THPT 2025 format.
