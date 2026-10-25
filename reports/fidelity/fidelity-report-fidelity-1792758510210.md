# Automatic Conversion Fidelity Report

**Report ID:** `fidelity-1792758510210`  
**Timestamp:** 2026-10-23T12:28:30.207Z  
**Target Format:** `PPTX`  
**Overall Status:** **❌ FAILED**  
**Overall Fidelity Score:** **98.42%** (Threshold: $\ge 95%$)

---

## 1. Per-Element-Class Score Card

| Element Class | Score | Threshold | Status | Key Metric |
| :--- | :---: | :---: | :---: | :--- |
| **Text Content** | **93.7%** | $\ge 98%$ | ❌ FAIL | Missing Chars: 0, Extra: 3 |
| **Typography & Fonts** | **100.0%** | $\ge 92%$ | ✅ PASS | Unexpected Fonts: 0 |
| **Colors & Highlights** | **100.0%** | $\ge 95.0%$ | ✅ PASS | Red Chars: 58 vs 58 |
| **Geometry & Layout** | **100.0%** | $\ge 90.0%$ | ✅ PASS | Max Region Diff: 0% |
| **Visual Parity** | **100.0%** | $\ge 90.0%$ | ✅ PASS | SSIM: 1 (Threshold: 0.9) |
| **Package Validity** | **100.0%** | $100.0%$ | ✅ PASS | Dual Readers: Both Clean |

---

## 2. Style & Attribute Exact Count Comparison

| Style Attribute | Source Chars | Output Chars | Variance | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Bold Text** | 173 | 173 | 0% | ✅ MATCH |
| **Italic Text** | 0 | 0 | 0% | ✅ MATCH |
| **Red Text (#E11D48)** | 58 | 58 | 0% | ✅ MATCH |
| **Highlighting** | 58 | 58 | 0% | ✅ MATCH |
| **Subscripts** | 2 | 2 | 0% | ✅ MATCH |

---

## 3. Visual Layer & Regional Uniformity (3x3 Grid)

- **Structural Similarity Index (SSIM):** `1`
- **Color Histogram Intersection:** `100.00%`
- **Diff Image Artifact:** `N/A`

| Region (Row x Col) | Diff % | Threshold | Status |
| :--- | :---: | :---: | :---: |


---

## 4. Ledger of Approximations, Substitutions & Losses

### A. Approximations (2)
- **Subscript Baseline Offset**: 2 subscript characters preserved with negative font baseline offset.
- **Text Highlight Shading**: 58 highlighted characters preserved with high-contrast background shading.

### B. Font & Style Substitutions (0)
*None (exact native fonts)*

### C. Unhandled Losses (0)
*None (zero unhandled losses detected)*
