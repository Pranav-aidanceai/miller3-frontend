import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ModuleShell } from './ModuleShell';

export default async function ModuleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side auth guard: unlike proxy.ts (which Azure SWA skips for
  // statically prerendered routes), this runs on every request to a
  // module route and forces them to render dynamically.
  const token = (await cookies()).get('refresh_token')?.value;
  if (!token) {
    redirect('/');
  }

  return <ModuleShell>{children}</ModuleShell>;
}
