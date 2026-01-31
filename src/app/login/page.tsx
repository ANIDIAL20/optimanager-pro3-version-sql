'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Mail,
  Lock,
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GoogleButton from '@/components/auth/GoogleButton';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email ou mot de passe incorrect.');
        setLoading(false);
      } else if (result?.ok) {
        toast.success('Connexion réussie');
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError('Email ou mot de passe incorrect.');
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
            className="mx-auto mb-8 relative h-24 w-24 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100"
          >
            <Image
              src="/logo-icon.png"
              alt="OptiManager"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </motion.div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Bienvenue
            </h1>
            <p className="text-slate-600">
              Connectez-vous pour accéder à votre espace
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  disabled={loading}
                  className="pl-10 h-12 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="pl-10 h-12 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 hover:from-blue-700 hover:via-blue-600 hover:to-teal-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 text-slate-500 bg-white">Ou</span>
            </div>
          </div>

          {/* Google Sign In */}
          <GoogleButton />
        </motion.div>
      </div>

      {/* RIGHT COLUMN: Hero Section */}
      <div className="relative hidden lg:flex items-center justify-center p-12 bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 max-w-lg">
          {/* Hero Title */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mb-12"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              OptiManager Pro
            </h2>
            <p className="text-blue-200 text-lg">
              Gérez votre boutique d'optique avec efficacité et simplicité
            </p>
          </motion.div>

          {/* Dashboard Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="relative rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20 p-6 shadow-2xl"
          >
            <div className="space-y-4">
              {/* Mock Dashboard Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/20">
                <div className="h-8 w-32 bg-white/20 rounded"></div>
                <div className="h-8 w-8 bg-white/20 rounded-full"></div>
              </div>

              {/* Mock Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white/10 rounded-lg p-4">
                    <div className="h-4 w-16 bg-white/30 rounded mb-2"></div>
                    <div className="h-6 w-20 bg-white/40 rounded"></div>
                  </div>
                ))}
              </div>

              {/* Mock Chart */}
              <div className="bg-white/10 rounded-lg p-4 h-32 flex items-end gap-2">
                {[40, 70, 45, 80, 60, 90, 55].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-blue-400 to-teal-400 rounded-t opacity-60"
                    style={{ height: `${height}%` }}
                  ></div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Floating Feature Icons */}
          <div className="absolute -top-8 -left-8 space-y-4">
            {[
              { Icon: LayoutDashboard, delay: 0.6 },
              { Icon: Users, delay: 0.8 },
              { Icon: Package, delay: 1.0 }
            ].map(({ Icon, delay }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay }}
                className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center"
              >
                <Icon className="w-6 h-6 text-white" />
              </motion.div>
            ))}
          </div>

          <div className="absolute -bottom-8 -right-8 space-y-4">
            {[
              { Icon: ShoppingCart, delay: 0.7 },
              { Icon: BarChart3, delay: 0.9 },
              { Icon: ShieldCheck, delay: 1.1 }
            ].map(({ Icon, delay }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay }}
                className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center ml-auto"
              >
                <Icon className="w-6 h-6 text-white" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
