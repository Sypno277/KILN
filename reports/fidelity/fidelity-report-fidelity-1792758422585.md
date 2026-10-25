# Automatic Conversion Fidelity Report

**Report ID:** `fidelity-1792758422585`  
**Timestamp:** 2026-10-23T12:27:02.582Z  
**Target Format:** `PPTX`  
**Overall Status:** **⚠️ PASSED (LOSSY ALLOWED)**  
**Overall Fidelity Score:** **74.87%** (Threshold: $\ge 95%$)

---

## 1. Per-Element-Class Score Card

| Element Class | Score | Threshold | Status | Key Metric |
| :--- | :---: | :---: | :---: | :--- |
| **Text Content** | **40.7%** | $\ge 98%$ | ❌ FAIL | Missing Chars: 10, Extra: 497 |
| **Typography & Fonts** | **56.3%** | $\ge 92%$ | ❌ FAIL | Unexpected Fonts: 0 |
| **Colors & Highlights** | **75.0%** | $\ge 95.0%$ | ❌ FAIL | Red Chars: 0 vs 58 |
| **Geometry & Layout** | **100.0%** | $\ge 90.0%$ | ✅ PASS | Max Region Diff: 0% |
| **Visual Parity** | **100.0%** | $\ge 90.0%$ | ✅ PASS | SSIM: 1 (Threshold: 0.9) |
| **Package Validity** | **100.0%** | $100.0%$ | ✅ PASS | Dual Readers: Both Clean |

---

## 2. Style & Attribute Exact Count Comparison

| Style Attribute | Source Chars | Output Chars | Variance | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Bold Text** | 0 | 173 | 100% | ⚠️ MISMATCH |
| **Italic Text** | 0 | 0 | 0% | ✅ MATCH |
| **Red Text (#E11D48)** | 0 | 58 | 100% | ⚠️ MISMATCH |
| **Highlighting** | 0 | 58 | 100% | ⚠️ MISMATCH |
| **Subscripts** | 0 | 2 | 100% | ⚠️ MISMATCH |

---

## 3. Visual Layer & Regional Uniformity (3x3 Grid)

- **Structural Similarity Index (SSIM):** `1`
- **Color Histogram Intersection:** `100.00%`
- **Diff Image Artifact:** `N/A`

| Region (Row x Col) | Diff % | Threshold | Status |
| :--- | :---: | :---: | :---: |


---

## 4. Ledger of Approximations, Substitutions & Losses

### A. Approximations (0)
*None (zero lossy approximations)*

### B. Font & Style Substitutions (0)
*None (exact native fonts)*

### C. Unhandled Losses (0)
*None (zero unhandled losses detected)*
