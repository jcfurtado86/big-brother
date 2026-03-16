import { isTableEmpty, getLastUpdate, safeInterval, withRetry } from '../../utils/scheduler.js';
import config from '../../config.js';
import { fetchWindyWebcams } from './windy.js';
import { fetchDotWebcams } from './dot.js';
import { fetchGovWebcams } from './gov.js';
import { fetchOtcmWebcams } from './otcm.js';

function wrapWithRetry(name, fn) {
  return () => withRetry(fn, { label: `webcams:${name}`, maxRetries: 5 });
}

function startPoller(name, fetchFn, pollMs, metaKey) {
  const safeFn = wrapWithRetry(name, fetchFn);
  isTableEmpty('webcams').then(empty => {
    if (empty) {
      safeFn();
    } else {
      getLastUpdate(metaKey).then(last => {
        const age = last ? Date.now() - new Date(last).getTime() : Infinity;
        if (age > pollMs) safeFn();
        else console.log(`[webcams:${name}] Fresh data (${Math.round(age / 3600000)}h old), skipping`);
      });
    }
  });
  safeInterval(safeFn, pollMs);
}

export function startWebcamsPollers() {
  startPoller('windy', fetchWindyWebcams, config.WEBCAMS_WINDY_POLL_MS, 'webcams_windy');
  startPoller('dot', fetchDotWebcams, config.WEBCAMS_DOT_POLL_MS, 'webcams_dot');
  startPoller('gov', fetchGovWebcams, config.WEBCAMS_GOV_POLL_MS, 'webcams_gov');
  startPoller('otcm', fetchOtcmWebcams, config.WEBCAMS_OTCM_POLL_MS, 'webcams_otcm');
}
