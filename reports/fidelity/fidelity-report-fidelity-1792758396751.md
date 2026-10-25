# Automatic Conversion Fidelity Report

**Report ID:** `fidelity-1792758396751`  
**Timestamp:** 2026-10-23T12:26:36.751Z  
**Target Format:** `PPTX`  
**Overall Status:** **⚠️ PASSED (LOSSY ALLOWED)**  
**Overall Fidelity Score:** **92.50%** (Threshold: $\ge 99.9%$)

---

## 1. Per-Element-Class Score Card

| Element Class | Score | Threshold | Status | Key Metric |
| :--- | :---: | :---: | :---: | :--- |
| **Text Content** | **70.0%** | $\ge 99.9%$ | ❌ FAIL | Missing Chars: 5, Extra: 13 |
| **Typography & Fonts** | **100.0%** | $\ge 92%$ | ✅ PASS | Unexpected Fonts: 0 |
| **Colors & Highlights** | **100.0%** | $\ge 95.0%$ | ✅ PASS | Red Chars: 22 vs 22 |
| **Geometry & Layout** | **100.0%** | $\ge 90.0%$ | ✅ PASS | Max Region Diff: 0% |
| **Visual Parity** | **100.0%** | $\ge 90.0%$ | ✅ PASS | SSIM: 1 (Threshold: 0.9) |
| **Package Validity** | **100.0%** | $100.0%$ | ✅ PASS | Dual Readers: Both Clean |

---

## 2. Style & Attribute Exact Count Comparison

| Style Attribute | Source Chars | Output Chars | Variance | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Bold Text** | 12 | 12 | 0% | ✅ MATCH |
| **Italic Text** | 15 | 15 | 0% | ✅ MATCH |
| **Red Text (#E11D48)** | 22 | 22 | 0% | ✅ MATCH |
| **Highlighting** | 19 | 19 | 0% | ✅ MATCH |
| **Subscripts** | 13 | 13 | 0% | ✅ MATCH |

---

## 3. Visual Layer & Regional Uniformity (3x3 Grid)

- **Structural Similarity Index (SSIM):** `1`
- **Color Histogram Intersection:** `100.00%`
- **Diff Image Artifact:** `D:\My Projects\Filee\reports\visual-diff\test_lossy_pass_diff.bmp`

| Region (Row x Col) | Diff % | Threshold | Status |
| :--- | :---: | :---: | :---: |
| **Top-Left** | 0% | $\le 5%$ | ✅ PASS |
| **Top-Center** | 0% | $\le 5%$ | ✅ PASS |
| **Top-Right** | 0% | $\le 5%$ | ✅ PASS |
| **Mid-Left** | 0% | $\le 5%$ | ✅ PASS |
| **Mid-Center** | 0% | $\le 5%$ | ✅ PASS |
| **Mid-Right** | 0% | $\le 5%$ | ✅ PASS |
| **Bot-Left** | 0% | $\le 5%$ | ✅ PASS |
| **Bot-Center** | 0% | $\le 5%$ | ✅ PASS |
| **Bot-Right** | 0% | $\le 5%$ | ✅ PASS |

---

## 4. Ledger of Approximations, Substitutions & Losses

### A. Approximations (2)
- **Subscript Baseline Offset**: 13 subscript characters preserved with negative font baseline offset.
- **Text Highlight Shading**: 19 highlighted characters preserved with high-contrast background shading.

### B. Font & Style Substitutions (0)
*None (exact native fonts)*

### C. Unhandled Losses (0)
*None (zero unhandled losses detected)*
