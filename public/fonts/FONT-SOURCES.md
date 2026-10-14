# Snowlog typography

- Spinnaker by Sorkin Type Co: original font from the Google Fonts repository, distributed unchanged. License: Spinnaker-OFL.txt.
- Snowlog Rounded: a character subset of Gen Jyuu Gothic (源柔ゴシック / 源柔黑體), derived from the public WOFF2 files used by ski-o.app. Glyph authors and copyright notices remain in the font metadata. The original family is by 自家製フォント工房, based on Adobe Source Han Sans and M+ OUTLINE FONTS. License: GenJyuu-OFL.txt; upstream readme: GenJyuu-README.txt.

The subset is renamed Snowlog Rounded to distinguish this modified font from the upstream font. It covers the application interface, catalog and basic Latin; other characters fall back to the user's Traditional Chinese system fonts. No personal user text was read or used to generate these fonts.

The homepage headline uses the same Songti/PMingLiU serif fallback stack as SKI-O; appearance depends on fonts installed on the device. The Snowlog brand retains its existing Barlow lettering.

Reference CSS inspected on 2026-10-14. Files are hosted by Snowlog; visitors do not need to request fonts from SKI-O or a third-party font CDN.

## Snowlog Numerals Light

Derived from Archivo (Omnibus-Type), SIL OFL 1.1. Source: https://github.com/google/fonts/tree/main/ofl/archivo and https://github.com/Omnibus-Type/Archivo. Instantiated at weight 300, width 100, subset to digits 0–9 and renamed Snowlog Numerals. Original copyright retained; see Archivo-OFL.txt. Used as a digit-only first face so all counters, dates and other numbers keep a light stroke while Chinese and English text retain their own font. No user text was used.
