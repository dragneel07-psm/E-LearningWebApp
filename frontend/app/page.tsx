'use client';

import Image from "next/image";
import Link from 'next/link';
import {
  BrainCircuit,
  ShieldCheck,
  Users,
  ArrowRight,
  Sparkles,
  Globe,
  Zap,
  BarChart3,
  BookOpen,
  PlayCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "AI-Powered Personalization",
    description: "Adaptive learning paths that evolve with every student's unique progress and learning style.",
    icon: BrainCircuit,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    title: "Multi-Tenant Enterprise",
    description: "Scale your institution with robust tenant isolation and white-labeled dashboards.",
    icon: ShieldCheck,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Collaborative Ecosystem",
    description: "Seamless interaction between teachers, students, and parents in a unified environment.",
    icon: Users,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020205] text-white selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              NEO-LEARN
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Solutions', 'Pricing', 'Resources'].map((item) => (
              <Link key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                {item}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-white text-black hover:bg-slate-200 rounded-full px-6 font-bold transition-all shadow-xl shadow-white/5">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative pt-32 lg:pt-48 overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] pointer-events-none opacity-20">
          <div className="absolute top-[-100px] left-[10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[150px] animate-pulse" />
          <div className="absolute top-[100px] right-[10%] w-[500px] h-[500px] bg-purple-600 rounded-full blur-[150px] animate-pulse delay-700" />
        </div>

        {/* Hero Content */}
        <div className="max-w-7xl mx-auto px-6 text-center lg:text-left">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-2 items-center">
            <div className="space-y-8 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-indigo-400 uppercase tracking-widest backdrop-blur-sm"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>The Future of Education is here</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-6xl lg:text-8xl font-black leading-[0.9] tracking-tighter"
              >
                LEARN <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400">WITHOUT</span> <br />
                LIMITS.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-xl mx-auto lg:mx-0 text-lg lg:text-xl text-slate-400 leading-relaxed font-medium"
              >
                Empower your institution with AI-driven learning paths,
                real-time insights, and a multi-tenant platform built
                for the next generation.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
              >
                <Link href="/register">
                  <Button size="lg" className="h-14 px-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-lg font-bold shadow-2xl shadow-indigo-600/20 group">
                    Start Your Journey <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="h-14 px-8 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full text-lg font-bold backdrop-blur-sm">
                  View Demo <PlayCircle className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-4 pt-10 justify-center lg:justify-start"
              >
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-slate-800 flex items-center justify-center overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900" />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  <span className="text-white font-bold">500+ Institutions</span> already trust Neo-Learn
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 1, ease: "easeOut" }}
              className="relative perspective-1000 hidden lg:block"
            >
              <div className="relative rotate-y-[-10deg] rotate-x-[5deg] hover:rotate-0 transition-all duration-700">
                <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full animate-pulse" />
                <Image
                  src="/hero-dashboard.png"
                  alt="Platform Dashboard"
                  width={800}
                  height={800}
                  className="rounded-[32px] border border-white/20 shadow-[-40px_40px_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl"
                  priority
                />

                {/* Floating elements */}
                <motion.div
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-10 -right-10 p-6 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl"
                >
                  <BarChart3 className="w-8 h-8 text-emerald-400" />
                </motion.div>

                <motion.div
                  animate={{ y: [0, 20, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-10 -left-10 p-6 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl"
                >
                  <Globe className="w-8 h-8 text-blue-400" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Marquee Section */}
        <div className="mt-32 py-10 bg-white/[0.02] border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
              {['Google for Education', 'Coursera', 'Khan Academy', 'Harvard University', 'Stanford'].map((brand) => (
                <span key={brand} className="text-xl font-black tracking-tighter whitespace-nowrap">{brand}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <section className="py-32 relative" id="features">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center space-y-4 mb-20">
              <h2 className="text-4xl lg:text-5xl font-black tracking-tight">Everything you need to <span className="text-indigo-500">Scale</span>.</h2>
              <p className="text-slate-400 max-w-2xl mx-auto font-medium">A complete infrastructure designed for the modern era of digital education.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  whileHover={{ y: -10 }}
                  className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all group"
                >
                  <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 ring-1 ring-white/10 group-hover:ring-white/30 transition-all`}>
                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 lg:py-32 bg-indigo-600">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
              {[
                { label: "Active Students", value: "2M+" },
                { label: "Countries", value: "140+" },
                { label: "Courses Created", value: "50k+" },
                { label: "AI Suggestions/Day", value: "1.2M" }
              ].map((stat) => (
                <div key={stat.label} className="text-center space-y-2">
                  <h4 className="text-4xl lg:text-6xl font-black text-white">{stat.value}</h4>
                  <p className="text-indigo-200 font-bold uppercase tracking-widest text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/20 to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 text-center space-y-12 relative z-10">
            <div className="p-4 inline-block bg-white/5 rounded-2xl border border-white/10">
              <BookOpen className="w-10 h-10 text-indigo-400" />
            </div>
            <h2 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1]">
              READY TO TRANSFORM <br />
              <span className="text-indigo-500 italic">YOUR</span> INSTITUTION?
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
              <Link href="/register">
                <Button size="lg" className="h-16 px-12 bg-white text-black hover:bg-slate-200 rounded-full text-xl font-black transition-all">
                  Launch Your School
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="lg" className="h-16 px-12 text-white hover:bg-white/5 rounded-full text-xl font-bold">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-20 border-t border-white/5 bg-black/40 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-12">
              <div className="col-span-2 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-black tracking-tighter">NEO-LEARN</span>
                </div>
                <p className="text-slate-500 max-w-sm font-medium">
                  The definitive platform for modern institutions. Built with passion for scales, educators, and the next generation of learners.
                </p>
              </div>
              <div className="space-y-6">
                <h5 className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Product</h5>
                <ul className="space-y-4 text-sm font-medium text-slate-500">
                  <li><Link href="#" className="hover:text-white transition-colors">Features</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">Security</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">Tenant Management</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">AI Engine</Link></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h5 className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Support</h5>
                <ul className="space-y-4 text-sm font-medium text-slate-500">
                  <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">API Status</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">Contact Us</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-xs text-slate-600 font-bold">© 2026 NEO-LEARN SaaS PLATFORM. ALL RIGHTS RESERVED.</p>
              <div className="flex items-center gap-6 text-slate-600">
                {['Twitter', 'LinkedIn', 'YouTube', 'GitHub'].map(s => (
                  <Link key={s} href="#" className="hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">{s}</Link>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
