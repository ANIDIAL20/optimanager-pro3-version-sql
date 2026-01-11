export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // The AppShell component already provides the sidebar and layout
    // So this layout just passes through the children
    return <>{children}</>;
}
