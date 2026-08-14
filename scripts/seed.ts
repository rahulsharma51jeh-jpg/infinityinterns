/**
 * Seeds the portal with an admin account, sample programs, applications and one
 * already-issued certificate so the verify flow is demoable immediately.
 *
 *   npm run seed          # additive, safe to re-run
 *   npm run seed -- --reset
 */
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { db, setSetting, getSetting } from '../src/lib/db';
import { DEFAULT_TEMPLATE } from '../src/lib/template';
import { issueCertificate } from '../src/lib/certificate';

const reset = process.argv.includes('--reset');

if (reset) {
  console.log('• resetting tables');
  db.exec(`
    DELETE FROM verification_log; DELETE FROM audit_log; DELETE FROM certificates;
    DELETE FROM applications;     DELETE FROM templates;  DELETE FROM programs;
    DELETE FROM users;            DELETE FROM settings;
  `);
}

/* ---------------- settings ---------------- */
if (!getSetting('cert_seq')) setSetting('cert_seq', '1000');
if (!getSetting('site_url')) setSetting('site_url', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
setSetting('org_name', 'Infinity Interns');
setSetting('org_tagline', 'A unit of Infinity1 Career Counselling Private Limited');
setSetting('support_email', 'info@infinityinterns.com');
setSetting('auto_issue_on_approval', getSetting('auto_issue_on_approval', '1'));

/* ---------------- users ---------------- */
const upsertUser = db.prepare(`
  INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role
  RETURNING id
`);

const hash = (p: string) => bcrypt.hashSync(p, 10);

const adminId = (
  upsertUser.get('Rahul Kumar', 'admin@infinityinterns.com', '9000000001', hash('Admin@12345'), 'admin') as {
    id: number;
  }
).id;

const interns = [
  { name: 'Mausam Kumari', email: 'mausam@example.com', phone: '9000000010', gender: 'female', salutation: 'Ms.', college: 'Government Polytechnic Barh', course: 'Mechanical Engineering' },
  { name: 'Aditya Raj', email: 'aditya@example.com', phone: '9000000011', gender: 'male', salutation: 'Mr.', college: 'NIT Patna', course: 'Computer Science' },
  { name: 'Sneha Verma', email: 'sneha@example.com', phone: '9000000012', gender: 'female', salutation: 'Ms.', college: 'BIT Mesra', course: 'Electronics' },
  { name: 'Rohit Sharma', email: 'rohit@example.com', phone: '9000000013', gender: 'male', salutation: 'Mr.', college: 'Government Polytechnic Gaya', course: 'Civil Engineering' },
];

const internIds = interns.map(
  (i) => (upsertUser.get(i.name, i.email, i.phone, hash('Intern@12345'), 'intern') as { id: number }).id,
);

/* ---------------- programs ---------------- */
const programs = [
  { title: 'AutoCAD', slug: 'autocad', summary: 'Industry-standard 2D drafting and 3D modelling for mechanical and civil design.', skills: ['2D Drafting', 'Isometric Views', '3D Modelling', 'Layouts & Plotting'], duration: '4 Weeks' },
  { title: 'Web Development', slug: 'web-development', summary: 'Build and deploy responsive full-stack applications with modern tooling.', skills: ['HTML & CSS', 'JavaScript', 'React', 'REST APIs'], duration: '6 Weeks' },
  { title: 'Data Science with Python', slug: 'data-science-python', summary: 'From pandas wrangling to model evaluation on real datasets.', skills: ['Python', 'Pandas', 'Matplotlib', 'scikit-learn'], duration: '8 Weeks' },
  { title: 'Machine Learning', slug: 'machine-learning', summary: 'Supervised and unsupervised learning with hands-on capstone project.', skills: ['Regression', 'Classification', 'Clustering', 'Model Tuning'], duration: '8 Weeks' },
  { title: 'Java Programming', slug: 'java-programming', summary: 'Core Java, OOP design and JDBC-backed console applications.', skills: ['OOP', 'Collections', 'Exception Handling', 'JDBC'], duration: '6 Weeks' },
  { title: 'Cyber Security', slug: 'cyber-security', summary: 'Practical defensive security: hardening, auditing and incident basics.', skills: ['Networking', 'Linux', 'OWASP Top 10', 'Auditing'], duration: '4 Weeks' },
  { title: 'Civil Engineering (STAAD Pro)', slug: 'staad-pro', summary: 'Structural analysis and design workflows used on live site projects.', skills: ['Load Cases', 'Steel Design', 'RCC Design', 'Reports'], duration: '4 Weeks' },
  { title: 'Digital Marketing', slug: 'digital-marketing', summary: 'SEO, campaign analytics and content strategy fundamentals.', skills: ['SEO', 'Google Analytics', 'Social Media', 'Copywriting'], duration: '4 Weeks' },
];

const insProgram = db.prepare(`
  INSERT INTO programs (title, slug, summary, description, duration, mode, skills) VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(slug) DO UPDATE SET title = excluded.title, summary = excluded.summary,
    duration = excluded.duration, skills = excluded.skills
  RETURNING id
`);

const programIds: Record<string, number> = {};
for (const p of programs) {
  const row = insProgram.get(
    p.title,
    p.slug,
    p.summary,
    `${p.summary} Delivered as a mentor-guided ${p.duration.toLowerCase()} online internship with weekly assignments, a graded capstone project and a verifiable completion certificate.`,
    p.duration,
    'Online',
    JSON.stringify(p.skills),
  ) as { id: number };
  programIds[p.slug] = row.id;
}

/* ---------------- default template ---------------- */
const haveTpl = db.prepare('SELECT COUNT(*) c FROM templates').get() as { c: number };
if (haveTpl.c === 0) {
  db.prepare('INSERT INTO templates (name, config, is_default) VALUES (?, ?, 1)').run(
    'Infinity Interns — Completion (Official)',
    JSON.stringify(DEFAULT_TEMPLATE),
  );

  // a second, visually different template to prove the designer is data-driven
  const alt = structuredClone(DEFAULT_TEMPLATE);
  alt.frame = { ...alt.frame, style: 'double-line', colorB: '#12306b', colorAccent: '#2f6fc4' };
  alt.title = { ...alt.title, color: '#12306b', subtitle: 'OF INTERNSHIP TRAINING' };
  alt.qr = { ...alt.qr, position: 'bottom-right', color: '#12306b' };
  alt.watermark = { ...alt.watermark, enabled: true, text: 'INFINITY INTERNS', opacity: 0.05 };
  db.prepare('INSERT INTO templates (name, config, is_default) VALUES (?, ?, 0)').run(
    'Infinity Interns — Minimal Blue',
    JSON.stringify(alt),
  );
  console.log('• created 2 certificate templates');
}

/* ---------------- applications ---------------- */
const insApp = db.prepare(`
  INSERT INTO applications
    (user_id, program_id, full_name, salutation, gender, college, course, email, phone,
     duration, mode, domain, start_date, end_date, attendance, marks, project_title, mentor_name, status)
  VALUES (@user_id, @program_id, @full_name, @salutation, @gender, @college, @course, @email, @phone,
     @duration, @mode, @domain, @start_date, @end_date, @attendance, @marks, @project_title, @mentor_name, @status)
  RETURNING id
`);

const alreadySeeded = (db.prepare('SELECT COUNT(*) c FROM applications').get() as { c: number }).c > 0;
let firstApprovedId: number | null = null;

if (!alreadySeeded) {
  const rows = [
    { i: 0, slug: 'autocad', domain: 'AutoCAD', duration: '4 Weeks', start: '2026-06-02', end: '2026-06-29', att: 88, marks: 93, status: 'approved', project: 'Isometric Assembly Drawing Set', mentor: 'Er. Vikash Singh' },
    { i: 1, slug: 'web-development', domain: 'Web Development', duration: '6 Weeks', start: '2026-05-04', end: '2026-06-14', att: 95, marks: 89, status: 'approved', project: 'Placement Portal (MERN)', mentor: 'Ankit Raj' },
    { i: 2, slug: 'data-science-python', domain: 'Data Science with Python', duration: '8 Weeks', start: '2026-06-01', end: '2026-07-26', att: 91, marks: 84, status: 'pending', project: 'Crop Yield Prediction', mentor: 'Dr. Meera Nair' },
    { i: 3, slug: 'staad-pro', domain: 'Civil Engineering (STAAD Pro)', duration: '4 Weeks', start: '2026-07-06', end: '2026-08-02', att: 78, marks: 71, status: 'under_review', project: 'G+3 Residential Frame', mentor: 'Er. Nidhi Kumari' },
  ];

  for (const r of rows) {
    const p = interns[r.i];
    const res = insApp.get({
      user_id: internIds[r.i],
      program_id: programIds[r.slug],
      full_name: p.name,
      salutation: p.salutation,
      gender: p.gender,
      college: p.college,
      course: p.course,
      email: p.email,
      phone: p.phone,
      duration: r.duration,
      mode: 'Online',
      domain: r.domain,
      start_date: r.start,
      end_date: r.end,
      attendance: r.att,
      marks: r.marks,
      project_title: r.project,
      mentor_name: r.mentor,
      status: r.status,
    }) as { id: number };

    if (r.status === 'approved') {
      db.prepare("UPDATE applications SET reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?").run(adminId, res.id);
      if (firstApprovedId === null) firstApprovedId = res.id;
    }
  }
  console.log(`• created ${rows.length} applications`);
}

/* ---------------- issue certificates for approved apps ---------------- */
const baseUrl = getSetting('site_url', 'http://localhost:3000');

const approved = db.prepare("SELECT id FROM applications WHERE status = 'approved'").all() as { id: number }[];
for (const a of approved) {
  const { certificate, created } = issueCertificate({ applicationId: a.id, actorId: adminId, baseUrl });
  if (created) console.log(`• issued certificate ${certificate.cert_no} (application #${a.id})`);
}

/* ---------------- done ---------------- */
const counts = db
  .prepare(
    `SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM programs) programs,
            (SELECT COUNT(*) FROM applications) applications, (SELECT COUNT(*) FROM certificates) certificates,
            (SELECT COUNT(*) FROM templates) templates`,
  )
  .get();

console.log('\nSeed complete:', counts);
console.log('\n  Admin  → admin@infinityinterns.com / Admin@12345');
console.log('  Intern → mausam@example.com / Intern@12345\n');

const sample = db.prepare('SELECT cert_no FROM certificates ORDER BY id LIMIT 1').get() as { cert_no: string } | undefined;
if (sample) console.log(`  Try verifying: ${baseUrl}/verify/${sample.cert_no}\n`);

// keep a copy of the default config on disk for reference/versioning
fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
