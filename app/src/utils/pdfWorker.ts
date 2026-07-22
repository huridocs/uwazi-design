import { pdfjs } from "react-pdf";

/** pdf.js needs its worker configured ONCE, before anything renders a PDF.
 *
 *  This lived in DocumentViewer — fine while the viewer was the only thing that
 *  touched a PDF. The Library never mounts the viewer, so card thumbnails would
 *  have raced on whether that module had been imported at all. Importing this
 *  module is the whole contract: side-effecting, idempotent, one line at each
 *  call site. */
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export {};
