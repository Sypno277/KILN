# Automatic Conversion Fidelity Report

**Report ID:** `fidelity-1792763932203`  
**Timestamp:** 2026-10-23T13:58:52.203Z  
**Target Format:** `PPTX`  
**Overall Status:** **❌ FAILED**  
**Overall Fidelity Score:** **62.95%** (Threshold: $\ge 99.9%$)

---

## 1. Per-Element-Class Score Card

| Element Class | Score | Threshold | Status | Key Metric |
| :--- | :---: | :---: | :---: | :--- |
| **Text Content** | **37.8%** | $\ge 99.9%$ | ❌ FAIL | Missing Chars: 20, Extra: 15 |
| **Typography & Fonts** | **56.3%** | $\ge 90%$ | ❌ FAIL | Unexpected Fonts: 0 |
| **Colors & Highlights** | **75.0%** | $\ge 95.0%$ | ❌ FAIL | Red Chars: 22 vs 0 |
| **Geometry & Layout** | **62.7%** | $\ge 90.0%$ | ❌ FAIL | Max Region Diff: 50% |
| **Visual Parity** | **62.7%** | $\ge 90.0%$ | ❌ FAIL | SSIM: 0.6576 (Threshold: 0.9) |
| **Package Validity** | **100.0%** | $100.0%$ | ✅ PASS | Dual Readers: Both Clean |

---

## 2. Style & Attribute Exact Count Comparison

| Style Attribute | Source Chars | Output Chars | Variance | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Bold Text** | 12 | 0 | 100% | ⚠️ MISMATCH |
| **Italic Text** | 15 | 0 | 100% | ⚠️ MISMATCH |
| **Red Text (#E11D48)** | 22 | 0 | 100% | ⚠️ MISMATCH |
| **Highlighting** | 19 | 0 | 100% | ⚠️ MISMATCH |
| **Subscripts** | 13 | 0 | 100% | ⚠️ MISMATCH |

---

## 3. Visual Layer & Regional Uniformity (3x3 Grid)

- **Structural Similarity Index (SSIM):** `0.6576`
- **Color Histogram Intersection:** `94.44%`
- **Diff Image Artifact:** `D:\My Projects\Filee\reports\visual-diff\test_strict_fail_diff.bmp`

| Region (Row x Col) | Diff % | Threshold | Status |
| :--- | :---: | :---: | :---: |
| **Top-Left** | 0% | $\le 5%$ | ✅ PASS |
| **Top-Center** | 50% | $\le 5%$ | ❌ FAIL |
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
