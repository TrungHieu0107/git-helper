# ADR-0010: Choice of Statistical Encoding Detection Library

## Context
GitKit needs to automatically detect file encodings when BOM (Byte Order Mark) is missing. This is critical for supporting legacy or international codebases (e.g., Japanese Shift_JIS, Chinese GBK) without forcing the user to manually select the encoding every time.

## Decision
We will use [chardetng](https://github.com/hsivonen/chardetng) (v0.1) as the statistical detection engine.

## Rationale
1.  **Mozilla Integration**: `chardetng` is the newer, faster encoding detector used by Mozilla in Firefox. It is specifically designed to work well with `encoding_rs`, which we already use for decoding.
2.  **Accuracy**: It performs significantly better than the older `chardet` (which is a port of Python's chardet) on shorter samples and handles CJK (Chinese, Japanese, Korean) encodings more reliably.
3.  **Performance**: It is written in Rust and is extremely fast, suitable for on-the-fly detection during diff generation.
4.  **Pairing with `encoding_rs`**: Since `chardetng` is from the same ecosystem as `encoding_rs`, their labels and handling of edge cases are consistent.

## Alternatives Considered
-   **`chardet` (Rust port)**: Older, slower, and often requires larger samples for reliable detection. Less accurate for modern web/source code contexts.
-   **`icu`**: Heavyweight and has complex dependency requirements (dynamic linking or large data files). Overkill for GitKit's current needs.

## Consequences
-   New dependency on `chardetng`.
-   Slightly increased binary size (negligible).
-   Improved UX as most files will "just work" when opened.
-   Requires a binary guard before detection to avoid false positives on binary files.
