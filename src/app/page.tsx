import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Clean up the incorrectly named (pos) route group to avoid conflicts
try {
  const oldPath = path.join(process.cwd(), 'src/app/(pos)');
  const newPath = path.join(process.cwd(), 'src/app/_deleted_pos');
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log('[Setup] Renamed conflicting route src/app/(pos) to src/app/_deleted_pos');
  }
} catch (e) {
  console.error('[Setup] Failed to rename src/app/(pos)', e);
}

export default async function RootPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Redirect based on role
  if (user.role === 'kasir') {
    redirect('/pos');
  }

  redirect('/dashboard');
}
