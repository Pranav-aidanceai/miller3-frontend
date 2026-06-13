import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';

// Reading cookies() opts this route out of static prerendering, so it renders
// per-request. This is required on Azure Static Web Apps, where a prerendered
// `/` is served straight from the CDN cache and bypasses the proxy redirect.
export default async function Page() {
  const token = (await cookies()).get('refresh_token')?.value;
  if (token) {
    redirect('/search');
  }
  return <LoginForm />;
}
