# CABC HRE Capture — browser extension

One-click capture for the HRE Monitor. On any post, it screenshots the visible tab using
**your own logged-in browser session** (so it works behind login walls and bot detection
that a server can't get past), creates a draft entry, and opens it prefilled.

## Install (Chrome / Edge, developer mode)

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this `extension/` folder.
3. Open the extension's **options** (Details → Extension options) and set:
   - **App URL** — where the HRE Monitor is hosted (e.g. `https://hre.cabc.org.za`).
   - **Token** — generate it in the HRE Monitor under *Settings → Capture extension token*.
4. Pin the extension. On any post, click it. A green ✓ badge means the draft was created
   and opened in a new tab; a red ! badge shows a notification with the reason.

## Notes

- The token logs entries **as you** — don't share it. Revoke/regenerate any time in Settings.
- Works on X, TikTok, Facebook, YouTube and most pages. On restricted browser pages
  (e.g. `chrome://`) it falls back to the tab URL without a screenshot.
- No icons are bundled (Chrome shows a default). To brand it, add 16/48/128px PNGs and an
  `"icons"` block + `"action.default_icon"` in `manifest.json`.

## Distribution

For a handful of reviewers, "Load unpacked" is simplest. To distribute more widely, zip
the folder and publish via the Chrome Web Store (private/unlisted) or your org's managed
extension policy.
