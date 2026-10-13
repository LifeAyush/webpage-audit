# MDN Web Docs audit

Logged-out review on 13 October 2026 in headless Chromium. The mobile pass changes the layout viewport to 390×844. It does not change the browser user agent.

## Executive summary

MDN's homepage states its purpose immediately: "Resources for Developers, by Developers," with a direct path into CSS, HTML, and JavaScript. The CSS reference page opened from that homepage loads, has a canonical URL and meta description, and produced no console errors or failed requests. The defects that showed up are structural. The homepage has no `main` landmark, featured-article cards clip their text at both viewport sizes, and the CSS page has nested interactive controls in the sidebar plus duplicate navigation landmarks.

## Website overview and pages inspected

MDN Web Docs is a reference for web developers. The primary action on the homepage is Search, alongside topic links for HTML, CSS, and JavaScript.

| Page | URL | Viewports |
| --- | --- | --- |
| Homepage | https://developer.mozilla.org/en-US/ | 1440×900 and 390×844 |
| CSS reference | https://developer.mozilla.org/en-US/docs/Web/CSS | 1440×900, opened by clicking the homepage "CSS" link |

Screenshots: [desktop home](samples/mdn-home-desktop.png), [mobile home](samples/mdn-home-mobile.png).

Not tested: search after the Search button is activated, login, blog posts, and any page other than the two above.

## Overall assessment

**UI and UX.** The homepage hierarchy is clear at both sizes. At 390×844 the topic navigation collapses into a menu and the hero headline wraps without overlapping. Featured-article cards clip the end of each summary.

**Performance.** One navigation each. Homepage `domContentLoaded` 312 ms, `load` 350 ms, document transfer size 14,410 bytes. CSS page `domContentLoaded` 438 ms, `load` 438 ms, document transfer size 31,128 bytes. These are Navigation Timing values from this session, not field Core Web Vitals.

**Content and SEO.** Both pages have a title, meta description, and canonical URL. Homepage h1 is "Resources for Developers, by Developers". CSS h1 is "CSS: Cascading Style Sheets". Homepage images missing an `alt` attribute: 0. CSS page images missing an `alt` attribute: 0.

**Technical quality.** No console errors or warnings and no failed or HTTP 4xx/5xx requests on either page. axe reported 3 violations on the homepage (1 incomplete) and 2 on the CSS page (1 incomplete). Incomplete checks are not confirmed failures.

**Product and conversion.** A developer can see what the site is and follow CSS, HTML, or JavaScript without an account. Log in is a link to the Firefox account flow and was not submitted.

## Findings

### 1. Homepage has no main landmark

- **URL:** https://developer.mozilla.org/en-US/
- **Component:** document landmarks
- **Evidence:** axe `landmark-one-main` (moderate) on `html`, plus `region` (moderate) on `.homepage-header__copy`, `.homepage:nth-child(2)`, and `.homepage--dark.homepage:nth-child(3)`. The CSS page snapshot does expose a `main` landmark, so this is specific to the homepage.
- **Reproduction:** Open the homepage and run an axe scan.
- **Expected:** Page content sits inside one `main` landmark.
- **Actual:** axe reports that the document does not have one main landmark, and three homepage regions are outside landmarks.
- **Severity:** High
- **Confidence:** High
- **Fix:** Wrap the hero and featured sections in `<main>` and give each remaining region a landmark role and name.

### 2. Featured article text is clipped

- **URL:** https://developer.mozilla.org/en-US/
- **Component:** featured article cards
- **Evidence:** Desktop and mobile screenshots show the "Celebrating 20 years of MDN" summary ending in "and yes, th…" and the Navigation API summary ending mid-word. The same clipping appears at 390×844.
- **Reproduction:** Open the homepage at 1440×900 and at 390×844. Read the first featured card.
- **Expected:** The card shows a complete summary or an explicit truncation that still reads as a sentence.
- **Actual:** The summary is cut inside a word.
- **Severity:** Medium
- **Confidence:** High
- **Fix:** Give the card a fixed line count that breaks on words, or link the full sentence instead of clipping the paragraph.

### 3. Nested interactive controls in the CSS sidebar

- **URL:** https://developer.mozilla.org/en-US/docs/Web/CSS
- **Component:** left sidebar `details` / `summary`
- **Evidence:** axe `nested-interactive` (serious) on `.left-sidebar__content > ol > li:nth-child(48) > details > summary` and on `li:nth-child(52)` through `li:nth-child(55)`.
- **Reproduction:** Open the CSS reference and run an axe scan. Inspect those sidebar summaries.
- **Expected:** A summary is not inside another interactive control.
- **Actual:** axe reports interactive controls nested inside those summaries.
- **Severity:** High
- **Confidence:** High
- **Fix:** Move the inner link or button out of the `summary`, or make the disclosure a single control.

### 4. Duplicate navigation landmarks on the CSS page

- **URL:** https://developer.mozilla.org/en-US/docs/Web/CSS
- **Component:** `.navigation` and `.layout__right-sidebar`
- **Evidence:** axe `landmark-unique` (moderate) on both selectors. The same rule also fires on `.navigation` on the homepage.
- **Reproduction:** Open the CSS page and run an axe scan.
- **Expected:** Each landmark has a unique role and accessible name.
- **Actual:** More than one navigation landmark shares a role without a distinguishing name.
- **Severity:** Medium
- **Confidence:** High
- **Fix:** Name the header, sidebar, and in-page navigations with `aria-label` values such as "Site", "CSS reference", and "On this page".

### 5. Homepage search is a button in the accessibility tree

- **URL:** https://developer.mozilla.org/en-US/
- **Component:** hero Search control and header "Search the site" button
- **Evidence:** The homepage accessibility snapshot lists `button "Search"` and `button "Search the site"`. It does not list a search box. The screenshots show a Search button in the hero and a search icon in the header.
- **Reproduction:** Open the homepage and read the accessibility snapshot. This review did not activate the button.
- **Expected:** The primary search task has a visible text field, or the button's name says that it opens search.
- **Actual:** The control's accessible name is only "Search".
- **Severity:** Low
- **Confidence:** High for the snapshot and screenshots. The dialog that may open was not tested.
- **Fix:** Use a search field on the homepage, or name the button "Open search".

## Top five issues

1. Nested interactive controls on the CSS page. Keyboard and screen-reader users can land on a control that contains another control.
2. Homepage landmark structure. The main content is not in a `main` landmark.
3. Clipped featured-article summaries. The first content below the hero is unreadable at the end of each card.
4. Duplicate navigation landmarks on the CSS page. Several navigations are not distinguishable by name.
5. Search announced only as "Search". The homepage does not expose a search field in the accessibility tree.

**Quick wins.** Name the navigation landmarks. Change the card truncation so it breaks on a word. Rename the Search button if it only opens a dialog.

**Larger work.** Rebuild the CSS sidebar disclosures so summaries are not nested interactive controls, and give the homepage a single `main` region.

## 1-week plan

1. Add `<main>` on the homepage and label each navigation landmark.
2. Fix featured-card line clamping.
3. Remove nested controls from CSS sidebar summaries and re-run axe on both pages.
4. Decide whether homepage search is a field or a button, and match the accessible name to that behavior.
5. Re-check console, network, and the two screenshots after the layout changes.

## Limitations

Login, account creation, and the search dialog were not used. Only the homepage and the CSS reference were opened. Mobile coverage is a 390×844 layout viewport, not a phone user agent. Performance numbers are one Navigation Timing sample each. axe Incomplete results were not treated as failures.
