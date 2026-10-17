// Drive "uc?export=view" links force a download in most browsers.
// Convert them (and other Drive links) to the in-browser viewer link.
export function toViewUrl(url) {
  if (!url) return url;
  const m = url.match(/drive\.google\.com\/(?:uc|open)\?[^#]*\bid=([\w-]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/view` : url;
}
