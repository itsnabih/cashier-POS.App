import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

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
