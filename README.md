# Kacheen website

Website: https://kacheen.lt/ · Repository: https://github.com/mbkacheen/mbkacheen.github.io

Static Lithuanian portfolio for kacheen.lt. HTML, CSS and plain JavaScript: no build, package installation, paid builder or API key required.

## Files

- `index.html` — portfolio, services, about and enquiries. No amounts displayed on the homepage.
- `kainos.html` — photography from €100/hour, simple voice recording from €50, video quoted per project.
- `privatumas.html` — explanation of email enquiries and external media players.
- `styles.css` — responsive styling; violet `#7978DA`, red `#FF4436`, charcoal `#332F35`. Lighter violet is used for readable text on dark backgrounds.
- `site.js` — portfolio filters, click-to-load players, service selection and email preparation.
- `assets/` — finished logo artwork, project covers, sharing image and locally hosted Albert Sans with its license.
- `CNAME` — intended custom domain, `kacheen.lt`.
- `.nojekyll` — tells GitHub Pages to serve these files directly.

## Preview

Open `index.html` directly, or serve this folder:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Visit http://127.0.0.1:4173/ . Online video/music playback needs an internet connection. Local files work for the main content; a web server is preferable for testing embedded players and clipboard support.

## Enquiries

The destination is **mbkacheen@gmail.com**. The form creates a `mailto:` link and opens the visitor's email app. It does not send email itself, create a server-side submission, or store messages. The visitor must review and send the prepared message. A copy option appears in case their email app does not open; the direct email and Instagram links are also available.

For an in-browser submission flow later, connect a form provider and update the form text and privacy page accordingly. Never put Gmail credentials or private API keys in these files.

## Publish free on GitHub Pages

1. Create a public GitHub repository for the website. GitHub Free supports Pages from public repositories.
2. Put the **contents of this folder** at the repository root so `index.html` is at the top level. Include `assets/`, `.nojekyll` and the other pages. Do not upload the surrounding workspace or brand-generation working files.
3. For an initial `github.io` preview, leave out `CNAME` until you are ready to connect kacheen.lt. For a project repository, the initial URL will normally be `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`. Relative asset and page links support this layout. The custom 404 page's home link is configured for the final domain root.
4. Go to **Settings → Pages → Build and deployment → Deploy from a branch**. Choose **main** and **/(root)**, then Save.
5. Open the URL GitHub supplies after deployment completes.

This repository is published through GitHub Pages from `main` at `/(root)`. Commits to `main` automatically publish website updates. The configured custom domain is `kacheen.lt`.

## Connect kacheen.lt from Hostinger

Keep the domain registered at Hostinger. First verify your domain in your GitHub account's Pages settings using the TXT record GitHub supplies. Then set **kacheen.lt** as the custom domain under your repository's **Settings → Pages**, before changing the domain's website DNS records. Keep/add the supplied `CNAME` file when publishing from a branch.

At the domain's active DNS provider, configure the root domain using the GitHub Pages A records:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | YOUR-USERNAME.github.io |

Replace `YOUR-USERNAME` with the actual GitHub account name (`mbkacheen`). Do not include the repository name in the `www` record. The current Hostinger setup uses its existing `www` ALIAS record pointing to `mbkacheen.github.io` and the four apex A records above. The domain is verified with GitHub using its TXT challenge. Preserve unrelated email MX/TXT/DKIM records when updating website DNS.

After GitHub verifies the DNS and provisions the certificate, enable **Enforce HTTPS**. DNS/certificate changes may take time. If you publish to a different domain, also update `CNAME`, `robots.txt`, `sitemap.xml` and the homepage sharing-image URL.

Official setup references, checked 17 October 2026:

- https://docs.github.com/en/pages/quickstart
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## Content editing

Edit the Lithuanian text directly in the HTML files. Prices are in `kainos.html`; the enquiry email is in the HTML links and the `contactEmail` constant in `site.js`. Portfolio embeds use the `data-video` / `data-spotify` attributes and direct fallback links.

The four YouTube links and Spotify track were selected by the business owner. Cover art was fetched from their official YouTube/Spotify metadata and saved locally. The first three videos credit YESLI as the publishing channel; the fourth is from Kacheen. Exact personal production roles have not been specified, so the site does not invent role credits. The farm video's displayed title is a Lithuanian summary of its original Russian title.

There are no supplied photography samples yet. Photography is listed as a service without a fabricated photo portfolio. Review the draft first-person introduction and descriptions as part of normal editorial review before launch.

## Privacy and media

Fonts and cover images load locally. No analytics, advertising scripts or form service is installed. YouTube's privacy-enhanced player or Spotify's player is loaded only after the visitor chooses a project. Direct platform links remain available if JavaScript is disabled or an embed is blocked. The privacy page describes the present implementation and should be kept consistent with future hosting or form changes.
