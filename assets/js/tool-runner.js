/* PDF Experts — shared tool engine.
   Reads window.PDF_EXPERTS_TOOL config and wires the standard tool page UI.
   Libraries expected on the page: PDFLib, pdfjsLib, JSZip. */
(function () {
  "use strict";

  var cfg = window.PDF_EXPERTS_TOOL || {};
  if (!cfg.type) return;

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }

  var state = {
    files: [],
    pages: null,
    pdfDoc: null,
    busy: false,
    resultUrl: null
  };

  var MAX_MB = cfg.maxSizeMB || 100;
  var MAX_FILES = cfg.maxFiles || 20;

  /* ---------------- helpers ---------------- */
  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function $$(sel, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(sel));
  }
  function tick(ms) { return new Promise(function (r) { setTimeout(r, ms || 0); }); }
  function pad(n, width) { return String(n).padStart(width || 2, "0"); }

  function fmt(bytes) {
    if (!bytes) return "0 B";
    var units = ["B", "KB", "MB", "GB"];
    var i = 0, n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return n.toFixed(n < 10 && i > 0 ? 1 : 0) + " " + units[i];
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function showError(msg) {
    var box = $("#error-box");
    if (!box) return;
    box.textContent = msg;
    box.hidden = false;
    try { box.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
  }
  function clearError() {
    var box = $("#error-box");
    if (!box) return;
    box.textContent = "";
    box.hidden = true;
  }

  function setProgress(pct, text) {
    var wrap = $("#progress-wrap");
    var bar = $("#progress-bar");
    var pctEl = $("#progress-percent");
    var txt = $("#progress-text");
    if (!wrap || !bar) return;
    if (pct <= 0) { wrap.hidden = true; bar.style.width = "0%"; return; }
    wrap.hidden = false;
    bar.style.width = Math.min(100, pct) + "%";
    if (pctEl) pctEl.textContent = Math.round(pct) + "%";
    if (text && txt) txt.textContent = text;
  }

  function updateButtons() {
    var btn = $("#process-btn");
    if (btn) btn.disabled = state.busy || state.files.length === 0;
    var clearAll = $("#clear-all");
    if (clearAll) clearAll.hidden = state.files.length === 0;
    var reset = $("#reset-btn");
    if (reset) reset.disabled = state.busy;
  }

  function resetResult() {
    var box = $("#result-box");
    if (box) box.hidden = true;
    var a = $("#download-btn");
    if (a) a.removeAttribute("href");
    var meta = $("#result-meta");
    if (meta) meta.textContent = "";
    if (state.resultUrl) {
      try { URL.revokeObjectURL(state.resultUrl); } catch (e) {}
      state.resultUrl = null;
    }
  }

  function downloadBlob(blob, filename) {
    if (state.resultUrl) { try { URL.revokeObjectURL(state.resultUrl); } catch (e) {} }
    state.resultUrl = URL.createObjectURL(blob);
    var a = $("#download-btn");
    if (a) { a.href = state.resultUrl; a.download = filename; }
    var meta = $("#result-meta");
    if (meta) meta.textContent = filename + " · " + fmt(blob.size);
    var box = $("#result-box");
    if (box) {
      box.hidden = false;
      var h = box.querySelector("h2");
      if (h) { h.setAttribute("tabindex", "-1"); try { h.focus(); } catch (e) {} }
    }
  }

  /* ---------------- file validation & rendering ---------------- */
  function validateFile(file) {
    var name = file.name.toLowerCase();
    var accepted = String(cfg.accept || "").split(",").map(function (s) {
      return s.trim().toLowerCase();
    }).filter(Boolean);

    var okExt = accepted.some(function (a) {
      return a.charAt(0) === "." && name.lastIndexOf(a) === name.length - a.length;
    });
    var okMime = accepted.some(function (a) {
      return a.charAt(0) !== "." && file.type === a;
    });

    if (!okExt && !okMime) {
      return { ok: false, reason: "Unsupported file type: " + file.name };
    }
    if (file.size === 0) {
      return { ok: false, reason: file.name + " is empty." };
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return { ok: false, reason: file.name + " is larger than " + MAX_MB + " MB." };
    }
    return { ok: true };
  }

  function addFiles(fileList) {
    clearError();
    resetResult();
    var incoming = Array.prototype.slice.call(fileList || []);
    if (!incoming.length) return;

    if (!cfg.multiple) {
      state.files = [];
      state.pages = null;
      state.pdfDoc = null;
    }

    for (var i = 0; i < incoming.length; i++) {
      var f = incoming[i];
      if (state.files.length >= MAX_FILES) {
        showError("Maximum " + MAX_FILES + " files allowed.");
        break;
      }
      var v = validateFile(f);
      if (!v.ok) { showError(v.reason); continue; }
      var dup = state.files.some(function (x) { return x.name === f.name && x.size === f.size; });
      if (dup) continue;
      state.files.push(f);
    }

    renderFiles();
    updateButtons();

    if (cfg.type === "organize" && state.files.length === 1) {
      loadOrganizeThumbnails(state.files[0]).catch(function (err) {
        showError("Could not read this PDF for preview: " + (err && err.message ? err.message : err));
      });
    }
  }

  function renderFiles() {
    var list = $("#file-list");
    var count = $("#file-count");
    if (!list) return;

    list.innerHTML = state.files.map(function (f, i) {
      var ext = (f.name.split(".").pop() || "").toUpperCase().slice(0, 4);
      var reorder = cfg.multiple && state.files.length > 1;
      return (
        '<li class="file-row">' +
          '<span class="file-type">' + escapeHtml(ext) + '</span>' +
          '<span class="file-meta">' +
            '<span class="file-name" title="' + escapeHtml(f.name) + '">' + escapeHtml(f.name) + '</span>' +
            '<span class="file-size">' + fmt(f.size) + '</span>' +
          '</span>' +
          (reorder
            ? '<button type="button" class="btn btn-ghost btn-small" data-move="' + i + '" data-dir="-1" aria-label="Move up" ' + (i === 0 ? "disabled" : "") + '>↑</button>' +
              '<button type="button" class="btn btn-ghost btn-small" data-move="' + i + '" data-dir="1" aria-label="Move down" ' + (i === state.files.length - 1 ? "disabled" : "") + '>↓</button>'
            : "") +
          '<button type="button" class="btn-danger-ghost" data-remove="' + i + '" aria-label="Remove ' + escapeHtml(f.name) + '">Remove</button>' +
        '</li>'
      );
    }).join("");

    if (count) count.textContent = state.files.length + (state.files.length === 1 ? " file" : " files");
  }

  function removeFile(i) {
    state.files.splice(i, 1);
    if (cfg.type === "organize") {
      state.pages = null;
      state.pdfDoc = null;
      var tp = $("#thumb-panel");
      if (tp) tp.hidden = true;
      var tg = $("#thumb-grid");
      if (tg) tg.innerHTML = "";
    }
    renderFiles();
    updateButtons();
    clearError();
    resetResult();
  }

  function moveFile(i, delta) {
    var ni = i + delta;
    if (ni < 0 || ni >= state.files.length) return;
    var moved = state.files.splice(i, 1)[0];
    state.files.splice(ni, 0, moved);
    renderFiles();
  }

  function resetAll() {
    state.files = [];
    state.pages = null;
    state.pdfDoc = null;
    renderFiles();
    updateButtons();
    resetResult();
    clearError();
    setProgress(0);
    var grid = $("#thumb-panel");
    if (grid) grid.hidden = true;
    var tg = $("#thumb-grid");
    if (tg) tg.innerHTML = "";
    var fi = $("#file-input");
    if (fi) fi.value = "";
  }

  /* ---------------- processors ---------------- */
  async function processMerge() {
    var PDFDocument = PDFLib.PDFDocument;
    var out = await PDFDocument.create();
    var total = state.files.length;
    for (var i = 0; i < total; i++) {
      setProgress(8 + (i / total) * 82, "Merging file " + (i + 1) + " of " + total + "…");
      var bytes = await state.files[i].arrayBuffer();
      var doc;
      try {
        doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      } catch (err) {
        throw new Error("Could not read " + state.files[i].name + ". The file may be corrupt or password-protected.");
      }
      var pages = await out.copyPages(doc, doc.getPageIndices());
      pages.forEach(function (p) { out.addPage(p); });
      await tick(10);
    }
    setProgress(95, "Building merged file…");
    var merged = await out.save();
    return {
      blob: new Blob([merged], { type: "application/pdf" }),
      filename: "merged-" + Date.now() + ".pdf"
    };
  }

  async function processSplit() {
    var PDFDocument = PDFLib.PDFDocument;
    var JSZip = window.JSZip;
    var file = state.files[0];
    var bytes = await file.arrayBuffer();
    var src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    var total = src.getPageCount();

    var modeEl = $("input[name='split-mode']:checked");
    var mode = modeEl ? modeEl.value : "each";

    if (mode === "range") {
      var fromEl = $("#range-from");
      var toEl = $("#range-to");
      var from = Math.max(1, parseInt(fromEl && fromEl.value, 10) || 1);
      var to = Math.min(total, parseInt(toEl && toEl.value, 10) || total);
      if (from > to) throw new Error("Start page must be less than or equal to end page.");
      if (to > total) throw new Error("End page exceeds the document length (" + total + " pages).");
      setProgress(40, "Extracting pages " + from + "–" + to + "…");
      var outDoc = await PDFDocument.create();
      var idx = [];
      for (var k = from; k <= to; k++) idx.push(k - 1);
      var pg = await outDoc.copyPages(src, idx);
      pg.forEach(function (p) { outDoc.addPage(p); });
      setProgress(95, "Saving…");
      var data = await outDoc.save();
      return {
        blob: new Blob([data], { type: "application/pdf" }),
        filename: "extracted-pages-" + from + "-" + to + ".pdf"
      };
    }

    var chunkSize;
    if (mode === "each") {
      chunkSize = 1;
    } else {
      var chunkEl = $("#chunk-size");
      chunkSize = Math.max(1, parseInt(chunkEl && chunkEl.value, 10) || 5);
    }

    if (!JSZip) throw new Error("ZIP library failed to load. Check your connection and refresh.");

    var zip = new JSZip();
    var parts = Math.ceil(total / chunkSize);
    var part = 0;
    for (var p = 0; p < total; p += chunkSize, part++) {
      var start = p;
      var end = Math.min(total, p + chunkSize);
      var partDoc = await PDFDocument.create();
      var indices = [];
      for (var j = start; j < end; j++) indices.push(j);
      var pages = await partDoc.copyPages(src, indices);
      pages.forEach(function (pg2) { partDoc.addPage(pg2); });
      var partData = await partDoc.save();
      zip.file("pages-" + pad(start + 1) + "-" + pad(end) + ".pdf", partData);
      setProgress(8 + ((part + 1) / parts) * 82, "Building part " + (part + 1) + " of " + parts + "…");
      await tick(10);
    }
    setProgress(95, "Zipping files…");
    var zipBlob = await zip.generateAsync({ type: "blob" });
    return {
      blob: zipBlob,
      filename: "split-" + file.name.replace(/\.pdf$/i, "") + ".zip"
    };
  }

  async function processRotate() {
    var PDFDocument = PDFLib.PDFDocument;
    var degrees = PDFLib.degrees;
    var angleEl = $("#rotate-angle");
    var angle = parseInt(angleEl && angleEl.value, 10) || 90;

    var applyEl = $("input[name='rotate-apply']:checked");
    var applyTo = applyEl ? applyEl.value : "all";

    var file = state.files[0];
    var bytes = await file.arrayBuffer();
    var doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    var total = doc.getPageCount();
    var targets = new Set();

    if (applyTo === "all") {
      for (var i = 0; i < total; i++) targets.add(i);
    } else {
      var textEl = $("#rotate-pages");
      var text = (textEl && textEl.value) || "";
      if (!text.trim()) throw new Error("Please enter page numbers (e.g. 1, 3, 5-8).");
      text.split(",").forEach(function (part) {
        part = part.trim();
        if (!part) return;
        if (part.indexOf("-") !== -1) {
          var a = part.split("-").map(function (x) { return parseInt(x, 10); });
          if (isNaN(a[0]) || isNaN(a[1])) return;
          for (var k = a[0]; k <= a[1]; k++) if (k >= 1 && k <= total) targets.add(k - 1);
        } else {
          var n = parseInt(part, 10);
          if (n >= 1 && n <= total) targets.add(n - 1);
        }
      });
    }

    if (!targets.size) throw new Error("No valid pages selected for rotation.");

    setProgress(40, "Rotating pages…");
    var pages = doc.getPages();
    targets.forEach(function (idx) {
      var page = pages[idx];
      var current = page.getRotation().angle || 0;
      page.setRotation(degrees((current + angle) % 360));
    });
    setProgress(90, "Saving…");
    var data = await doc.save();
    return {
      blob: new Blob([data], { type: "application/pdf" }),
      filename: "rotated-" + file.name
    };
  }

  async function loadOrganizeThumbnails(file) {
    if (!window.pdfjsLib) throw new Error("Preview library did not load.");
    var panel = $("#thumb-panel");
    var container = $("#thumb-grid");
    if (!panel || !container) return;
    panel.hidden = false;
    container.innerHTML = '<p class="thumb-help">Loading page previews…</p>';

    var bytes = await file.arrayBuffer();
    var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
    var total = pdf.numPages;
    container.innerHTML = "";
    state.pages = [];
    state.pdfDoc = pdf;

    for (var i = 1; i <= total; i++) {
      state.pages.push({ originalIndex: i - 1, deleted: false });
      var page = await pdf.getPage(i);
      var viewport = page.getViewport({ scale: 0.55 });
      var canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      var card = document.createElement("div");
      card.className = "thumb-card";
      card.draggable = true;
      card.dataset.orig = String(i - 1);
      card.innerHTML =
        '<div class="thumb-label">' +
          '<span>Page ' + i + '</span>' +
          '<div class="thumb-actions">' +
            '<button type="button" data-act="up" aria-label="Move page up">↑</button>' +
            '<button type="button" data-act="down" aria-label="Move page down">↓</button>' +
            '<button type="button" data-act="del" aria-label="Delete page">×</button>' +
          '</div>' +
        '</div>';
      card.insertBefore(canvas, card.firstChild);
      container.appendChild(card);
    }
  }

  function renderOrganizeOrder() {
    var container = $("#thumb-grid");
    if (!container || !state.pages) return;
    state.pages.forEach(function (p) {
      var card = container.querySelector('.thumb-card[data-orig="' + p.originalIndex + '"]');
      if (!card) return;
      container.appendChild(card);
      card.classList.toggle("is-deleted", p.deleted);
      card.style.opacity = p.deleted ? "0.4" : "";
      card.style.textDecoration = p.deleted ? "line-through" : "";
      var label = card.querySelector(".thumb-label span");
      if (label) label.textContent = p.deleted ? "Page removed" : "Page " + (p.originalIndex + 1);
    });
  }

  function bindOrganizeThumbs() {
    var container = $("#thumb-grid");
    if (!container) return;
    var dragged = null;

    container.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-act]");
      if (!btn) return;
      var card = btn.closest(".thumb-card");
      if (!card || !state.pages) return;
      var orig = parseInt(card.dataset.orig, 10);
      var from = state.pages.findIndex(function (p) { return p.originalIndex === orig; });
      if (from < 0) return;
      var act = btn.dataset.act;
      if (act === "del") {
        state.pages[from].deleted = !state.pages[from].deleted;
      } else if (act === "up" && from > 0) {
        var mv = state.pages.splice(from, 1)[0];
        state.pages.splice(from - 1, 0, mv);
      } else if (act === "down" && from < state.pages.length - 1) {
        var mv2 = state.pages.splice(from, 1)[0];
        state.pages.splice(from + 1, 0, mv2);
      }
      renderOrganizeOrder();
    });

    container.addEventListener("dragstart", function (e) {
      var card = e.target.closest(".thumb-card");
      if (!card) return;
      dragged = parseInt(card.dataset.orig, 10);
      card.classList.add("is-dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", String(dragged)); } catch (err) {}
      }
    });
    container.addEventListener("dragend", function (e) {
      var card = e.target.closest(".thumb-card");
      if (card) card.classList.remove("is-dragging");
      dragged = null;
    });
    container.addEventListener("dragover", function (e) {
      if (dragged === null) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    });
    container.addEventListener("drop", function (e) {
      e.preventDefault();
      if (dragged === null || !state.pages) return;
      var card = e.target.closest(".thumb-card");
      if (!card) return;
      var over = parseInt(card.dataset.orig, 10);
      if (over === dragged) return;
      var from = state.pages.findIndex(function (p) { return p.originalIndex === dragged; });
      var to = state.pages.findIndex(function (p) { return p.originalIndex === over; });
      if (from < 0 || to < 0) return;
      var moved = state.pages.splice(from, 1)[0];
      state.pages.splice(to, 0, moved);
      dragged = null;
      renderOrganizeOrder();
    });
  }

  async function processOrganize() {
    var PDFDocument = PDFLib.PDFDocument;
    if (!state.pages) throw new Error("Please wait for the page previews to load.");
    var active = state.pages
      .filter(function (p) { return !p.deleted; })
      .map(function (p) { return p.originalIndex; });
    if (!active.length) throw new Error("Every page is marked for removal. Keep at least one page.");
    var file = state.files[0];
    var bytes = await file.arrayBuffer();
    var src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    setProgress(30, "Rebuilding PDF with new page order…");
    var out = await PDFDocument.create();
    var pages = await out.copyPages(src, active);
    pages.forEach(function (p) { out.addPage(p); });
    setProgress(90, "Saving…");
    var data = await out.save();
    return {
      blob: new Blob([data], { type: "application/pdf" }),
      filename: "organized-" + file.name
    };
  }

  async function processPageNumbers() {
    var PDFDocument = PDFLib.PDFDocument;
    var StandardFonts = PDFLib.StandardFonts;
    var rgb = PDFLib.rgb;
    var file = state.files[0];
    var bytes = await file.arrayBuffer();
    var doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    var font = await doc.embedFont(StandardFonts.Helvetica);

    var posEl = $("#pn-position");
    var position = (posEl && posEl.value) || "bottom-center";
    var startEl = $("#pn-start");
    var startNum = parseInt(startEl && startEl.value, 10) || 1;
    var fmtEl = $("#pn-format");
    var format = (fmtEl && fmtEl.value) || "n";
    var sizeEl = $("#pn-size");
    var fontSize = Math.max(6, Math.min(48, parseInt(sizeEl && sizeEl.value, 10) || 12));
    var margin = 24;

    var pages = doc.getPages();
    var total = pages.length;

    pages.forEach(function (page, i) {
      var size = page.getSize();
      var num = startNum + i;
      var text = String(num);
      if (format === "n-of-total") text = "Page " + num + " of " + total;
      else if (format === "num-total") text = num + " / " + total;
      else if (format === "dash") text = "— " + num + " —";

      var tw = font.widthOfTextAtSize(text, fontSize);
      var parts = position.split("-");
      var v = parts[0], h = parts[1];
      var x, y;
      if (v === "top") y = size.height - margin - fontSize;
      else if (v === "middle") y = (size.height - fontSize) / 2;
      else y = margin;
      if (h === "left") x = margin;
      else if (h === "right") x = size.width - margin - tw;
      else x = (size.width - tw) / 2;

      page.drawText(text, {
        x: x, y: y, size: fontSize, font: font,
        color: rgb(0.08, 0.12, 0.24)
      });
    });

    setProgress(90, "Saving…");
    var data = await doc.save();
    return {
      blob: new Blob([data], { type: "application/pdf" }),
      filename: "numbered-" + file.name
    };
  }

  function hexToRgb(hex) {
    var rgb = PDFLib.rgb;
    var clean = String(hex || "").replace("#", "");
    if (clean.length !== 6) return rgb(0.55, 0, 0);
    return rgb(
      parseInt(clean.slice(0, 2), 16) / 255,
      parseInt(clean.slice(2, 4), 16) / 255,
      parseInt(clean.slice(4, 6), 16) / 255
    );
  }

  async function processWatermark() {
    var PDFDocument = PDFLib.PDFDocument;
    var StandardFonts = PDFLib.StandardFonts;
    var degrees = PDFLib.degrees;
    var file = state.files[0];
    var bytes = await file.arrayBuffer();
    var doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    var font = await doc.embedFont(StandardFonts.HelveticaBold);

    var textEl = $("#wm-text");
    var text = ((textEl && textEl.value) || "").trim() || "CONFIDENTIAL";
    var opacityEl = $("#wm-opacity");
    var opacity = Math.max(0.05, Math.min(1, parseFloat(opacityEl && opacityEl.value) || 0.25));
    var sizeEl = $("#wm-size");
    var fontSize = Math.max(8, Math.min(200, parseInt(sizeEl && sizeEl.value, 10) || 60));
    var angleEl = $("#wm-angle");
    var angle = parseFloat(angleEl && angleEl.value);
    if (isNaN(angle)) angle = 45;
    var colorEl = $("#wm-color");
    var color = hexToRgb((colorEl && colorEl.value) || "#9b1c1c");
    var repeatEl = $("#wm-repeat");
    var repeat = (repeatEl && repeatEl.value) || "single";

    doc.getPages().forEach(function (page) {
      var size = page.getSize();
      var tw = font.widthOfTextAtSize(text, fontSize);

      if (repeat === "tile") {
        var stepX = Math.max(tw + 80, 240);
        var stepY = Math.max(fontSize * 3, 140);
        for (var y = -size.height; y < size.height * 2; y += stepY) {
          for (var x = -size.width; x < size.width * 2; x += stepX) {
            page.drawText(text, {
              x: x, y: y, size: fontSize, font: font, color: color,
              opacity: opacity, rotate: degrees(angle)
            });
          }
        }
      } else {
        page.drawText(text, {
          x: (size.width - tw) / 2,
          y: size.height / 2 - fontSize / 3,
          size: fontSize, font: font, color: color,
          opacity: opacity, rotate: degrees(angle)
        });
      }
    });

    setProgress(90, "Saving…");
    var data = await doc.save();
    return {
      blob: new Blob([data], { type: "application/pdf" }),
      filename: "watermarked-" + file.name
    };
  }

  async function processCrop() {
    var PDFDocument = PDFLib.PDFDocument;
    var file = state.files[0];
    var bytes = await file.arrayBuffer();
    var doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

    var unitEl = $("#crop-unit");
    var unit = (unitEl && unitEl.value) || "mm";
    var factor = unit === "mm" ? 72 / 25.4 : unit === "in" ? 72 : 1;

    var topEl = $("#crop-top"), rightEl = $("#crop-right"),
        bottomEl = $("#crop-bottom"), leftEl = $("#crop-left");
    var top = Math.max(0, parseFloat(topEl && topEl.value) || 0) * factor;
    var right = Math.max(0, parseFloat(rightEl && rightEl.value) || 0) * factor;
    var bottom = Math.max(0, parseFloat(bottomEl && bottomEl.value) || 0) * factor;
    var left = Math.max(0, parseFloat(leftEl && leftEl.value) || 0) * factor;

    doc.getPages().forEach(function (page) {
      var size = page.getSize();
      var w = Math.max(20, size.width - left - right);
      var h = Math.max(20, size.height - top - bottom);
      page.setCropBox(left, bottom, w, h);
      page.setMediaBox(left, bottom, w, h);
    });

    setProgress(90, "Saving…");
    var data = await doc.save();
    return {
      blob: new Blob([data], { type: "application/pdf" }),
      filename: "cropped-" + file.name
    };
  }

  async function processJpgToPdf() {
    var PDFDocument = PDFLib.PDFDocument;
    var doc = await PDFDocument.create();
    var sizeEl = $("#jpg-page-size");
    var pageSize = (sizeEl && sizeEl.value) || "a4";
    var orientEl = $("#jpg-orientation");
    var orientation = (orientEl && orientEl.value) || "auto";
    var total = state.files.length;

    for (var i = 0; i < total; i++) {
      var f = state.files[i];
      setProgress(8 + (i / total) * 82, "Adding image " + (i + 1) + " of " + total + "…");
      var bytes = await f.arrayBuffer();
      var img;
      try {
        if (/\.png$/i.test(f.name) || f.type === "image/png") {
          img = await doc.embedPng(bytes);
        } else {
          img = await doc.embedJpg(bytes);
        }
      } catch (err) {
        throw new Error("Could not embed " + f.name + ". Use standard JPG or PNG images.");
      }
      var iw = img.width, ih = img.height;
      var pw, ph;
      if (pageSize === "auto") {
        pw = iw; ph = ih;
      } else {
        var sizes = { a4: [595.28, 841.89], letter: [612, 792] };
        var s = sizes[pageSize] || sizes.a4;
        pw = s[0]; ph = s[1];
        var landscape = orientation === "landscape" || (orientation === "auto" && iw > ih);
        if (landscape) { var tmp = pw; pw = ph; ph = tmp; }
      }
      var page = doc.addPage([pw, ph]);
      var drawX, drawY, drawW, drawH;
      if (pageSize === "auto") {
        drawX = 0; drawY = 0; drawW = iw; drawH = ih;
      } else {
        var margin = 20;
        var availW = pw - margin * 2;
        var availH = ph - margin * 2;
        var scale = Math.min(availW / iw, availH / ih);
        drawW = iw * scale;
        drawH = ih * scale;
        drawX = (pw - drawW) / 2;
        drawY = (ph - drawH) / 2;
      }
      page.drawImage(img, { x: drawX, y: drawY, width: drawW, height: drawH });
      await tick(10);
    }

    setProgress(95, "Building PDF…");
    var data = await doc.save();
    return {
      blob: new Blob([data], { type: "application/pdf" }),
      filename: "images-" + Date.now() + ".pdf"
    };
  }

  async function processPdfToJpg() {
    if (!window.pdfjsLib) throw new Error("PDF preview library did not load.");
    if (!window.JSZip) throw new Error("ZIP library did not load.");
    var file = state.files[0];

    var qualityEl = $("#jpg-quality");
    var quality = parseFloat(qualityEl && qualityEl.value);
    if (isNaN(quality)) quality = 0.85;

    var formatEl = $("#jpg-format");
    var format = (formatEl && formatEl.value) || "jpg";

    var scaleEl = $("#jpg-scale");
    var scale = parseFloat(scaleEl && scaleEl.value);
    if (isNaN(scale)) scale = 2;

    var bytes = await file.arrayBuffer();
    var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
    var total = pdf.numPages;
    var mime = format === "png" ? "image/png" : "image/jpeg";
    var ext = format === "png" ? "png" : "jpg";
    var zip = new window.JSZip();
    var MAX_SIDE = 4096;

    for (var i = 1; i <= total; i++) {
      setProgress(8 + ((i - 1) / total) * 82, "Rendering page " + i + " of " + total + "…");
      var page = await pdf.getPage(i);
      var viewport = page.getViewport({ scale: scale });
      var cw = Math.min(MAX_SIDE, Math.ceil(viewport.width));
      var ch = Math.min(MAX_SIDE, Math.ceil(viewport.height));
      if (cw < viewport.width || ch < viewport.height) {
        var fit = Math.min(cw / viewport.width, ch / viewport.height);
        viewport = page.getViewport({ scale: scale * fit });
        cw = Math.ceil(viewport.width);
        ch = Math.ceil(viewport.height);
      }
      var canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cw, ch);
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      var blob = await new Promise(function (resolve) {
        canvas.toBlob(function (b) { resolve(b); }, mime, quality);
      });
      zip.file("page-" + String(i).padStart(3, "0") + "." + ext, blob);
      canvas.width = 0; canvas.height = 0;
      await tick(5);
    }

    setProgress(95, "Packaging images…");
    var zipBlob = await zip.generateAsync({ type: "blob" });
    return {
      blob: zipBlob,
      filename: "pdf-pages-" + Date.now() + ".zip"
    };
  }

  var processors = {
    "merge": processMerge,
    "split": processSplit,
    "rotate": processRotate,
    "organize": processOrganize,
    "page-numbers": processPageNumbers,
    "watermark": processWatermark,
    "crop": processCrop,
    "jpg-to-pdf": processJpgToPdf,
    "pdf-to-jpg": processPdfToJpg
  };

  async function runProcess() {
    if (state.busy) return;
    if (!state.files.length) { showError("Please add at least one file."); return; }
    var fn = processors[cfg.type];
    if (!fn) { showError("This tool is not available yet."); return; }

    clearError();
    resetResult();
    state.busy = true;
    updateButtons();
    setProgress(2, "Starting…");
    try {
      var result = await fn();
      setProgress(100, "Done");
      downloadBlob(result.blob, result.filename);
    } catch (err) {
      setProgress(0);
      showError(err && err.message ? err.message : "Something went wrong. Please try a different file.");
    } finally {
      state.busy = false;
      updateButtons();
    }
  }

  /* ---------------- wiring ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    var dropzone = $("#dropzone");
    var input = $("#file-input");
    var list = $("#file-list");

    if (dropzone && input) {
      ["dragenter", "dragover"].forEach(function (ev) {
        dropzone.addEventListener(ev, function (e) {
          e.preventDefault();
          dropzone.classList.add("is-dragover");
        });
      });
      ["dragleave", "dragend", "drop"].forEach(function (ev) {
        dropzone.addEventListener(ev, function (e) {
          if (ev !== "drop") e.preventDefault();
          dropzone.classList.remove("is-dragover");
        });
      });
      dropzone.addEventListener("drop", function (e) {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          addFiles(e.dataTransfer.files);
        }
      });
      input.addEventListener("change", function () {
        if (input.files && input.files.length) addFiles(input.files);
        input.value = "";
      });
    }

    if (list) {
      list.addEventListener("click", function (e) {
        var rm = e.target.closest("[data-remove]");
        if (rm) {
          removeFile(parseInt(rm.getAttribute("data-remove"), 10));
          return;
        }
        var mv = e.target.closest("[data-move]");
        if (mv) {
          moveFile(parseInt(mv.getAttribute("data-move"), 10), parseInt(mv.getAttribute("data-dir"), 10));
        }
      });
    }

    var clearAll = $("#clear-all");
    if (clearAll) clearAll.addEventListener("click", resetAll);

    var reset = $("#reset-btn");
    if (reset) reset.addEventListener("click", resetAll);

    var process = $("#process-btn");
    if (process) process.addEventListener("click", runProcess);

    if (cfg.type === "organize") bindOrganizeThumbs();

    updateButtons();
  });
})();
