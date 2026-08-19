// Version switcher for the published docs on https://h2oai.github.io/h2ogpte/.
// Each release lives in its own v<version>/ folder next to a versions.json that is
// regenerated on every publish (see publish-mux-py-doc in the top-level Makefile).
// The list is fetched at page load, so pages built long ago still show new versions.
// If versions.json is missing (e.g. a local build), the switcher doesn't render.
// Loaded with defer (see html_js_files in conf.py), so the DOM is parsed when this runs.
(() => {
  "use strict";

  // Root of this doc build, derived from any _static asset on the page.
  // (Sphinx 7.2+ stopped exposing URL_ROOT / data-url_root to scripts.)
  const asset = document.querySelector(
    'link[href*="_static/"], script[src*="_static/"]'
  );
  const sidebarSearch = document.querySelector(".wy-side-nav-search");
  if (!asset || !sidebarSearch) return;
  const assetUrl = new URL(
    asset.getAttribute("href") || asset.getAttribute("src"),
    window.location.href
  );
  const docsRoot = new URL(
    assetUrl.pathname.replace(/_static\/.*$/, ""),
    window.location.origin
  );

  // If this build is served from a v<version>/ folder, the site root is its parent.
  const vm = window.location.pathname.match(/^(.*?\/)(v\d[^/]*)\//);
  const siteRoot = vm ? new URL(vm[1], window.location.origin) : docsRoot;
  const currentVersion = vm ? vm[2] : null;

  fetch(new URL("versions.json", siteRoot), { cache: "no-cache" })
    .then((resp) => {
      if (!resp.ok) throw new Error("no versions.json");
      return resp.json();
    })
    .catch(() => null) // unversioned or local build - no switcher
    .then((versions) => {
      if (!Array.isArray(versions) || versions.length === 0) return;

      // A folder can predate versions.json (e.g. browsing an old version before
      // its snapshot landed) - list it rather than mislabelling option 0 as selected.
      const list =
        currentVersion && !versions.includes(currentVersion)
          ? [...versions, currentVersion]
          : versions;

      const select = document.createElement("select");
      select.id = "version-switcher-select";
      list.forEach((v, i) => {
        const option = document.createElement("option");
        option.value = v;
        option.textContent = i === 0 ? `${v} (latest)` : v;
        // The site root serves a copy of the latest version.
        option.selected = v === currentVersion || (currentVersion === null && i === 0);
        select.appendChild(option);
      });

      select.addEventListener("change", () => {
        select.disabled = true; // busy until the probe below navigates
        const target = new URL(`${select.value}/`, siteRoot);
        // Keep the reader on the same page when it exists in the other version.
        const pagePath = window.location.pathname.slice(docsRoot.pathname.length);
        const samePage = new URL(
          pagePath + window.location.search + window.location.hash,
          target
        );
        fetch(samePage, { method: "HEAD" })
          .then((resp) => {
            window.location.href = resp.ok ? samePage : target;
          })
          .catch(() => {
            window.location.href = target;
          });
      });

      // Restore the control after a back/forward-cache restore: the browser
      // preserves DOM state, so the select would otherwise come back disabled
      // and showing the version the reader navigated away to.
      const currentValue = currentVersion || versions[0];
      window.addEventListener("pageshow", () => {
        select.disabled = false;
        select.value = currentValue;
      });

      const label = document.createElement("label");
      label.htmlFor = "version-switcher-select";
      label.textContent = "Version: ";

      const container = document.createElement("div");
      container.className = "version-switcher";
      container.appendChild(label);
      container.appendChild(select);
      // The dropdown replaces the theme's static version indicator.
      const themeVersion = sidebarSearch.querySelector(".version");
      if (themeVersion) themeVersion.remove();
      sidebarSearch.appendChild(container);
    });
})();
