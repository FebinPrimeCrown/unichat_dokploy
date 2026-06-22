// app/webbuilder/page.tsx
import dynamic from 'next/dynamic';
import { extractRolesFromToken } from '@/app/utils/actions';
import { notFound } from 'next/navigation';

const WebBuilderClient = dynamic(() => import('./WebBuilderClient'), { ssr: false });

export default async function WebBuilderPage() {
  const roles = await extractRolesFromToken();

  const canView = roles.includes('ga') || roles.includes('wb_vw');
  const canEdit = roles.includes('ga') || roles.includes('wb_ed');

  if (!canView && !canEdit) {
    return notFound(); // ⛔ User lacks both view and edit access
  }
  return <WebBuilderClient canView={canView} canEdit={canEdit} />;
}
