'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db, audit } from '@/lib/db';
import { requireUser } from '@/lib/auth';

const schema = z.object({
  program_id: z.coerce.number().int().positive('Choose an internship domain'),
  full_name: z.string().trim().min(2, 'Enter your full name as it should appear on the certificate'),
  salutation: z.enum(['Mr.', 'Ms.', 'Mrs.', 'Dr.']),
  gender: z.enum(['male', 'female', 'other']),
  college: z.string().trim().min(2, 'Enter your college or institute name'),
  course: z.string().trim().max(120).optional().default(''),
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(20),
  start_date: z.string().trim().optional().default(''),
  project_title: z.string().trim().max(160).optional().default(''),
});

export type ApplyState = { error?: string; values?: Record<string, string> };

export async function applyAction(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = schema.safeParse(raw);

  if (!parsed.success) return { error: parsed.error.issues[0].message, values: raw };
  const v = parsed.data;

  const program = db.prepare('SELECT id, title, duration, mode FROM programs WHERE id = ? AND is_active = 1').get(v.program_id) as
    | { id: number; title: string; duration: string; mode: string }
    | undefined;
  if (!program) return { error: 'That internship domain is no longer open for applications.', values: raw };

  // One open application per domain keeps the admin queue meaningful.
  const dupe = db
    .prepare("SELECT id FROM applications WHERE user_id = ? AND program_id = ? AND status IN ('pending','under_review','approved')")
    .get(user.id, v.program_id) as { id: number } | undefined;
  if (dupe) {
    return {
      error: `You already have an application in progress for ${program.title}. Check your dashboard for its status.`,
      values: raw,
    };
  }

  const info = db
    .prepare(
      `INSERT INTO applications
         (user_id, program_id, full_name, salutation, gender, college, course, email, phone,
          duration, mode, domain, start_date, project_title, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
    .run(
      user.id,
      program.id,
      v.full_name,
      v.salutation,
      v.gender,
      v.college,
      v.course ?? '',
      user.email,
      v.phone,
      program.duration,
      program.mode,
      program.title,
      v.start_date || null,
      v.project_title ?? '',
    );

  audit(user.id, 'application.create', 'application', Number(info.lastInsertRowid), program.title);
  revalidatePath('/dashboard');
  redirect('/dashboard?applied=1');
}
