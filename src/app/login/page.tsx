'use client';

<<<<<<< HEAD
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
=======
import { useFormState, useFormStatus } from 'react-dom';
import { authenticate } from '@/app/actions/auth-actions';
>>>>>>> 559e7bd8821221a48328624aaaf210a571f4d425
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, Lock, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button 
      type="submit" 
      disabled={pending}
      className="w-full h-11 bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 hover:from-blue-700 hover:via-blue-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300"
    >
      {pending ? 'Connexion en cours...' : 'Se connecter'}
    </Button>
  );
}

export default function LoginPage() {
  const [errorMessage, dispatch] = useFormState(authenticate, undefined);

<<<<<<< HEAD
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
=======
  return (
    <div className="w-full min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background Gradient Blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
>>>>>>> 559e7bd8821221a48328624aaaf210a571f4d425

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="relative rounded-2xl bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl shadow-slate-900/20 p-8">
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

<<<<<<< HEAD
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
=======
          {/* Error Message */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 mb-6 flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Login Form */}
          <form action={dispatch} className="space-y-4">
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
                  autoComplete="email"
                  autoFocus
                />
              </div>
>>>>>>> 559e7bd8821221a48328624aaaf210a571f4d425
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
                  autoComplete="current-password"
                />
              </div>
            </div>

            <SubmitButton />
          </form>

          {/* Trust Badge */}
          <div className="flex items-center justify-center gap-2 pt-6 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Sécurisé • Conforme aux normes médicales</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
