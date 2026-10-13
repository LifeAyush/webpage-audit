# English Wikipedia audit

Logged-out review on 13 October 2026 in headless Chromium. The mobile pass changes the layout viewport to 390×844. It does not change the browser user agent.

## Executive summary

The main page says what Wikipedia is and offers search, a featured article, and news without an account. The article opened from the welcome text, [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia), is where the verified defects concentrate: images without alternative text, contrast failures, links with no accessible name, and a document whose decoded body is about 2.3 MB. The main page itself has no meta description and two `h1` headings. Neither page recorded console errors or failed requests.

## Website overview and pages inspected

English Wikipedia is a public encyclopedia. On the main page the primary actions are search, reading the featured article, and creating an account or logging in. Donate and Log in are links. They were not opened.

| Page | URL | Viewports |
| --- | --- | --- |
| Main page | https://en.wikipedia.org/wiki/Main_Page | 1440×900 and 390×844 |
| Wikipedia article | https://en.wikipedia.org/wiki/Wikipedia | 1440×900, opened by clicking the "Wikipedia" link in "Welcome to Wikipedia" |

The main-page accessibility tree was depth-limited because it exceeded 40,000 characters. Screenshots: [desktop home](samples/wikipedia-home-desktop.png), [mobile home](samples/wikipedia-home-mobile.png).

Not tested: search submission, account creation, login, editing, donations, and other articles.

## Overall assessment

**UI and UX.** At 1440×900 the main page shows the wordmark, a "Search Wikipedia" field, and the featured article beside "In the news". At 390×844 the header keeps the menu button and wordmark, and the featured article stacks under the welcome text. The search field that is visible in the desktop header is not in that mobile header.

**Performance.** One navigation each. Main page `domContentLoaded` 331 ms, `load` 431 ms, document transfer size 50,889 bytes. Article `domContentLoaded` 438 ms, `load` 556 ms, document transfer size 360,974 bytes, decoded body size 2,254,561 bytes. These are Navigation Timing values from this session, not field Core Web Vitals.

**Content and SEO.** Both pages have a title and a canonical URL. Meta description is missing on both. The main page headings include `h1` "Main Page" and `h1` "Welcome to Wikipedia". The article's first listed heading is `h2` "Contents", followed by `h1` "Wikipedia". Main-page images missing an `alt` attribute: 0. Article images missing an `alt` attribute: 14.

**Technical quality.** No console errors or warnings and no failed or HTTP 4xx/5xx requests on either page. axe reported 1 violation on the main page (4 incomplete) and 6 on the article (5 incomplete). Incomplete checks are not confirmed failures.

**Product and conversion.** A visitor can read without an account. The welcome text states that anyone can edit and links the article counts (271,829 active editors and 7,252,408 articles in English on this capture).

## Findings

### 1. Article images have no alternative text

- **URL:** https://en.wikipedia.org/wiki/Wikipedia
- **Component:** article images
- **Evidence:** Page info reports 14 images without an `alt` attribute, including the founders photo and the English Wikipedia homepage screenshot from 2001. axe `image-alt` (critical) matches several of those images, including `#mwhA` and `#mw9g`. The main page reported 0 images missing `alt`.
- **Reproduction:** Open the article. Count `img` elements with no `alt` attribute, or run an axe scan.
- **Expected:** Informative images have alternative text. Decorative images have an empty `alt`.
- **Actual:** 14 images omit the attribute, and axe flags the missing alternative text as critical.
- **Severity:** Critical
- **Confidence:** High
- **Fix:** Set `alt` from the file caption for informative images, and use `alt=""` only when the caption next to the image already conveys the same information.

### 2. Article text and controls fail contrast

- **URL:** https://en.wikipedia.org/wiki/Wikipedia
- **Component:** collapsed navbox toggles and a language-edition link
- **Evidence:** axe `color-contrast` (serious) on `.mw-collapsible-text` inside several navbox titles, and on `#Wikipedia_language_editions7359 > a[title="List of Wikipedias"]`.
- **Reproduction:** Open the article, scroll to a collapsed navigation box, and run an axe scan.
- **Expected:** Text meets the contrast ratio for its size.
- **Actual:** axe reports those toggles and the language-edition link below the threshold.
- **Severity:** High
- **Confidence:** High
- **Fix:** Darken the toggle and link colors against their backgrounds and re-run the color-contrast rule.

### 3. Some article links have no accessible name

- **URL:** https://en.wikipedia.org/wiki/Wikipedia
- **Component:** links `#mwgw`, `#mw9Q`, `#mwAdE`, `#mwAo4`, and `#mwAts`
- **Evidence:** axe `link-name` (serious) on those selectors. axe `link-in-text-block` (serious) also flags `#mwBgM`, where a link is distinguished by color alone.
- **Reproduction:** Open the article and run an axe scan.
- **Expected:** Every link has text or an accessible name, and links in a sentence are not indicated by color only.
- **Actual:** Five links have no discernible text, and one link relies on color.
- **Severity:** High
- **Confidence:** High
- **Fix:** Add visible text or `aria-label` from the destination. Underline the in-text link or give it a second visual cue.

### 4. Meta description is missing, and heading order is inconsistent

- **URL:** https://en.wikipedia.org/wiki/Main_Page and https://en.wikipedia.org/wiki/Wikipedia
- **Component:** document metadata and headings
- **Evidence:** Page info reports `Meta description: (missing)` on both URLs. Canonical is present on both. The main page lists two `h1` headings, "Main Page" and "Welcome to Wikipedia". The article lists `h2` "Contents" before `h1` "Wikipedia".
- **Reproduction:** Open each URL and read the meta description and heading list.
- **Expected:** One `h1`, headings in order, and a meta description for the main page and the article.
- **Actual:** The description element is absent, the main page has two `h1`s, and the article starts its heading list at `h2`.
- **Severity:** Medium
- **Confidence:** High
- **Fix:** Add a meta description. Keep a single `h1` for the page title and move "Contents" after it, or mark the duplicate main-page title so it is not a second `h1`.

### 5. Article HTML is very large, and list items are outside a list

- **URL:** https://en.wikipedia.org/wiki/Wikipedia
- **Component:** article document and portal boxes
- **Evidence:** Navigation Timing reports decoded body size 2,254,561 bytes and transfer size 360,974 bytes. axe `listitem` (serious) flags `.portalbox-entry:nth-child(1)` and `.portalbox-entry:nth-child(2)` as `li` elements outside a `ul` or `ol`. The main page also has a minor `aria-allowed-role` violation on `#vector-main-menu-dropdown-checkbox`, `#vector-page-tools-dropdown-checkbox`, and `#p-lang-btn-checkbox`.
- **Reproduction:** Open the article, read `performance.getEntriesByType("navigation")[0].decodedBodySize`, and run an axe scan.
- **Expected:** The article document is not a multi-megabyte HTML payload, and list items belong to a list. Menu checkboxes use an allowed role.
- **Actual:** The decoded article is about 2.3 MB, two portal entries are orphan list items, and the main-page menu checkboxes use a disallowed ARIA role.
- **Severity:** Medium
- **Confidence:** High
- **Fix:** Wrap portal entries in a list. Remove the disallowed role from those checkboxes or replace them with buttons. Split or lazy-load the lower navboxes so the initial HTML is smaller.

### 6. Mobile header hides the search field

- **URL:** https://en.wikipedia.org/wiki/Main_Page
- **Component:** site header at 390×844
- **Evidence:** The 1440×900 screenshot shows a "Search Wikipedia" field in the header. The 390×844 screenshot shows the menu button, wordmark, and an overflow menu, and does not show that field. The desktop accessibility snapshot does include `searchbox "Search Wikipedia"`.
- **Reproduction:** Set the viewport to 390×844 and look at the header. This review did not open the menu to confirm whether search is inside it.
- **Expected:** Search stays visible, or the menu button's name says that it contains search.
- **Actual:** The field visible on desktop is absent from the mobile header screenshot.
- **Severity:** Low
- **Confidence:** Medium
- **Fix:** Keep a search button in the 390px header if the field itself cannot fit.

## Top five issues

1. Missing alternative text on article images. Screen-reader users do not get the figures that carry the article.
2. Contrast failures on article navboxes and a language link. Those controls are hard to read.
3. Links with no accessible name. Several article links cannot be identified without surrounding context.
4. Missing meta descriptions and broken heading order. Search results and heading navigation both lose a clear page title.
5. A 2.3 MB decoded article plus invalid list markup. The page is heavy, and the portal markup is not a list.

**Quick wins.** Add `alt` text for the 14 article images. Add meta descriptions. Put the portal entries inside a `ul`. Remove the disallowed checkbox roles.

**Larger work.** Recolor navbox toggles to pass contrast, give unnamed links a name, and reduce the article's initial HTML.

## 1-week plan

1. Add alternative text for images on the Wikipedia article and confirm axe `image-alt` is clear.
2. Fix contrast on the flagged navbox toggles and the language-edition link.
3. Name the links flagged by `link-name`, and underline the link flagged by `link-in-text-block`.
4. Add meta descriptions and correct the `h1` / `h2` order on the main page and the article.
5. Fix the portal list markup and remeasure document transfer size after trimming below-the-fold navboxes.

## Limitations

Search was not submitted. Donate, Create account, and Log in were not opened. Only the main page and the Wikipedia article were tested. The main-page accessibility tree was depth-limited in this tool, so controls below the captured tree were not clicked. Mobile coverage is a 390×844 layout viewport, not a phone user agent. Performance numbers are one Navigation Timing sample each. axe Incomplete results were not treated as failures.
