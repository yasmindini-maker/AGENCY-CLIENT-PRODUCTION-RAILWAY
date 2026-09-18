import { SignUp } from '@clerk/clerk-react';
import { Link } from 'wouter';

export function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agency Portal</h1>
          <p className="text-gray-600 mt-2">Create your account</p>
        </div>
        <SignUp 
          signInUrl="/sign-in"
          afterSignUpUrl="/"
          redirectUrl="/"
        />
        <div className="text-center mt-6">
          <Link href="/sign-in" className="text-blue-600 hover:text-blue-700">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
