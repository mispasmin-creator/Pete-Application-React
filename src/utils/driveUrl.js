// Drive "uc?export=view" links force a download in most browsers.
// Convert them (and other Drive links) to the in-browser viewer link.
export function toViewUrl(url) {
  if (!url) return url;

  const normalizedUrl = url.trim();
  const idLink = normalizedUrl.match(/drive\.google\.com\/(?:uc|open)\?[^#]*\bid=([\w-]+)/i);
  if (idLink) return `https://drive.google.com/file/d/${idLink[1]}/view`;

  // Some legacy sheet rows contain the upload folder URL followed by the
  // uploaded file ID in Drive's `lfhs` value, for example `?lfhs=2<fileId>`.
  // Keep a normal folder URL (`?lfhs=2`) unchanged, but open the recoverable
  // file directly when the appended ID is present.
  const legacyFolderLink = normalizedUrl.match(
    /drive\.google\.com\/drive\/folders\/[\w-]+\?[^#]*\blfhs=2([\w-]{20,})(?:[&#]|$)/i,
  );
  if (legacyFolderLink) {
    return `https://drive.google.com/file/d/${legacyFolderLink[1]}/view`;
  }

  return normalizedUrl;
}
