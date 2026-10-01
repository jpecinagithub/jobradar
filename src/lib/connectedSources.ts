/**
 * connectedSources — the registry of REAL sources JOBRADAR can search.
 *
 * JOBRADAR is live-only: there is no demo data anywhere. The source registry
 * that powers the search pipeline (source discovery, source filters, quality
 * scoring) is derived from the sources the user actually connected:
 *
 *  - Live ATS boards (Greenhouse / Ashby) managed in Admin → Sources.
 *  - Private API connectors (user-supplied JSON endpoints, authenticated via
 *    the encrypted vault).
 *
 * SourceDef ids intentionally equal the `source` string stamped on Job
 * records from that connector, so `profile.sources` filters keep working.
 */
import type { SourceDef } from './types';
import { boardUrl, getLiveCompanies, getLiveCacheStatus } from './liveSources';
import { getPrivateSources } from './privateSources';

/** Build the current registry of real, connected sources. */
export function getConnectedSources(): SourceDef[] {
  const defs: SourceDef[] = [];
  const companies = getLiveCompanies();
  const statusById = new Map(getLiveCacheStatus().map((s) => [s.companyId, s]));

  companies.forEach((c, i) => {
    const status = statusById.get(c.id);
    const enabled = c.enabled;
    defs.push({
      id: c.name, // matches Job.source for jobs from this board
      name: c.name,
      domain:
        c.ats === 'greenhouse'
          ? 'boards-api.greenhouse.io'
          : 'api.ashbyhq.com',
      type: 'ATS',
      sector: c.sector,
      method: 'API',
      endpoint: boardUrl(c),
      frequency: 'On every search (6h cache)',
      priority: i + 1,
      enabled,
      status: enabled ? 'ACTIVE' : 'PAUSED',
      lastScan: status?.fetchedAt ?? undefined,
      jobsIndexed: status?.jobCount ?? 0,
      errors: 0,
      notes: status?.error ? `Last fetch error: ${status.error}` : undefined,
    });
  });

  const privateApis = getPrivateSources().filter((s) => s.kind === 'api');
  privateApis.forEach((s, i) => {
    defs.push({
      id: s.name, // matches Job.source for jobs from this connector
      name: s.name,
      domain: (() => {
        try {
          return s.endpoint ? new URL(s.endpoint).host : 'custom';
        } catch {
          return 'custom';
        }
      })(),
      type: 'SPECIALIST_BOARD',
      method: 'API',
      endpoint: s.endpoint,
      frequency: 'On every search',
      priority: companies.length + i + 1,
      enabled: s.enabled,
      status: s.enabled ? 'ACTIVE' : 'PAUSED',
      jobsIndexed: 0,
      errors: 0,
    });
  });

  return defs;
}
