/* Global tool registry. Kept as a plain script so it works on GitHub Pages
   with no build step or module server. */
window.PDF_TOOLS = [
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    description: "Combine several PDF files into one tidy document.",
    category: "Organize",
    ready: true,
    file: "tool-merge.html",
    icon: "organize"
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    description: "Extract pages or split a PDF into separate files.",
    category: "Organize",
    ready: true,
    file: "tool-split.html",
    icon: "organize"
  },
  {
    slug: "compress-pdf",
    name: "Compress PDF",
    description: "Reduce PDF size while keeping the document readable.",
    category: "Optimize",
    ready: false,
    icon: "optimize"
  },
  {
    slug: "pdf-to-word",
    name: "PDF to Word",
    description: "Turn PDF pages into editable Word documents.",
    category: "Convert",
    ready: false,
    icon: "convert"
  },
  {
    slug: "pdf-to-powerpoint",
    name: "PDF to PowerPoint",
    description: "Convert PDF pages into presentation slides.",
    category: "Convert",
    ready: false,
    icon: "convert"
  },
  {
    slug: "pdf-to-excel",
    name: "PDF to Excel",
    description: "Extract tables and data into spreadsheet files.",
    category: "Convert",
    ready: false,
    icon: "convert"
  },
  {
    slug: "word-to-pdf",
    name: "Word to PDF",
    description: "Create clean, shareable PDFs from Word files.",
    category: "Convert",
    ready: false,
    icon: "convert"
  },
  {
    slug: "powerpoint-to-pdf",
    name: "PowerPoint to PDF",
    description: "Export slide decks as polished PDF documents.",
    category: "Convert",
    ready: false,
    icon: "convert"
  },
  {
    slug: "excel-to-pdf",
    name: "Excel to PDF",
    description: "Convert spreadsheets into print-ready PDFs.",
    category: "Convert",
    ready: false,
    icon: "convert"
  },
  {
    slug: "edit-pdf",
    name: "Edit PDF",
    description: "Add text, shapes and annotations to your PDF.",
    category: "Edit",
    ready: false,
    icon: "edit"
  },
  {
    slug: "pdf-to-jpg",
    name: "PDF to JPG",
    description: "Turn every PDF page into a high-quality JPG image.",
    category: "Convert",
    ready: true,
    file: "tool-pdf-to-jpg.html",
    icon: "convert"
  },
  {
    slug: "jpg-to-pdf",
    name: "JPG to PDF",
    description: "Combine JPG or PNG images into a single PDF.",
    category: "Convert",
    ready: true,
    file: "tool-jpg-to-pdf.html",
    icon: "convert"
  },
  {
    slug: "sign-pdf",
    name: "Sign PDF",
    description: "Add a drawn or typed signature to a document.",
    category: "Edit",
    ready: false,
    icon: "edit"
  },
  {
    slug: "watermark",
    name: "Watermark",
    description: "Stamp text watermarks across your PDF pages.",
    category: "Edit",
    ready: true,
    file: "tool-watermark.html",
    icon: "edit"
  },
  {
    slug: "rotate-pdf",
    name: "Rotate PDF",
    description: "Rotate all or selected pages by 90, 180 or 270 degrees.",
    category: "Organize",
    ready: true,
    file: "tool-rotate.html",
    icon: "organize"
  },
  {
    slug: "html-to-pdf",
    name: "HTML to PDF",
    description: "Save web pages and HTML files as PDF documents.",
    category: "Convert",
    ready: false,
    icon: "convert"
  },
  {
    slug: "unlock-pdf",
    name: "Unlock PDF",
    description: "Remove passwords from PDFs you own.",
    category: "Security",
    ready: false,
    icon: "security"
  },
  {
    slug: "protect-pdf",
    name: "Protect PDF",
    description: "Add password protection to sensitive documents.",
    category: "Security",
    ready: false,
    icon: "security"
  },
  {
    slug: "organize-pdf",
    name: "Organize PDF",
    description: "Reorder, duplicate or delete PDF pages visually.",
    category: "Organize",
    ready: true,
    file: "tool-organize.html",
    icon: "organize"
  },
  {
    slug: "pdf-to-pdfa",
    name: "PDF to PDF/A",
    description: "Prepare PDFs for long-term archiving.",
    category: "Optimize",
    ready: false,
    icon: "optimize"
  },
  {
    slug: "repair-pdf",
    name: "Repair PDF",
    description: "Rebuild damaged or malformed PDF files.",
    category: "Optimize",
    ready: false,
    icon: "optimize"
  },
  {
    slug: "page-numbers",
    name: "Page numbers",
    description: "Add clean page numbers to every page.",
    category: "Edit",
    ready: true,
    file: "tool-page-numbers.html",
    icon: "edit"
  },
  {
    slug: "scan-to-pdf",
    name: "Scan to PDF",
    description: "Use your camera to create a PDF from paper documents.",
    category: "Convert",
    ready: false,
    icon: "convert"
  },
  {
    slug: "ocr-pdf",
    name: "OCR PDF",
    description: "Make scanned text searchable with optical recognition.",
    category: "Convert",
    ready: false,
    icon: "convert"
  },
  {
    slug: "compare-pdf",
    name: "Compare PDF",
    description: "Spot differences between two versions of a PDF.",
    category: "Edit",
    ready: false,
    icon: "edit"
  },
  {
    slug: "redact-pdf",
    name: "Redact PDF",
    description: "Permanently remove sensitive content from pages.",
    category: "Security",
    ready: false,
    icon: "security"
  },
  {
    slug: "crop-pdf",
    name: "Crop PDF",
    description: "Trim margins and focus on the content that matters.",
    category: "Edit",
    ready: true,
    file: "tool-crop.html",
    icon: "edit"
  },
  {
    slug: "pdf-forms",
    name: "PDF Forms",
    description: "Fill, flatten and manage interactive PDF forms.",
    category: "Edit",
    ready: false,
    icon: "edit"
  },
  {
    slug: "ai-summarizer",
    name: "AI Summarizer",
    description: "Create a concise summary of a long PDF.",
    category: "Edit",
    ready: false,
    icon: "edit"
  },
  {
    slug: "translate-pdf",
    name: "Translate PDF",
    description: "Translate PDF text into another language.",
    category: "Edit",
    ready: false,
    icon: "edit"
  },
  {
    slug: "pdf-to-markdown",
    name: "PDF to Markdown",
    description: "Convert PDF text into clean Markdown.",
    category: "Convert",
    ready: false,
    icon: "convert"
  }
];
