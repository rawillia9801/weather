const DRIVE_IN_URL = 'https://parkplacedrivein.com/';
const MARION_EVENTS_URL = 'https://www.marionva.org/community-economic-development/events/8746';

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'StaleyStreetWeather/1.0 (+https://staleyclimate.info)'
      }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } catch (error) {
    return '';
  }
}

function decodeEntities(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '-')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function htmlToLines(html = '') {
  return decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function usefulLines(lines = [], terms = []) {
  const seen = new Set();
  return lines
    .filter((line) => line.length > 4 && line.length < 180)
    .filter((line) => !/cookie|privacy|subscribe|facebook|instagram|copyright|skip to/i.test(line))
    .filter((line) => !terms.length || terms.some((term) => line.toLowerCase().includes(term)))
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function formatDriveIn(lines = []) {
  const hits = usefulLines(lines, ['show', 'movie', 'pm', 'drive', 'screen', 'playing', 'fri', 'sat', 'sun']);
  if (!hits.length) {
    return `Park Place Drive-In source checked, but no showtime text could be confidently extracted. Check ${DRIVE_IN_URL}`;
  }
  return hits.map((line) => `- ${line}`).join('\n') + `\nSource: ${DRIVE_IN_URL}`;
}

function formatMarionEvents(lines = []) {
  const hits = usefulLines(lines, ['festival', 'parade', 'event', 'market', 'concert', 'music', 'downtown', 'marion', 'community']);
  if (!hits.length) {
    return `Marion events source checked, but no parade/festival text could be confidently extracted. Check ${MARION_EVENTS_URL}`;
  }
  return hits.map((line) => `- ${line}`).join('\n') + `\nSource: ${MARION_EVENTS_URL}`;
}

function estimateWater(data) {
  const current = Number(data?.current?.temperature);
  const low = Number(data?.low ?? data?.current?.low ?? data?.current?.temperature);
  const high = Number(data?.high ?? data?.current?.high ?? data?.current?.temperature);
  const humidity = Number(data?.current?.humidity || 0);
  const rain = Number(data?.forecast?.[0]?.precipitationAmount || 0);
  const base = Number.isFinite(current) && Number.isFinite(low) && Number.isFinite(high)
    ? Math.round((current * 0.35) + (low * 0.35) + (high * 0.30) - 5)
    : null;

  if (base == null) return null;
  const adjusted = Math.max(36, Math.min(86, base + (humidity > 85 ? -1 : 0) + (rain > 0.25 ? -1 : 0)));
  return {
    waterTemp: `${adjusted}F estimated`,
    measuredOrEstimatedNote: 'Estimated from Marion station/public forecast temperatures; no direct Hungry Mother Lake water-temperature sensor is configured.',
    surface: Number(data?.current?.windGust || 0) >= 18 ? 'Choppy' : Number(data?.current?.windSpeed || 0) >= 8 ? 'Light ripple' : 'Calm',
    clarityNote: rain > 0.4 ? 'Recent or expected rain may reduce clarity near inflows.' : 'No major rain impact indicated from the current forecast.'
  };
}

function buildTimeWarpStory(data, external) {
  const current = data.current || {};
  const today = data.forecast?.[0] || {};
  const condition = String(current.condition || today.condition || 'weather').toLowerCase();
  const temp = current.temperature ?? 'unavailable';
  const feels = current.feelsLike ?? 'unavailable';
  const high = data.high ?? today.high ?? current.high ?? 'unavailable';
  const low = data.low ?? today.low ?? current.low ?? 'unavailable';
  const rainChance = today.precipitationChance ?? 0;
  const rainAmount = Number(today.precipitationAmount || 0);
  const uvPeak = current.uvPeak ? ` UV is ${current.uvIndex} now and should peak near ${current.uvPeak}${current.uvPeakTime && current.uvPeakTime !== 'Unavailable' ? ` around ${current.uvPeakTime}` : ''}.` : ` UV is currently ${current.uvIndex ?? 'unavailable'}.`;
  const precipLine = rainChance > 15 || rainAmount > 0
    ? `The next weather beat carries a ${rainChance}% precipitation signal with about ${rainAmount.toFixed(2)} inches showing from the active forecast source; exact start and slack-off times are only shown when the hourly source provides them.`
    : 'The timeline is mostly dry, with no meaningful rain or snow showing for today.';
  const aqi = data.airQuality?.aqi == null ? 'Air quality is unavailable from the current source.' : `Air quality is ${data.airQuality.label} with an AQI of ${data.airQuality.aqi}.`;
  const sunset = data.sunMoon?.sunset || 'unavailable';

  return [
    `Step into the Staley Street morning snapshot: right now in ${data.location}, the clock has landed on ${data.updatedTime}, the temperature is ${temp}F, and the scene outside reads ${condition}. It feels like ${feels}F.`,
    `Through the rest of today, the forecast arc climbs toward ${high}F and then folds back toward ${low}F tonight. Winds are ${current.windDirection} at ${current.windSpeed} mph with gusts near ${current.windGust} mph, while pressure sits at ${current.pressure} inHg.`,
    `${precipLine} Sunset closes the day at ${sunset}.${uvPeak} ${aqi}`,
    `Hungry Mother watch: ${external.waterCondition.waterTemp}. ${external.waterCondition.measuredOrEstimatedNote}`,
    `Local watch is included below for the Drive-In, Marion events, festivals, parades, and sky notes so the brief reads like a useful day-planning dispatch rather than a bare weather dump.`
  ].join(' ');
}

export async function loadExternalBriefSources(data) {
  const [driveHtml, marionHtml] = await Promise.all([
    fetchText(DRIVE_IN_URL),
    fetchText(MARION_EVENTS_URL)
  ]);
  const driveLines = htmlToLines(driveHtml);
  const marionLines = htmlToLines(marionHtml);
  const waterCondition = estimateWater(data) || data.waterCondition || {
    waterTemp: 'Unavailable',
    measuredOrEstimatedNote: 'No lake water-temperature estimate could be calculated from the current weather payload.',
    surface: 'Unavailable',
    clarityNote: 'Unavailable'
  };

  const external = {
    driveInText: formatDriveIn(driveLines),
    festivalText: formatMarionEvents(marionLines),
    happeningTodayText: formatMarionEvents(marionLines),
    localEventsText: formatMarionEvents(marionLines),
    waterCondition
  };

  return {
    ...external,
    dailyStory: buildTimeWarpStory({ ...data, waterCondition }, external)
  };
}

export function applyExternalBriefSources(data, external) {
  return {
    ...data,
    dailyStory: external.dailyStory || data.dailyStory,
    driveInText: external.driveInText || data.driveInText,
    festivalText: external.festivalText || data.festivalText,
    happeningTodayText: external.happeningTodayText || data.happeningTodayText,
    localEventsText: external.localEventsText || data.localEventsText,
    waterCondition: external.waterCondition || data.waterCondition
  };
}
