"use client";

function extractFileName(
  disposition: string | null,
  fallback: string
): string {
  if (!disposition) return fallback;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;\n]+)/i);
  if (utf8Match) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = disposition.match(/filename="?([^";\n]+)"?/i);
  if (asciiMatch) {
    return asciiMatch[1].trim();
  }

  return fallback;
}

async function fetchPdfAsset(url: string, fallbackFilename: string) {
  const requestUrl = new URL(url, window.location.origin);
  requestUrl.searchParams.set('latest', 'true');
  requestUrl.searchParams.set('_', Date.now().toString());

  const response = await fetch(requestUrl.toString(), {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "No error body");
    console.error(`❌ PDF API Failed: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Download failed: ${response.status} - ${errorText}`);
  }

  const disposition = response.headers.get('Content-Disposition');
  console.log('[download-pdf] Content-Disposition:', disposition);
  console.log('[download-pdf] All headers:', [...response.headers.entries()]);

  const blob = await response.blob();
  const filename = extractFileName(disposition, fallbackFilename);

  return { blob, filename };
}

export async function downloadPdfFromApi(
  url: string,
  fallbackFilename: string
) {
  const { blob, filename } = await fetchPdfAsset(url, fallbackFilename);
  const objectUrl = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    window.URL.revokeObjectURL(objectUrl);
    document.body.removeChild(link);
  }
}

export async function sharePdfFromApi(
  url: string,
  fallbackFilename: string
) {
  const { blob, filename } = await fetchPdfAsset(url, fallbackFilename);
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: filename,
      files: [file],
    });
    return true;
  }

  return false;
}