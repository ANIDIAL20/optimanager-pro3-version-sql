import { ErrorBoundary } from '@/components/error-boundary';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ErrorBoundary>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                {children}
            </div>
        </ErrorBoundary>
    );
}
