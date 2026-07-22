import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';

export default async function Page() {
  const token = (await cookies()).get('refresh_token')?.value;
  if (token) {
    redirect('/search');
  }
  return <LoginForm />;
}
