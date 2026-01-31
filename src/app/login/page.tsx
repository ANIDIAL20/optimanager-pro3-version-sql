'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Loader2,
    Mail,
    Lock,
    ShieldCheck,
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Feature data
const features = [
    { id: 'dash', icon: LayoutDashboard, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-500', label: 'Dashboard', description: 'Vue d\'ensemble complète' },
    { id: 'clients', icon: Users, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-500', label: 'Clients', description: 'Gestion des dossiers' },
    { id: 'stock', icon: Package, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-500', label: 'Stock', description: 'Inventaire en temps réel' },
    { id: 'orders', icon: ShoppingCart, color: 'from-teal-500 to-teal-600', bgColor: 'bg-teal-500', label: 'Commandes', description: 'Suivi des ventes' },
    { id: 'stats', icon: BarChart3, color: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-500', label: 'Statistiques', description: 'Analytics avancés' },
];

// Border Beam Component
function BorderBeam() {
    return (
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent [background:linear-gradient(white,white)_padding-box,linear-gradient(90deg,transparent,rgba(59,130,246,0.6),rgba(20,184,166,0.6),transparent)_border-box] animate-border-beam" />
        </div>
    );
}

// Orbiting Feature Icon
function OrbitingIcon({
    feature,
    index,
    total,
    isActive,
    onHover
}: {
    feature: typeof features[0];
    index: number;
    total: number;
    isActive: boolean;
    onHover: () => void;
}) {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const radius = 280;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.5 }}
            style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                x: x,
                y: y,
            }}
            className="z-10"
        >
            <motion.button
                onHoverStart={onHover}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    "relative group cursor-pointer",
                    "w-16 h-16 rounded-2xl",
                    "bg-white/10 backdrop-blur-xl border border-white/20",
                    "shadow-xl transition-all duration-300",
                    "flex items-center justify-center",
                    isActive && "ring-2 ring-white/50 bg-white/20"
                )}
            >
                <feature.icon className={cn(
                    "h-7 w-7 transition-colors",
                    isActive ? "text-white" : "text-white/60 group-hover:text-white"
                )} />

                {/* Tooltip */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-3 py-1 rounded-lg whitespace-nowrap">
                        <p className="text-white text-xs font-medium">{feature.label}</p>
                    </div>
                </div>
            </motion.button>
        </motion.div>
    );
}

// MacBook Frame with Content
function MacBookFrame({ activeFeature }: { activeFeature: typeof features[0] }) {
    return (
        <div className="relative w-full max-w-2xl mx-auto">
            {/* MacBook Frame */}
            <div className="relative bg-slate-800 rounded-t-2xl p-3 shadow-2xl border border-slate-700">
                {/* Top Bar */}
                <div className="flex items-center gap-2 mb-3 px-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="bg-slate-700 px-4 py-1 rounded text-xs text-slate-400">
                            optimanager.ma/{activeFeature.id}
                        </div>
                    </div>
                </div>

                {/* Screen Content */}
                <div className="bg-slate-900 rounded-lg aspect-[16/10] relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeFeature.id}
                            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                            transition={{ duration: 0.3 }}
                            className={cn(
                                "absolute inset-0 flex flex-col items-center justify-center",
                                "bg-gradient-to-br",
                                activeFeature.color,
                                "p-8"
                            )}
                        >
                            <motion.div
                                initial={{ y: 20 }}
                                animate={{ y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-center space-y-4"
                            >
                                <activeFeature.icon className="h-20 w-20 text-white mx-auto" />
                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-2">
                                        {activeFeature.label}
                                    </h3>
                                    <p className="text-white/80 text-lg">
                                        {activeFeature.description}
                                    </p>
                                </div>

                                {/* Mock UI Elements */}
                                <div className="grid grid-cols-3 gap-3 mt-8">
                                    {[...Array(3)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 + i * 0.1 }}
                                            className="bg-white/20 backdrop-blur-sm rounded-lg p-4 aspect-square"
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* MacBook Base */}
            <div className="h-2 bg-gradient-to-b from-slate-700 to-slate-800 rounded-b-lg" />
            <div className="h-4 bg-slate-800 mx-auto w-1/2 rounded-b-2xl" />
        </div>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeFeature, setActiveFeature] = useState(features[0]);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        
        try {
            const result = await signIn('google', { 
                callbackUrl: '/dashboard',
                redirect: false 
            });
            
            if (result?.error) {
                setError("Erreur de connexion Google.");
                setLoading(false);
            } else if (result?.ok) {
                toast.success("Connexion réussie");
                router.push('/dashboard');
            }
        } catch (err: any) {
            if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
                console.error(err);
            }
            setError("Erreur de connexion Google.");
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Email ou mot de passe incorrect.");
                setLoading(false);
            } else if (result?.ok) {
                toast.success("Connexion réussie");
                await new Promise(resolve => setTimeout(resolve, 100));
                router.push('/dashboard');
            }
        } catch (err: any) {
            if (err.code !== 'auth/invalid-credential') {
                console.error(err);
            }
            setError("Email ou mot de passe incorrect.");
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
            {/* LEFT COLUMN: Login Form */}
            <div className="relative flex items-center justify-center p-8 bg-white">
                {/* Subtle background pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 w-full max-w-md"
                >
                    <div className="relative">
                        <BorderBeam />

                        <div className="relative rounded-2xl bg-white/90 backdrop-blur-xl border-white/50 shadow-2xl shadow-slate-900/5 p-8">
                            {/* Logo */}
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 260,
                                    damping: 20,
                                    delay: 0.2
                                }}
                                className="mx-auto mb-6 relative h-32 w-32 flex items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100"
                            >
                                <Image
                                    src="/logo-icon.png"
                                    alt="OptiManager"
                                    width={100}
                                    height={100}
                                    className="object-contain"
                                    priority
                                />
                            </motion.div>

                            {/* Title */}
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                                    Bienvenue
                                </h1>
                                <p className="text-slate-600 text-sm">
                                    Connectez-vous pour accéder à votre espace
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 mb-6"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {/* Email/Password Form */}
                            <form onSubmit={handleEmailLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-700 font-medium text-sm">
                                        Email
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            placeholder="nom@opticien.com"
                                            className="pl-10 h-11 bg-slate-50 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-slate-700 font-medium text-sm">
                                        Mot de passe
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            placeholder="••••••••"
                                            className="pl-10 h-11 bg-slate-50 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-11 bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 hover:from-blue-700 hover:via-blue-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin mr-2 relative z-10" />
                                            <span className="relative z-10">Connexion en cours...</span>
                                        </>
                                    ) : (
                                        <span className="relative z-10">Se connecter</span>
                                    )}
                                </Button>
                            </form>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-2 bg-white text-slate-500 uppercase tracking-wide">
                                        Ou continuer avec
                                    </span>
                                </div>
                            </div>

                            {/* Google Login */}
                            <Button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                variant="outline"
                                className="w-full h-11 bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 transition-all duration-200"
                            >
                                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continuer avec Google
                            </Button>

                            {/* Trust Badge */}
                            <div className="flex items-center justify-center gap-2 pt-6 text-xs text-slate-400">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span>Sécurisé • Conforme aux normes médicales</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* RIGHT COLUMN: Interactive Feature Showcase */}
            <div className="hidden lg:flex relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 items-center justify-center overflow-hidden">
                {/* Background Gradient Blobs */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />

                <div className="relative w-full h-full flex items-center justify-center">
                    {/* MacBook Frame */}
                    <MacBookFrame activeFeature={activeFeature} />

                    {/* Orbiting Feature Icons */}
                    {features.map((feature, index) => (
                        <OrbitingIcon
                            key={feature.id}
                            feature={feature}
                            index={index}
                            total={features.length}
                            isActive={activeFeature.id === feature.id}
                            onHover={() => setActiveFeature(feature)}
                        />
                    ))}
                </div>
            </div>

            {/* CSS for Border Beam Animation */}
            <style jsx global>{`
                @keyframes border-beam {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                
                .animate-border-beam {
                    background-size: 200% 200%;
                    animation: border-beam 3s linear infinite;
                }
            `}</style>
        </div>
    );
}
