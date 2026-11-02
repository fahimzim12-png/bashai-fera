import { readFileSync } from 'node:fs';
export function loadRouteJson() {
  return JSON.parse(readFileSync(new URL('../data/routes/farmgate-saarc.json', import.meta.url), 'utf8'));
}
