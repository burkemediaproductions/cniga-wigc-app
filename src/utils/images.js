// event.acf.event_image is sometimes "" — use featured image if present, otherwise fallback
export function getEventImageUrl(event) {
  if (!event) return '';
  const acfUrl = event?.acf?.event_image;
  if (typeof acfUrl === 'string' && acfUrl.trim()) return acfUrl.trim();

  const featured = event?._embedded?.['wp:featuredmedia']?.[0];
  const featuredUrl = featured?.source_url || featured?.media_details?.sizes?.large?.source_url;
  if (featuredUrl) return featuredUrl;

  return '';
}

export function getPresenterPhotoUrl(presenter) {
  if (!presenter) return '';
  const acfPhoto = presenter?.acf?.presenterphoto;
  if (typeof acfPhoto === 'string' && acfPhoto.trim()) return acfPhoto.trim();

  // Some builds used a boolean + upload field; if you later expose an URL there, this will pick it up
  const upload = presenter?.acf?.presenter_photo_upload;
  if (typeof upload === 'string' && upload.trim()) return upload.trim();

  const featured = presenter?._embedded?.['wp:featuredmedia']?.[0];
  const featuredUrl = featured?.source_url || featured?.media_details?.sizes?.medium?.source_url;
  if (featuredUrl) return featuredUrl;

  return '';
}

export function initialForName(name = '') {
  const cleaned = (name || '').trim();
  return cleaned ? cleaned[0].toUpperCase() : '?';
}
