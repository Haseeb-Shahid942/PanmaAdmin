// TEMPORARY: database connection check. Requires admin login. Delete after use.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth-server';
import mysqlPool from '@/lib/mysql';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  const host = process.env.DB_HOST || '';
  const info = {
    hasHost: !!host,
    hostIsOldServer: host.startsWith('92.205.'),
    port: process.env.DB_PORT || null,
    hasUser: !!process.env.DB_USER,
    hasPassword: !!process.env.DB_PASSWORD,
    dbNameLength: (process.env.DB_NAME || '').length,
  };

  try {
    const [[t]] = await mysqlPool.query('SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE()');
    let blogsCount = null;
    try {
      const [[b]] = await mysqlPool.query('SELECT COUNT(*) AS n FROM blogs');
      blogsCount = b.n;
    } catch {}
    return NextResponse.json({ ok: true, info, tables: t.n, blogsCount });
  } catch (e) {
    return NextResponse.json({ ok: false, info, errorCode: e.code || null, errorMessage: e.message });
  }
}
