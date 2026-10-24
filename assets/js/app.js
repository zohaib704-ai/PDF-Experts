/* Shared site behaviour.
   Header and footer are now static HTML in every page.
   This script only adds interactivity: theme toggle, mobile menu,
   cookie banner, homepage tool grid, related tools, contact form,
   scroll reveal, and a dynamic footer year. */
(function () {
  "use strict";

  var root = document.body.getAttribute("data-root") || ".";
  var page = document.body.getAttribute("data-page") || "";
  var tools = Array.isArray(window.PDF_TOOLS) ? window.PDF_TOOLS : [];

  function $(selector, scope) { return (scope || document).querySelector(selector); }
  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function link(path) {
    return root === "." ? path : root + "/" + path;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function iconSvg(name) {
    var icons = {
      organize:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="6" rx="2"/><rect x="4" y="11" width="16" height="6" rx="2"/><path d="M8 19h8"/></svg>',
      optimize:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14a8 8 0 1 1 16 0"/><path d="M12 14l4-4"/><path d="M5 19h14"/></svg>',
      convert:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/><path d="M18 7l-3 3"/><path d="M6 17l3-3"/></svg>',
      edit:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
      security:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6Z"/><path d="m9 12 2 2 4-4"/></svg>',
      document:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>'
    };
    return icons[name] || icons.document;
  }

  /* ---------- Theme ---------- */
  function applyTheme(theme, persist) {
    document.documentElement.setAttribute("data-theme", theme);
    if (persist !== false) {
      try { localStorage.setItem("pdfx-theme", theme); } catch (e) {}
    }
    var button = $("#theme-toggle");
    if (button) {
      var next = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
      button.setAttribute("aria-label", next);
      button.setAttribute("title", next);
    }
  }

  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem("pdfx-theme"); } catch (e) {}
    if (stored === "dark" || stored === "light") {
      applyTheme(stored, false);
    } else {
      var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(prefersDark ? "dark" : "light", false);
    }
  }

  /* ---------- Header interactions ---------- */
  function initHeader() {
    var themeButton = $("#theme-toggle");
    if (themeButton) {
      themeButton.addEventListener("click", function () {
        var current = document.documentElement.getAttribute("data-theme") || "light";
        applyTheme(current === "dark" ? "light" : "dark");
      });
    }

    var navToggle = $("#nav-toggle");
    var navLinks = $("#nav-links");
    if (navToggle && navLinks) {
      navToggle.addEventListener("click", function () {
        var open = navLinks.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      });
      navLinks.addEventListener("click", function (event) {
        if (event.target.closest("a")) {
          navLinks.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
          navToggle.setAttribute("aria-label", "Open menu");
        }
      });
    }

    var activeKey = page === "tool" ? "home" : page;
    $$(".nav-link").forEach(function (navLink) {
      var key = navLink.getAttribute("data-key");
      if (key && key === activeKey) navLink.setAttribute("aria-current", "page");
      else navLink.removeAttribute("aria-current");
    });
  }

  function initYear() {
    var y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- Cookie consent ---------- */
  function initCookieConsent() {
    var key = "pdfx-cookie-consent-v1";
    var stored = null;
    try { stored = localStorage.getItem(key); } catch (e) {}
    if (stored) return;

    var banner = document.createElement("div");
    banner.className = "cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookie consent");
    banner.innerHTML =
      "<p><strong>Cookies and local storage.</strong> PDF Experts uses local storage for your theme and consent choice. If we show ads in the future, advertising partners may use cookies. Read our <a href=\"" +
      link("privacy.html") + "\">privacy policy</a>.</p>" +
      '<div class="cookie-actions">' +
      '  <button class="btn btn-ghost btn-small" type="button" data-consent="declined">Decline</button>' +
      '  <button class="btn btn-primary btn-small" type="button" data-consent="accepted">Accept</button>' +
      "</div>";

    document.body.appendChild(banner);
    banner.addEventListener("click", function (event) {
      var button = event.target.closest("[data-consent]");
      if (!button) return;
      try { localStorage.setItem(key, button.getAttribute("data-consent")); } catch (e) {}
      banner.remove();
    });
  }

  /* ---------- Homepage grid ---------- */
  function initHomepage() {
    var grid = $("#tool-grid");
    if (!grid) return;

    var tabs = $$(".category-tab");
    var count = $("#tool-count");
    var activeCategory = "All";

    function render() {
      var filtered = tools.filter(function (tool) {
        return activeCategory === "All" || tool.category === activeCategory;
      });

      grid.innerHTML = filtered.map(function (tool) {
        var ready = tool.ready;
        return (
          '<article class="tool-card' + (ready ? "" : " is-coming") + ' reveal">' +
          '<div class="tool-icon">' + iconSvg(tool.icon) + "</div>" +
          "<h3>" + escapeHtml(tool.name) + "</h3>" +
          "<p>" + escapeHtml(tool.description) + "</p>" +
          (ready
            ? '<a class="card-link" href="' + link(tool.file) + '" aria-label="Open ' + escapeHtml(tool.name) + '">Open tool <span aria-hidden="true">→</span></a>'
            : '<span class="soon-badge">Coming soon</span>') +
          "</article>"
        );
      }).join("");

      if (count) {
        count.textContent = filtered.length + (filtered.length === 1 ? " tool" : " tools") + " shown";
      }
      revealCards();
    }

    function revealCards() {
      var cards = $$(".tool-card.reveal", grid);
      if (!("IntersectionObserver" in window)) {
        cards.forEach(function (c) { c.classList.add("is-visible"); });
        return;
      }
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });
      cards.forEach(function (c) { observer.observe(c); });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        activeCategory = tab.getAttribute("data-category") || "All";
        tabs.forEach(function (item) {
          item.setAttribute("aria-pressed", item === tab ? "true" : "false");
        });
        render();
      });
    });

    render();
  }

  /* ---------- Related tools ---------- */
  function initRelatedTools() {
    var host = $("#related-tools");
    if (!host) return;

    var currentSlug = document.body.getAttribute("data-tool") || "";
    var related = tools
      .filter(function (tool) { return tool.ready && tool.slug !== currentSlug; })
      .slice(0, 5);

    if (!related.length) {
      host.innerHTML = "<li><span>More tools coming soon.</span></li>";
      return;
    }

    host.innerHTML = related.map(function (tool) {
      return '<li><a href="' + link(tool.file) + '">' + escapeHtml(tool.name) + ' <span aria-hidden="true">→</span></a></li>';
    }).join("");
  }

  /* ---------- Contact form ---------- */
  function initContactForm() {
    var form = $("#contact-form");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = $("#contact-name");
      var email = $("#contact-email");
      var message = $("#contact-message");
      var note = $("#contact-note");

      if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
        if (note) {
          note.hidden = false;
          note.textContent = "Please complete all three fields before sending.";
        }
        return;
      }

      var subject = "PDF Experts enquiry from " + name.value.trim();
      var body = "Name: " + name.value.trim() + "\nEmail: " + email.value.trim() + "\n\n" + message.value.trim();
      window.location.href = "mailto:hello@pdfexperts.site?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

      if (note) {
        note.hidden = false;
        note.textContent = "Your email app should open now. If it does not, email hello@pdfexperts.site directly.";
      }
    });
  }

  /* ---------- Reveal ---------- */
  function initReveal() {
    var items = $$(".reveal").filter(function (item) { return !item.closest("#tool-grid"); });
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (item) { item.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    items.forEach(function (item) { observer.observe(item); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initHeader();
    initYear();
    initCookieConsent();
    initHomepage();
    initRelatedTools();
    initContactForm();
    initReveal();
  });
})();
