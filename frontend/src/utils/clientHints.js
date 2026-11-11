// Module 6: optional details about this device, sent with login and registration. Chromium browsers can tell the
// phone model and exact system version; an iPad that shows desktop sites looks like a Mac but has a touch screen.
// The server uses these only to ADD restrictions (e.g. recognise a tablet), never to remove them.
const HIGH_ENTROPY = ['model', 'platformVersion', 'fullVersionList'];

export async function collectClientHints(timeoutMs = 300) {
  const hints = {};
  try {
    if (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1) hints.touchMac = true;
    const uaData = navigator.userAgentData;
    if (!uaData) return hints;
    if (uaData.mobile) hints.mobile = true;
    const values = await Promise.race([
      uaData.getHighEntropyValues(HIGH_ENTROPY),
      new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (values?.model) hints.model = values.model;
    if (values?.platformVersion) hints.platformVersion = values.platformVersion;
    if (Array.isArray(values?.fullVersionList)) hints.brands = values.fullVersionList.map((entry) => entry.brand).slice(0, 10);
  } catch {
    // The details are optional: without them the server uses the User-Agent only.
  }
  return hints;
}
