import { SignIn } from '@clerk/clerk-react';
import { Link, useSearchParams } from 'wouter';

export function SignInPage() {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agency Portal</h1>
          <p className="text-gray-600 mt-2">Sign in to access your workspace</p>
        </div>
        <SignIn 
          signUpUrl="/sign-up"
          afterSignInUrl={redirectUrl}
          redirectUrl={redirectUrl}
        />
        <div className="text-center mt-6">
          <Link href="/sign-up" className="text-blue-600 hover:text-blue-700">
            Don't have an account? Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
