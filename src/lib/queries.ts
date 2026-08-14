import { db } from './db';

export interface ProgramRow {
  id: number;
  title: string;
  slug: string;
  summary: string;
  description: string;
  duration: string;
  mode: string;
  stipend: string;
  skills: string;
  is_active: number;
}

export function listPrograms(activeOnly = true): (ProgramRow & { skillList: string[] })[] {
  const rows = db
    .prepare(`SELECT * FROM programs ${activeOnly ? 'WHERE is_active = 1' : ''} ORDER BY title`)
    .all() as ProgramRow[];
  return rows.map((r) => ({ ...r, skillList: parseSkills(r.skills) }));
}

export function getProgramBySlug(slug: string): (ProgramRow & { skillList: string[] }) | null {
  const r = db.prepare('SELECT * FROM programs WHERE slug = ?').get(slug) as ProgramRow | undefined;
  return r ? { ...r, skillList: parseSkills(r.skills) } : null;
}

function parseSkills(s: string): string[] {
  try {
    const v = JSON.parse(s || '[]');
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function publicStats() {
  const row = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM certificates WHERE status = 'active')            AS certificates,
         (SELECT COUNT(*) FROM programs WHERE is_active = 1)                    AS programs,
         (SELECT COUNT(DISTINCT user_id) FROM applications)                     AS interns,
         (SELECT COUNT(*) FROM verification_log)                                AS verifications`,
    )
    .get() as { certificates: number; programs: number; interns: number; verifications: number };
  return row;
}
