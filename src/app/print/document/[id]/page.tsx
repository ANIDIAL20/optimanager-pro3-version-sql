import { db } from '@/db';
import { shopProfiles } from '@/db/schema';
import { getDocumentAction } from '@/app/actions/document-actions';
import { DocumentPDF } from '@/components/documents/document-pdf';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { PrintButton } from '@/components/documents/print-button'; // I will create this

export default async function PrintDocumentPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { success, document, error } = await getDocumentAction(parseInt(params.id));
  
  if (!success || !document) {
      return <div className="p-8 text-red-600">Erreur: {error || 'Document introuvable'}</div>;
  }

  const shopProfile = await db.query.shopProfiles.findFirst({
      where: eq(shopProfiles.userId, session.user.id)
  });

  // Fallback defaults if shop profile missing
  const profile = shopProfile || {
      shopName: 'Mon Opticien',
      address: 'Adresse magasin',
      phone: '0600000000',
      email: session.user.email || '',
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white">
        <PrintButton />
        <DocumentPDF data={document as any} shopProfile={profile as any} />
    </div>
  );
}
