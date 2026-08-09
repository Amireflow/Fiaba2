import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8f8fc]">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-[#292541]">
              404 — Page introuvable
            </h1>
          </div>

          <p className="mt-4 text-sm text-[#77738a]">
            La page que vous cherchez n’existe pas ou a été déplacée.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-[#5b49e8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4e3bd5]"
          >
            Retour à l’accueil
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
