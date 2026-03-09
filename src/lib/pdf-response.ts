type PdfDisposition = "attachment" | "inline";

export const PDF_NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Access-Control-Expose-Headers": "Content-Disposition",
} as const;

export function buildPdfHeaders(
  safeFilename: string,
  disposition: PdfDisposition = "attachment"
) {
  const encodedFilename = encodeURIComponent(safeFilename);

  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
    ...PDF_NO_CACHE_HEADERS,
  };
}
