# Fiscus Board for iPhone

A native iPhone app (React Native with Expo). It's built on GitHub's Macs and uploaded to TestFlight by `.github/workflows/ios-testflight.yml` and `fastlane/Fastfile`, the same way as Roster Board. No Mac and no Expo account are needed.

## One-off setup

1. **GitHub secrets.** In this repo, go to Settings → Secrets and variables → Actions and add the same four secrets Roster Board uses:
   - `ASC_KEY_ID`: the App Store Connect API key ID
   - `ASC_ISSUER_ID`: the issuer ID
   - `ASC_KEY_P8`: the whole contents of the `.p8` file, including the BEGIN/END lines
   - `MATCH_PASSWORD`: any long password. It encrypts the signing certificate stored on this repo's `fastlane-match` branch. Keep a copy.
2. **Actions → "iOS build to TestFlight" → Run workflow → setup.** This registers the app ID `com.fiscusboard.app` and creates the signing certificate.
3. **App Store Connect → Apps → + → New App.** Platform iOS, bundle ID `com.fiscusboard.app`, name "Fiscus Board", SKU `fiscusboard`.
4. **Run the workflow again with beta.** The build appears in TestFlight once Apple has processed it (usually 10–30 minutes).

## Every update after that

Push your changes, then run the workflow with **beta**. Each run uploads the next build number automatically.

The app is iPhone-only and declares no custom encryption, so TestFlight doesn't ask the export-compliance question.

## Project layout

| File | What it is |
| --- | --- |
| `App.tsx` | Header, tabs, and all the save/move/delete logic |
| `src/BudgetScreen.tsx` | Total card, sections, subheadings, totals, your share |
| `src/InsightsScreen.tsx` | Where your pay goes, biggest expenses, over time |
| `src/Sheets.tsx` | The edit sheets for items, subheadings, sections and settings |
| `src/budget.ts` | Data types, per-period maths, money formatting |
| `src/theme.ts` | Light and dark colours, section colours and accents |
| `src/storage.ts` | Saves the budget on the phone |
| `assets/` | App icon (1024×1024) and splash image |
| `fastlane/` | Signing, build number and TestFlight upload |

The budget is stored on the phone and stays through every TestFlight update. Deleting the app deletes it.
