/**
 * Turns the on-screen invoice into a real A4 PDF file, in the browser.
 * The libraries are loaded on first use so they don't slow down the rest of the app.
 */
export async function renderPdf(el: HTMLElement, filename: string): Promise<File> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);

  // Always lay the sheet out at desktop width, so a PDF made on a phone looks the same.
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    windowWidth: 1100,
    onclone: (_doc, node) => {
      Object.assign(node.style, {
        width: "794px", maxWidth: "794px", margin: "0", transform: "none",
        borderRadius: "0", boxShadow: "none", border: "none",
      });
    },
  });

  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  // Canvas pixels that fit on one page at full width.
  const pxPerPage = Math.floor((canvas.width * pageH) / pageW);

  for (let y = 0, page = 0; y < canvas.height; y += pxPerPage, page++) {
    const h = Math.min(pxPerPage, canvas.height - y);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = h;
    slice.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (page > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, (h * pageW) / canvas.width);
  }

  return new File([pdf.output("blob")], filename, { type: "application/pdf" });
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** True on phones (and some desktops) that can share a file to WhatsApp, Mail, etc. */
export function canShareFiles() {
  try {
    const probe = new File([""], "x.pdf", { type: "application/pdf" });
    return typeof navigator.share === "function" && !!navigator.canShare?.({ files: [probe] });
  } catch {
    return false;
  }
}
