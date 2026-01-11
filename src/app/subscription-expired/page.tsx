import Link from "next/link";
import { AlertCircle, Mail, MessageCircle } from "lucide-react";

export default function SubscriptionExpiredPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0000] p-4 text-center text-white selection:bg-red-500/30">

            {/* Icon */}
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10 shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]">
                <AlertCircle size={48} className="text-red-500" />
            </div>

            {/* Content */}
            <h1 className="mb-3 text-4xl font-bold tracking-tight">Access Restricted</h1>
            <p className="mx-auto mb-8 max-w-md text-lg text-gray-400">
                Your subscription plan has expired. Please upgrade your plan or contact support to restore access to your workspace.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                    href="mailto:support@optimanager.com"
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-medium transition-all hover:bg-white/10"
                >
                    <Mail size={18} />
                    <span>Contact Support</span>
                </Link>
                <Link
                    href="https://wa.me/212600000000" // Replace with real support number
                    target="_blank"
                    className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-medium text-white shadow-lg shadow-green-900/20 transition-all hover:bg-green-500"
                >
                    <MessageCircle size={18} />
                    <span>Renew via WhatsApp</span>
                </Link>
            </div>

            {/* Footnote */}
            <p className="mt-12 text-sm text-gray-600">
                Reason code: SUB_EXP_001
            </p>
        </div>
    );
}
