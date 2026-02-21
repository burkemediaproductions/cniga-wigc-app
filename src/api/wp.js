// src/api/wp.js (React Native safe)
import he from "he";
import {
  WP_BASE_URL,
  SPONSOR_GROUPS,
  SPONSOR_TYPES,
  EVENT_CPT_SLUG,
  EVENT_TYPES,
} from "../config";

function decodeHtmlEntities(str = "") {
  if (!str) return "";
  return he.decode(str);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} for ${url}`);
  }
  return res.json();
}

/**
 * SPONSORS (Sponsor Groups page)
 */

async function fetchSponsorshipGroupPost(slug) {
  const url = `${WP_BASE_URL}/wp-json/wp/v2/sponsorships?slug=${encodeURIComponent(slug)}`;
  const items = await fetchJson(url);
  return items[0] || null;
}

async function fetchSingleSponsor({ id, type }) {
  if (!id || !type) return null;
  if (!SPONSOR_TYPES.includes(type)) return null;

  const url = `${WP_BASE_URL}/wp-json/wp/v2/${type}/${id}?_embed=1`;
  const data = await fetchJson(url);

  const media = data._embedded?.["wp:featuredmedia"]?.[0];
  const featuredLogo =
    media?.source_url ||
    media?.media_details?.sizes?.medium?.source_url ||
    media?.media_details?.sizes?.thumbnail?.source_url ||
    null;

  const acfLogo = data.acf?.image?.url || null;

  return {
    id: data.id,
    type,
    name: decodeHtmlEntities(data.title?.rendered || ""),
    logoUrl: featuredLogo || acfLogo,
    website: data.acf?.website || data.website || null,
  };
}

function normalizeRelItem(raw) {
  // ACF relationship items often come as objects with ID + post_type
  if (raw && typeof raw === "object") {
    return { id: raw.ID || raw.id, type: raw.post_type };
  }
  // Or sometimes just numeric IDs (no type)
  if (typeof raw === "number") return { id: raw, type: null };
  return null;
}

// Public: get groups like [{ label, sponsors: [...] }, ...]
export async function fetchSponsorGroups() {
  const groups = [];

  for (const group of SPONSOR_GROUPS) {
    let post;
    try {
      post = await fetchSponsorshipGroupPost(group.slug);
    } catch {
      continue;
    }

    const rel = post?.acf?.select_sponsors;
    if (!post || !Array.isArray(rel) || !rel.length) continue;

    const normalized = rel
      .map(normalizeRelItem)
      .filter((item) => item && item.id && item.type);

    const sponsors = [];
    for (const item of normalized) {
      try {
        const sponsor = await fetchSingleSponsor(item);
        if (sponsor) sponsors.push(sponsor);
      } catch {}
    }

    if (sponsors.length) groups.push({ label: group.label, sponsors });
  }

  return groups;
}

/**
 * EVENTS / SCHEDULE
 */

async function fetchPresentersByIds(ids) {
  if (!ids || !ids.length) return {};

  const unique = Array.from(new Set(ids));
  const url = `${WP_BASE_URL}/wp-json/wp/v2/presenter?per_page=100&include=${unique.join(",")}`;
  const items = await fetchJson(url);

  const map = {};
  for (const p of items) {
    map[p.id] = {
      id: p.id,
      name: decodeHtmlEntities(p.title?.rendered || ""),
      firstName: p.acf?.first_name || "",
      lastName: p.acf?.last_name || "",
      title: p.acf?.presentertitle || "",
      org: p.acf?.presenterorg || "",
      photo: p.acf?.presenterphoto || null,
      bioHtml: p.acf?.bio || "",
    };
  }
  return map;
}

/**
 * Fetch sponsors for EVENTS (ACF relationship field: sponsors -> mixed CPT types)
 * Supports types in SPONSOR_TYPES, e.g.:
 * tribal_offices, casinos, associate_members
 */
async function fetchSponsorsByRelItems(relItems) {
  if (!Array.isArray(relItems) || relItems.length === 0) return {};

  // only keep rel items that have both id + type and the type is allowed
  const normalized = relItems
    .map(normalizeRelItem)
    .filter((x) => x && x.id && x.type && SPONSOR_TYPES.includes(x.type));

  if (!normalized.length) return {};

  // group IDs by type so we can do include= for each endpoint
  const byType = new Map();
  for (const it of normalized) {
    if (!byType.has(it.type)) byType.set(it.type, new Set());
    byType.get(it.type).add(it.id);
  }

  const sponsorMap = {}; // key `${type}:${id}` -> sponsor object

  // fetch each type in batches
  for (const [type, idSet] of byType.entries()) {
    const ids = Array.from(idSet);
    // WP include can be long; 100 is fine here for your volume
    const url = `${WP_BASE_URL}/wp-json/wp/v2/${type}?per_page=100&include=${ids.join(",")}&_embed=1`;
    let items = [];
    try {
      items = await fetchJson(url);
    } catch {
      items = [];
    }

    for (const data of items) {
      const media = data._embedded?.["wp:featuredmedia"]?.[0];
      const featuredLogo =
        media?.source_url ||
        media?.media_details?.sizes?.medium?.source_url ||
        media?.media_details?.sizes?.thumbnail?.source_url ||
        null;

      const acfLogo = data.acf?.image?.url || null;

      sponsorMap[`${type}:${data.id}`] = {
        id: data.id,
        type,
        name: decodeHtmlEntities(data.title?.rendered || ""),
        logoUrl: featuredLogo || acfLogo,
        website: data.acf?.website || data.website || null,
      };
    }
  }

  return sponsorMap;
}



// Fetch ALL events once (with embedded featured image + taxonomies)
async function fetchAllEvents() {
  const url = `${WP_BASE_URL}/wp-json/wp/v2/${EVENT_CPT_SLUG}?per_page=100&_embed=1`;
  const items = await fetchJson(url);

  return items.map((item) => {
    const acf = item.acf || {};

    // Featured image for event cover
    const media = item._embedded?.["wp:featuredmedia"]?.[0];
    const coverImageUrl =
      media?.source_url ||
      media?.media_details?.sizes?.large?.source_url ||
      media?.media_details?.sizes?.medium_large?.source_url ||
      media?.media_details?.sizes?.medium?.source_url ||
      null;

    // Date + time from ACF
    const dateLabel = acf["event-date"] || null;
    const startStr = acf["event-time-start"] || null;

    let sortKey = null;
    let dayKey = null;

    if (dateLabel) {
      const cleaned = dateLabel.replace(/^[A-Za-z]+,\s*/, "");
      const dateTimeStr = startStr ? `${cleaned} ${startStr}` : cleaned;
      const d = new Date(dateTimeStr);

      if (!isNaN(d.getTime())) {
        sortKey = d.getTime();
        dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      }
    }

    // Taxonomy terms: event type, room, track
    let roomName = null;
    let trackName = null;
    const kinds = [];

    const termGroups = item._embedded?.["wp:term"] || [];
    for (const group of termGroups) {
      for (const term of group) {
        if (!term || !term.taxonomy) continue;

        if (term.taxonomy === "wigc-event-type") {
          if (term.slug) kinds.push(term.slug);
        }
        if (term.taxonomy === "room" && !roomName) roomName = term.name;
        if (term.taxonomy === "track" && !trackName) trackName = term.name;
      }
    }

    if (!trackName && acf.track) trackName = acf.track;

	 // presenters (ACF relationship fields) - handle ids safely
	const speakerIds = (Array.isArray(acf.speakers) ? acf.speakers : [acf.speakers])
	  .flat()
	  .map((v) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : v?.ID || v?.id))
	  .filter((n) => Number.isFinite(n) && n > 0);

	const moderatorId = (() => {
	  const v = acf.moderator;
	  const first = Array.isArray(v) ? v[0] : v;
	  const id = typeof first === "number" ? first : typeof first === "string" ? Number(first) : first?.ID || first?.id;
	  return Number.isFinite(id) && id > 0 ? id : null;
	})();

    // ✅ Event sponsors relationship field (key field_67ba129145ef0)
    // ACF often returns objects with ID + post_type
    const sponsorRel = Array.isArray(acf.sponsors) ? acf.sponsors : [];

    const rawDescription =
      acf["session-description"] ||
      acf.session_description ||
      acf.event_description ||
      acf["event-description"] ||
      item.content?.rendered ||
      "";

    const descriptionHtml = decodeHtmlEntities(rawDescription);

    return {
      id: item.id,
      title: decodeHtmlEntities(item.title?.rendered || ""),
      date: dateLabel,
      startTime: acf["event-time-start"] || null,
      endTime: acf["event-time-end"] || null,
      room: roomName,
      track: trackName,
      speakerIds,
      moderatorId,
      sponsorRel, // <— we attach real sponsor objects later
      description: descriptionHtml,
      contentHtml: descriptionHtml,
      sortKey,
      dayKey,
      kinds,
      coverImageUrl, // ✅ used by EventDetailScreen
    };
  });
}

// Public: fetch schedule and split into sessions / socials / all
export async function fetchScheduleData() {
  const rawEvents = await fetchAllEvents();

  // Gather presenter IDs
  const presenterIdSet = new Set();
  for (const ev of rawEvents) {
    (ev.speakerIds || []).forEach((id) => presenterIdSet.add(id));
    if (ev.moderatorId) presenterIdSet.add(ev.moderatorId);
  }

  const presenters =
    presenterIdSet.size > 0
      ? await fetchPresentersByIds(Array.from(presenterIdSet))
      : {};

  // Gather sponsor rel items across all events
  const sponsorRelAll = [];
  for (const ev of rawEvents) {
    if (Array.isArray(ev.sponsorRel)) sponsorRelAll.push(...ev.sponsorRel);
  }

  const sponsorMap =
    sponsorRelAll.length > 0 ? await fetchSponsorsByRelItems(sponsorRelAll) : {};

  const attachPeopleAndSponsors = (ev) => {
    const sponsors = (ev.sponsorRel || [])
      .map(normalizeRelItem)
      .filter((x) => x && x.id && x.type)
      .map((x) => sponsorMap[`${x.type}:${x.id}`])
      .filter(Boolean);

    return {
      ...ev,
      speakers: (ev.speakerIds || []).map((id) => presenters[id]).filter(Boolean),
      moderator: ev.moderatorId ? presenters[ev.moderatorId] || null : null,
      sponsors, // ✅ NOW EventDetailScreen will have real sponsor objects
    };
  };

  const allWithPeople = rawEvents.map(attachPeopleAndSponsors);

  const sortedAll = [...allWithPeople].sort((a, b) => {
    if (!a.sortKey) return 1;
    if (!b.sortKey) return -1;
    return a.sortKey - b.sortKey;
  });

  const sessions = sortedAll.filter((ev) => ev.kinds?.includes(EVENT_TYPES.sessions));
  const socials = sortedAll.filter((ev) => ev.kinds?.includes(EVENT_TYPES.socials));

  return { sessions, socials, allEvents: sortedAll };
}

// Public: fetch all presenters with full profile info
export async function fetchPresentersList() {
  const url = `${WP_BASE_URL}/wp-json/wp/v2/presenter?per_page=100`;
  const items = await fetchJson(url);

  return items.map((p) => {
    const acf = p.acf || {};
    return {
      id: p.id,
      name: decodeHtmlEntities(p.title?.rendered || ""),
      firstName: acf.first_name || "",
      lastName: acf.last_name || "",
      title: acf.presentertitle || "",
      org: acf.presenterorg || "",
      bioHtml: acf.bio || "",
      photo: acf.presenterphoto || null,
      sessionsSpeaker: Array.isArray(acf.sessions_speaker) ? acf.sessions_speaker : [],
    };
  });
}

function getFeaturedImageUrlFromEmbedded(post) {
  const fm = post?._embedded?.["wp:featuredmedia"]?.[0];
  return fm?.source_url || fm?.media_details?.sizes?.full?.source_url || null;
}

function normalizeSponsor(post) {
  return {
    id: post?.id,
    title: post?.title?.rendered || post?.title || post?.name || "",
    website: post?.acf?.website || post?.website || "",
    logoUrl: getFeaturedImageUrlFromEmbedded(post),
    raw: post,
  };
}

async function fetchCptByInclude(endpoint, ids, signal) {
  if (!ids?.length) return [];
  const include = ids.join(",");
  // per_page max is typically 100; include list can be large but usually ok for event sponsors
  const url = `${WP_BASE_URL}/wp-json/wp/v2/${endpoint}?include=${include}&per_page=100&_embed=1`;

  const r = await fetch(url, { signal });
  if (!r.ok) return [];
  const data = await r.json();
  if (!Array.isArray(data)) return [];
  return data;
}

/**
 * Event sponsors relationship can point to multiple CPTs:
 * - tribal_offices
 * - casinos
 * - associate_members
 *
 * We don't know which ID belongs to which CPT, so we query all 3 and merge results.
 */
export async function fetchEventSponsorsByIds(ids, { signal } = {}) {
  const cleanIds = (ids || [])
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!cleanIds.length) return [];

  const [tribal, casinos, associates] = await Promise.all([
    fetchCptByInclude("tribal_offices", cleanIds, signal),
    fetchCptByInclude("casinos", cleanIds, signal),
    fetchCptByInclude("associate_members", cleanIds, signal),
  ]);

  // Merge + de-dupe by id
  const map = new Map();
  [...tribal, ...casinos, ...associates].forEach((p) => {
    if (p?.id) map.set(p.id, p);
  });

  // Keep original event order (IDs order)
  const ordered = cleanIds
    .map((id) => map.get(id))
    .filter(Boolean)
    .map(normalizeSponsor);

  return ordered;
}