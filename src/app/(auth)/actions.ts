'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db, audit } from '@/lib/db';
import { createSession, destroySession, hashPassword, verifyPassword } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  next: z.string().optional(),
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your full name'),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    phone: z.string().trim().min(7, 'Enter a valid phone number').max(20),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export type FormState = { error?: string; values?: Record<string, string> };

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values: { email: String(formData.get('email') ?? '') } };
  }
  const { email, password, next } = parsed.data;

  const user = db
    .prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = ?')
    .get(email) as { id: number; name: string; email: string; role: 'admin' | 'intern'; password_hash: string } | undefined;

  // Same message for unknown email and wrong password: don't leak which accounts exist.
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: 'Incorrect email or password.', values: { email } };
  }

  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
  audit(user.id, 'auth.login', 'user', user.id);

  const dest = next && next.startsWith('/') ? next : user.role === 'admin' ? '/admin' : '/dashboard';
  redirect(dest);
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
      values: { name: raw.name ?? '', email: raw.email ?? '', phone: raw.phone ?? '' },
    };
  }
  const { name, email, phone, password } = parsed.data;

  const clash = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
  if (clash) {
    return { error: 'An account with this email already exists. Try signing in instead.', values: { name, email, phone } };
  }

  const info = db
    .prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run(name, email, phone, hashPassword(password), 'intern');

  const id = Number(info.lastInsertRowid);
  await createSession({ id, name, email, role: 'intern' });
  audit(id, 'auth.register', 'user', id);

  redirect('/apply?welcome=1');
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/');
}
