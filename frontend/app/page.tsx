'use client';

import Image from "next/image";
import Link from 'next/link';
import {
    BrainCircuit, ShieldCheck, Users, ArrowRight, Sparkles, Globe, Zap,
    BarChart3, BookOpen, PlayCircle, CheckCircle2, Star, ArrowUpRight,
    MessageSquare, Cpu, Lock, ChevronDown, TrendingUp, Clock,
    GraduationCap, Building2, Layers, Database, Bell, LineChart,
    Calendar, Award, ChevronRight, X
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { saasApi, SubscriptionPlan } from "@/lib/api";

// ── Data ─────────────────────────────────────────────────────────────────────

const features = [
    {
        title: "AI-Powered Adaptive Learning",
        description: "Proprietary AI engine that analyzes every student interaction in real-time, dynamically adjusting difficulty, pacing, and content delivery.",
        icon: BrainCircuit, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20",
        detail: "98% prediction accuracy",
    },
    {
        title: "Multi-Tenant Architecture",
        description: "Isolated database schemas per school with custom branding, custom domains, and granular admin controls — all from one SaaS platform.",
        icon: Database, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20",
        detail: "Enterprise-grade isolation",
    },
    {
        title: "Smart Study Planner",
        description: "AI schedules study sessions using spaced repetition (SM-2), BKT skill mastery data, and upcoming exam timelines.",
        icon: Calendar, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20",
        detail: "Spaced repetition built-in",
    },
    {
        title: "Real-Time Analytics",
        description: "Live dashboards for admins, teachers, and parents with at-risk detection, attendance heatmaps, and predictive grade forecasting.",
        icon: LineChart, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20",
        detail: "Predictive risk alerts",
    },
    {
        title: "AI Progress Reports",
        description: "Auto-generated weekly reports customised for students, parents, and teachers — each with the right level of detail and actionable insights.",
        icon: Award, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20",
        detail: "3 report flavours",
    },
    {
        title: "Unified Communications",
        description: "Integrated notices, messaging, and push notifications keep every stakeholder — students, parents, teachers — perfectly in sync.",
        icon: Bell, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20",
        detail: "Real-time WebSocket push",
    },
];

const steps = [
    {
        step: "01", title: "Register Your Institution",
        desc: "Create your tenant account, pick a plan, and get a dedicated subdomain provisioned in seconds.",
        icon: Building2, color: "text-indigo-400", glow: "shadow-indigo-500/30",
    },
    {
        step: "02", title: "Configure & Brand",
        desc: "Upload your logo, set your colours, add teachers and students, and configure AI settings to match your curriculum.",
        icon: Layers, color: "text-purple-400", glow: "shadow-purple-500/30",
    },
    {
        step: "03", title: "Launch & Grow",
        desc: "Go live the same day. Students log in, AI adapts to each learner, and you get real-time analytics from day one.",
        icon: Zap, color: "text-pink-400", glow: "shadow-pink-500/30",
    },
];

const stats = [
    { value: 50, suffix: "+", label: "Institutions", icon: Building2, color: "text-violet-400" },
    { value: 10000, suffix: "+", label: "Active Students", icon: GraduationCap, color: "text-sky-400" },
    { value: 4.8, suffix: "M+", label: "AI Responses", icon: BrainCircuit, color: "text-emerald-400" },
    { value: 98, suffix: "%", label: "Satisfaction Rate", icon: Star, color: "text-orange-400" },
];

const testimonials = [
    {
        name: "Dr. Sarah Jenkins", role: "Principal, Global Academy",
        content: "Neo-Learn transformed how our teachers track student progress. The AI progress reports alone save us days of manual work every month.",
        avatar: "SJ", stars: 5,
    },
    {
        name: "Mark Thompson", role: "EdTech Director, TechSchools Group",
        content: "Scaling to 20+ branches was seamless. The multi-tenant architecture is rock-solid and the tenant isolation is exactly what enterprise demands.",
        avatar: "MT", stars: 5,
    },
    {
        name: "Elena Rodriguez", role: "Advanced Mathematics Teacher",
        content: "The AI study planner uses spaced repetition automatically. My students' retention scores went up 34% in the first semester.",
        avatar: "ER", stars: 5,
    },
];

const faqs = [
    {
        q: "How does multi-tenancy work?",
        a: "Each school gets a completely isolated database schema, file storage bucket, and subdomain (e.g. school.neo-learn.com). There's zero data crossover between tenants. Provisioning happens in seconds after signup.",
    },
    {
        q: "Is our student data used to train your AI?",
        a: "No — never. Your data is private, encrypted, and used exclusively for your own institution's analytics and student guidance. We are GDPR and FERPA compliant.",
    },
    {
        q: "Can we integrate with our existing systems?",
        a: "Yes. We expose a full REST API and WebSocket layer, plus webhooks for grade sync, attendance feeds, and notification delivery to third-party platforms.",
    },
    {
        q: "What AI models power the tutoring?",
        a: "We use OpenAI's GPT-4 family with Retrieval-Augmented Generation (RAG) grounded in your school's own curriculum materials. Confidence scoring ensures factual accuracy.",
    },
    {
        q: "Do you offer offline / mobile access?",
        a: "Yes. Our Expo-based mobile apps support offline content access and sync automatically when connectivity is restored. Available on iOS and Android.",
    },
    {
        q: "What does onboarding look like?",
        a: "After you register, your tenant is provisioned automatically. A guided setup wizard helps you add subjects, classes, teachers and students. Most schools go live within 24 hours.",
    },
];

type LandingPricingCard = {
    name: string; price: string; description: string; features: string[];
    button: string; popular: boolean; billingSuffix?: string; yearlyNote?: string;
    yearlyPrice?: string;
};

const fallbackPricing: LandingPricingCard[] = [
    {
        name: "Starter", price: "$49", description: "Perfect for small training centres and tutoring academies.",
        features: ["Up to 100 students", "Basic AI Analytics", "Single tenant", "Standard support", "Mobile app access"],
        button: "Start Free Trial", popular: false,
    },
    {
        name: "Professional", price: "$199", description: "The sweet spot for growing schools and academies.",
        features: ["Up to 1,000 students", "Advanced AI Tutoring", "Custom domain", "Priority 24/7 support", "AI Progress Reports", "Parent portal"],
        button: "Get Pro Now", popular: true,
    },
    {
        name: "Enterprise", price: "Custom", description: "For large institutions, university groups, and chains.",
        features: ["Unlimited students", "Custom AI models", "Full white-labelling", "Dedicated success manager", "SLA guarantees", "On-premise option"],
        button: "Contact Sales", popular: false,
    },
];

const getCurrencyPrefix = (currency?: string) => {
    const c = (currency || "USD").toUpperCase();
    if (c === "NPR") return "Rs. ";
    if (c === "USD") return "$";
    return `${c} `;
};

const formatAmount = (value: number | string, currency?: string) => {
    const n = Number(value) || 0;
    return `${getCurrencyPrefix(currency)}${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const toReadableLimit = (value: number, label: string) =>
    !Number.isFinite(value) || value <= 0 ? `Unlimited ${label}` : `Up to ${value.toLocaleString("en-US")} ${label}`;

const mapPlanToCard = (plan: SubscriptionPlan, index: number, total: number): LandingPricingCard => {
    const f = [
        toReadableLimit(Number(plan.student_limit), "students"),
        toReadableLimit(Number(plan.teacher_limit), "teachers"),
        `${Number(plan.storage_limit_gb) || 0} GB storage`,
    ];
    if ((Number(plan.ai_token_limit) || 0) > 0) f.push(`${Number(plan.ai_token_limit).toLocaleString()} AI tokens/month`);
    if (plan.has_ai_tutor) f.push("AI Tutor included");
    if (plan.has_ai_eval) f.push("AI Evaluation included");
    if (plan.has_parent_portal) f.push("Parent Portal included");
    if (plan.has_analytics) f.push("Advanced Analytics included");
    const name = plan.name || "Plan";
    const keywordPopular = /professional|pro|business|growth/i.test(name);
    const popular = keywordPopular || (total > 1 && index === Math.floor((total - 1) / 2));
    return {
        name, description: plan.description || "Core LMS with plan-based limits.", features: f.slice(0, 6),
        price: formatAmount(plan.price_monthly, plan.currency), popular,
        button: keywordPopular ? "Get Pro Now" : "Start Free Trial",
        billingSuffix: "/MO",
        yearlyNote: plan.price_yearly ? `or ${formatAmount(plan.price_yearly, plan.currency)}/year` : undefined,
    };
};

// ── Animated Counter ──────────────────────────────────────────────────────────

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: "-100px" });

    useEffect(() => {
        if (!inView) return;
        const duration = 1800;
        const steps = 60;
        const increment = value / steps;
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= value) { setCount(value); clearInterval(timer); }
            else setCount(current);
        }, duration / steps);
        return () => clearInterval(timer);
    }, [inView, value]);

    const display = value >= 1000
        ? `${(count / 1000).toFixed(count >= 1000 ? 0 : 1)}K`
        : value % 1 !== 0
            ? count.toFixed(1)
            : Math.round(count).toString();

    return <span ref={ref}>{display}{suffix}</span>;
}

// ── FAQ Accordion ─────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div
            className="border border-white/5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer overflow-hidden"
            onClick={() => setOpen(o => !o)}
        >
            <div className="flex items-center justify-between p-7 gap-4">
                <h4 className={`text-base font-bold transition-colors ${open ? 'text-indigo-400' : 'text-white'}`}>{q}</h4>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-all ${open ? 'bg-indigo-600 border-indigo-500 rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                </div>
            </div>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                        <p className="px-7 pb-7 text-slate-400 font-medium leading-relaxed text-sm">{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Scroll Section Reveal ─────────────────────────────────────────────────────

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
            {children}
        </motion.div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SaaSLandingPage() {
    const heroRef = useRef(null);
    const [pricingCards, setPricingCards] = useState<LandingPricingCard[]>(fallbackPricing);
    const [isPricingFallback, setIsPricingFallback] = useState(false);
    const [billingAnnual, setBillingAnnual] = useState(false);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
    const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
    const heroY = useTransform(scrollYProgress, [0, 0.6], [0, -80]);

    useEffect(() => {
        let mounted = true;
        saasApi.getPublicPlans().then(plans => {
            if (!mounted) return;
            const active = plans.filter(p => p && p.is_active !== false).sort((a, b) => Number(a.price_monthly || 0) - Number(b.price_monthly || 0));
            if (!active.length) { setPricingCards(fallbackPricing); setIsPricingFallback(true); return; }
            setPricingCards(active.map((p, i) => mapPlanToCard(p, i, active.length)));
        }).catch(() => { if (mounted) { setPricingCards(fallbackPricing); setIsPricingFallback(true); } });
        return () => { mounted = false; };
    }, []);

    return (
        <div className="min-h-screen bg-[#020205] text-white selection:bg-indigo-500/30 overflow-x-hidden">
            {/* ── Nav ── */}
            <nav className="fixed top-0 w-full z-50 bg-[#020205]/70 backdrop-blur-2xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">NEO-LEARN</span>
                    </div>

                    <div className="hidden lg:flex items-center gap-8">
                        {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Intelligence', '#intelligence'], ['Pricing', '#pricing']].map(([label, href]) => (
                            <a key={label} href={href} className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">{label}</a>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/login" className="hidden sm:block">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/5 font-bold">Sign In</Button>
                        </Link>
                        <Link href="/register">
                            <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full px-6 font-black shadow-lg shadow-indigo-600/20">
                                Start Free
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section ref={heroRef} className="relative pt-40 pb-20 lg:pt-60 lg:pb-32 overflow-hidden">
                {/* Grid dot background */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle, rgba(99,102,241,0.15) 1px, transparent 1px)`,
                        backgroundSize: "48px 48px"
                    }}
                />
                {/* Glow orbs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[900px] pointer-events-none overflow-hidden">
                    <div className="absolute top-[-100px] left-[5%] w-[500px] h-[500px] bg-indigo-600/25 rounded-full blur-[140px]" />
                    <div className="absolute top-[200px] right-[10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[120px]" />
                    <div className="absolute top-[40%] left-[35%] w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <motion.div style={{ opacity: heroOpacity, y: heroY }} className="text-center space-y-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-black text-indigo-400 uppercase tracking-[0.2em] backdrop-blur-xl"
                        >
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>AI-Powered Education Platform — Live</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1 }}
                            className="text-6xl md:text-8xl lg:text-[9rem] font-black leading-[0.87] tracking-tighter"
                        >
                            THE <span className="bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400">SMARTER</span><br />
                            WAY TO TEACH.
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 leading-relaxed font-medium"
                        >
                            Multi-tenant SaaS infrastructure built for institutions that demand excellence.
                            Deploy, brand, and scale your school's AI learning platform in under 24 hours.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center gap-4 justify-center pt-4"
                        >
                            <Link href="/register">
                                <Button size="lg" className="h-14 px-10 bg-white text-black hover:bg-slate-100 rounded-full text-lg font-black shadow-2xl shadow-white/10 group">
                                    Create Your School <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                            <a href="#intelligence">
                                <Button variant="outline" size="lg" className="h-14 px-10 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full text-lg font-black backdrop-blur-xl">
                                    See AI in Action <PlayCircle className="ml-2 w-5 h-5 text-indigo-400" />
                                </Button>
                            </a>
                        </motion.div>

                        {/* Dashboard preview */}
                        <motion.div
                            initial={{ opacity: 0, y: 80 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                            className="pt-16 relative max-w-5xl mx-auto"
                        >
                            <div className="absolute inset-0 bg-indigo-500/10 blur-[100px] rounded-full scale-110 pointer-events-none" />
                            <div className="relative rounded-[32px] border border-white/10 bg-black/40 p-3 backdrop-blur-3xl shadow-[0_0_80px_-20px_rgba(79,70,229,0.4)]">
                                <div className="rounded-[26px] overflow-hidden bg-slate-900 aspect-[16/9] flex items-center justify-center">
                                    <Image src="/hero-dashboard.png" alt="Neo Learn Dashboard" width={1200} height={675}
                                        className="rounded-[26px] w-full h-full object-cover" priority
                                        onError={(e) => {
                                            const t = e.target as HTMLImageElement;
                                            t.style.display = 'none';
                                        }}
                                    />
                                    {/* Fallback gradient when no image */}
                                    <div className="absolute inset-3 rounded-[26px] bg-gradient-to-br from-indigo-900/80 via-slate-900 to-purple-900/80 flex flex-col items-center justify-center gap-4 pointer-events-none">
                                        <div className="grid grid-cols-3 gap-3 w-full max-w-lg px-8 opacity-40">
                                            {[...Array(6)].map((_, i) => (
                                                <div key={i} className={`rounded-xl bg-white/10 ${i === 0 ? 'h-20 col-span-2' : i === 1 ? 'h-20' : 'h-12'}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 3.5, repeat: Infinity }}
                                    className="absolute -top-8 -right-8 p-4 bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl hidden md:block">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                            <Zap className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Users</p>
                                            <p className="text-lg font-black">124,582</p>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                                    className="absolute -bottom-8 -left-8 p-4 bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl hidden md:block">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                            <BrainCircuit className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">AI Responses</p>
                                            <p className="text-lg font-black">4.8M+</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ── Trust Marquee ── */}
            <div className="py-14 overflow-hidden border-y border-white/5 bg-white/[0.01]">
                <p className="text-center text-xs font-black text-slate-600 uppercase tracking-[0.3em] mb-8">Trusted by institutions worldwide</p>
                <div className="flex gap-16 animate-marquee whitespace-nowrap items-center opacity-25 grayscale">
                    {[...Array(3)].map((_, rep) => (
                        <div key={rep} className="flex items-center gap-16 flex-shrink-0">
                            {['STANFORD AFFILIATED', 'MIT TECHNOLOGY', 'GOOGLE EDUCATION', 'OXFORD ACADEMY', 'CAMBRIDGE ONLINE', 'IVY LEAGUE CONSORTIUM'].map(n => (
                                <span key={n} className="text-xl font-black tracking-tighter">{n}</span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Stats Strip ── */}
            <section className="py-24 border-b border-white/5">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        {stats.map((s, i) => (
                            <Reveal key={s.label} delay={i * 0.1}>
                                <div className="text-center space-y-2">
                                    <div className={`text-5xl lg:text-6xl font-black ${s.color}`}>
                                        <AnimatedCounter value={s.value} suffix={s.suffix} />
                                    </div>
                                    <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">{s.label}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section id="features" className="py-32 lg:py-48 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <Reveal>
                        <div className="flex flex-col lg:flex-row justify-between items-end gap-8 mb-20">
                            <div className="space-y-3">
                                <p className="text-indigo-400 font-black uppercase tracking-[0.3em] text-xs">Platform Intelligence</p>
                                <h2 className="text-5xl lg:text-7xl font-black tracking-tighter leading-none max-w-2xl">
                                    DESIGNED FOR THE<br /><span className="text-slate-600">NEXT GENERATION.</span>
                                </h2>
                            </div>
                            <p className="text-slate-400 max-w-sm text-lg font-medium lg:pb-2">
                                We've re-engineered the LMS from the ground up, placing AI at the heart of every interaction.
                            </p>
                        </div>
                    </Reveal>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <Reveal key={f.title} delay={i * 0.08}>
                                <motion.div
                                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                                    className={`relative p-8 rounded-3xl bg-white/[0.02] border ${f.border} hover:border-opacity-60 hover:bg-white/[0.04] transition-all group overflow-hidden`}
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-15 transition-opacity">
                                        <f.icon className={`w-28 h-28 ${f.color}`} />
                                    </div>
                                    <div className={`w-14 h-14 rounded-2xl ${f.bg} border ${f.border} flex items-center justify-center mb-7`}>
                                        <f.icon className={`w-7 h-7 ${f.color}`} />
                                    </div>
                                    <h3 className="text-xl font-black mb-3">{f.title}</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed mb-5 text-sm">{f.description}</p>
                                    <span className={`inline-flex items-center gap-1 text-xs font-black ${f.color}`}>
                                        {f.detail} <ArrowUpRight className="w-3 h-3" />
                                    </span>
                                </motion.div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How It Works ── */}
            <section id="how-it-works" className="py-32 bg-white/[0.01] border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-20 space-y-3">
                            <p className="text-purple-400 font-black uppercase tracking-[0.3em] text-xs">Simple Onboarding</p>
                            <h2 className="text-5xl lg:text-7xl font-black tracking-tighter">
                                LIVE IN <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">3 STEPS</span>.
                            </h2>
                        </div>
                    </Reveal>

                    <div className="grid lg:grid-cols-3 gap-8 relative">
                        <div className="hidden lg:block absolute top-16 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        {steps.map((s, i) => (
                            <Reveal key={s.step} delay={i * 0.15}>
                                <div className="relative text-center p-10 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all group">
                                    <div className={`w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-2xl ${s.glow} group-hover:scale-110 transition-transform`}>
                                        <s.icon className={`w-10 h-10 ${s.color}`} />
                                    </div>
                                    <div className={`text-xs font-black ${s.color} uppercase tracking-widest mb-3`}>{s.step}</div>
                                    <h3 className="text-2xl font-black mb-4">{s.title}</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed">{s.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── AI Tutor Preview ── */}
            <section id="intelligence" className="py-32 lg:py-48 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-purple-600/5 pointer-events-none" />
                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                    <Reveal>
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                <Sparkles className="w-3 h-3" /> Real-time AI Guidance
                            </div>
                            <h2 className="text-5xl lg:text-6xl font-black tracking-tighter leading-[0.9]">
                                AN AI TUTOR<br />THAT NEVER<br />SLEEPS.
                            </h2>
                            <p className="text-xl text-slate-400 font-medium leading-relaxed">
                                Our AI doesn't just answer questions — it identifies learning gaps, generates custom study schedules, and provides 24/7 support tailored to each student's exact curriculum.
                            </p>
                            <div className="space-y-3">
                                {[
                                    "Individualised progress tracking per student",
                                    "Automated lesson planning for teachers",
                                    "Predictive analytics for performance risk",
                                    "Spaced repetition schedules (SM-2 algorithm)",
                                    "Bayesian Knowledge Tracing for skill mastery"
                                ].map(item => (
                                    <div key={item} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                                        </div>
                                        <span className="font-bold text-slate-300 text-sm">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Reveal>

                    <Reveal delay={0.2}>
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500/15 blur-[80px] rounded-full scale-110 pointer-events-none" />
                            <div className="bg-[#08080f] border border-white/10 rounded-[32px] p-6 shadow-2xl relative">
                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black">Neo-Learn AI Tutor</p>
                                        <p className="text-[10px] text-emerald-400 font-bold">● Online</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 shrink-0 flex items-center justify-center text-xs font-black">S</div>
                                        <div className="p-3.5 bg-white/5 rounded-2xl rounded-tl-none border border-white/10 text-slate-300 text-sm font-medium max-w-[85%]">
                                            Can you explain the difference between Mitochondria and Chloroplasts?
                                        </div>
                                    </div>
                                    <div className="flex gap-3 justify-end">
                                        <div className="p-3.5 bg-indigo-600 rounded-2xl rounded-tr-none text-white text-sm font-medium shadow-lg shadow-indigo-600/20 max-w-[85%]">
                                            Great question! Mitochondria are the "power plants" — they break down fuel (glucose) to make ATP energy. Chloroplasts are "solar panels" — they use sunlight to create glucose. 🔋☀️<br /><br />
                                            <span className="text-indigo-200 text-xs">Based on your Biology Unit 3 materials</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 px-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce delay-100" />
                                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce delay-200" />
                                    </div>
                                </div>
                                <div className="mt-5 pt-4 border-t border-white/5 flex gap-3">
                                    <div className="flex-1 bg-white/5 rounded-xl border border-white/10 h-11 flex items-center px-4 text-slate-500 text-xs font-medium">
                                        Ask anything about your curriculum…
                                    </div>
                                    <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── Pricing ── */}
            <section id="pricing" className="py-32 lg:py-48 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-5xl lg:text-7xl font-black tracking-tighter">
                                PRICING BUILT<br /><span className="text-indigo-500">FOR SCALE</span>.
                            </h2>
                            <p className="text-slate-400 font-medium">No hidden fees. Core AI engine included in every plan.</p>

                            {/* Monthly/Annual toggle */}
                            <div className="flex items-center justify-center gap-4 mt-8">
                                <span className={`text-sm font-bold transition-colors ${!billingAnnual ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
                                <button
                                    onClick={() => setBillingAnnual(v => !v)}
                                    className={`relative w-14 h-7 rounded-full transition-colors ${billingAnnual ? 'bg-indigo-600' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${billingAnnual ? 'left-8' : 'left-1'}`} />
                                </button>
                                <span className={`text-sm font-bold transition-colors ${billingAnnual ? 'text-white' : 'text-slate-500'}`}>
                                    Annual <span className="text-emerald-400 text-xs ml-1">Save 20%</span>
                                </span>
                            </div>
                            {isPricingFallback && <p className="text-xs text-slate-600 font-bold uppercase tracking-widest mt-4">Live plan pricing temporarily unavailable</p>}
                        </div>
                    </Reveal>

                    <div className="grid md:grid-cols-3 gap-6">
                        {pricingCards.map((plan, i) => (
                            <Reveal key={plan.name} delay={i * 0.1}>
                                <div className={`relative p-8 rounded-[32px] border flex flex-col h-full transition-all ${plan.popular
                                    ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 border-indigo-400/50 shadow-2xl shadow-indigo-600/20'
                                    : 'bg-white/[0.02] border-white/10 hover:border-white/25 hover:bg-white/[0.04]'}`}
                                >
                                    {plan.popular && (
                                        <div className="absolute top-0 right-8 -translate-y-1/2 px-4 py-1 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                            Most Popular
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-2xl font-black mb-1">{plan.name}</h3>
                                        <p className={`text-sm font-medium mb-7 ${plan.popular ? 'text-indigo-200' : 'text-slate-500'}`}>{plan.description}</p>
                                        <div className="flex items-baseline gap-1 mb-2">
                                            <span className="text-5xl font-black">{plan.price}</span>
                                            {plan.billingSuffix && <span className={`text-xs font-bold ${plan.popular ? 'text-indigo-200' : 'text-slate-500'}`}>{plan.billingSuffix}</span>}
                                        </div>
                                        {plan.yearlyNote && <p className={`text-xs font-bold mb-8 ${plan.popular ? 'text-indigo-200' : 'text-slate-500'}`}>{plan.yearlyNote}</p>}
                                    </div>
                                    <div className="space-y-3 mb-8 flex-1">
                                        {plan.features.map(f => (
                                            <div key={f} className="flex items-center gap-3">
                                                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.popular ? 'text-white' : 'text-indigo-500'}`} />
                                                <span className={`text-sm font-bold ${plan.popular ? 'text-white' : 'text-slate-300'}`}>{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <Link href="/register">
                                        <Button className={`w-full h-12 rounded-2xl font-black ${plan.popular
                                            ? 'bg-white text-indigo-600 hover:bg-slate-100'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'}`}>
                                            {plan.button}
                                        </Button>
                                    </Link>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Testimonials ── */}
            <section className="py-32 bg-white/[0.01] border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-20 space-y-3">
                            <p className="text-orange-400 font-black uppercase tracking-[0.3em] text-xs">Social Proof</p>
                            <h2 className="text-5xl lg:text-7xl font-black tracking-tighter">LOVED BY<br /><span className="text-slate-600">EDUCATORS.</span></h2>
                        </div>
                    </Reveal>
                    <div className="grid lg:grid-cols-3 gap-8">
                        {testimonials.map((t, i) => (
                            <Reveal key={t.name} delay={i * 0.1}>
                                <motion.div
                                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                                    className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all"
                                >
                                    <div className="flex gap-1 mb-6">
                                        {[...Array(t.stars)].map((_, s) => <Star key={s} className="w-4 h-4 fill-indigo-500 text-indigo-500" />)}
                                    </div>
                                    <p className="text-lg font-bold italic leading-relaxed text-slate-200 mb-8">"{t.content}"</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-sm">
                                            {t.avatar}
                                        </div>
                                        <div>
                                            <p className="font-black text-white">{t.name}</p>
                                            <p className="text-xs text-slate-500 font-bold">{t.role}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section className="py-32">
                <div className="max-w-3xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-16 space-y-3">
                            <h2 className="text-4xl lg:text-6xl font-black tracking-tighter">
                                FREQUENTLY<br /><span className="text-indigo-500">ASKED</span>.
                            </h2>
                        </div>
                    </Reveal>
                    <div className="space-y-3">
                        {faqs.map((item, i) => (
                            <Reveal key={i} delay={i * 0.05}>
                                <FaqItem q={item.q} a={item.a} />
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="py-32 lg:py-48 relative overflow-hidden border-t border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(79,70,229,0.15)_0%,_transparent_70%)] pointer-events-none" />
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none" />

                <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
                    <Reveal>
                        <h2 className="text-6xl md:text-8xl lg:text-[10rem] font-black tracking-tighter leading-none mb-10">
                            BUILD THE<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">FUTURE</span>.
                        </h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <p className="text-xl text-slate-400 font-medium mb-12 max-w-xl mx-auto">
                            Join 50+ institutions already transforming how their students learn with AI.
                        </p>
                    </Reveal>
                    <Reveal delay={0.2}>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link href="/register">
                                <Button size="lg" className="h-16 px-14 bg-white text-black hover:bg-slate-100 rounded-full text-xl font-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.25)] hover:scale-105 transition-all">
                                    Deploy Instantly
                                </Button>
                            </Link>
                            <Link href="/login">
                                <Button variant="outline" size="lg" className="h-16 px-12 border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-full text-xl font-black backdrop-blur-xl">
                                    Speak to Sales
                                </Button>
                            </Link>
                        </div>
                    </Reveal>
                    <Reveal delay={0.3}>
                        <div className="pt-12 flex flex-wrap justify-center gap-8 opacity-35">
                            <div className="flex items-center gap-2 font-bold text-sm"><CheckCircle2 className="w-4 h-4" /> NO CREDIT CARD</div>
                            <div className="flex items-center gap-2 font-bold text-sm"><Lock className="w-4 h-4" /> 256-BIT ENCRYPTION</div>
                            <div className="flex items-center gap-2 font-bold text-sm"><ShieldCheck className="w-4 h-4" /> GDPR COMPLIANT</div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="py-20 bg-[#020205] border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-2xl font-black tracking-tighter">NEO-LEARN</span>
                            </div>
                            <p className="text-slate-500 max-w-xs text-sm font-medium leading-relaxed">
                                Next-generation AI education infrastructure for institutions that demand excellence and scale.
                            </p>
                            <div className="flex gap-3">
                                {['𝕏', 'in', 'gh', 'ig'].map(s => (
                                    <div key={s} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition-all cursor-pointer text-xs font-black">
                                        {s}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {[
                            { title: "Platform", links: ["AI Tutoring", "Study Planner", "Analytics Engine", "Progress Reports", "Mobile App"] },
                            { title: "Company", links: ["About Us", "Careers", "Privacy Policy", "Terms of Service", "Ethical AI"] },
                            { title: "Resources", links: ["Documentation", "Help Centre", "Release Notes", "API Reference", "Status Page"] },
                        ].map(col => (
                            <div key={col.title} className="space-y-5">
                                <h5 className="font-black text-xs uppercase tracking-widest text-slate-600">{col.title}</h5>
                                <ul className="space-y-3 text-slate-500 text-sm font-bold">
                                    {col.links.map(l => <li key={l} className="hover:text-white transition-colors cursor-pointer">{l}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-slate-700 font-black tracking-widest">© 2026 NEO-LEARN SAAS PLATFORM. AN APEESYS LABS PRODUCTION.</p>
                        <div className="flex items-center gap-6">
                            <span className="flex items-center gap-2 text-[10px] font-black text-emerald-500 tracking-widest uppercase">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> SYSTEM OPERATIONAL
                            </span>
                        </div>
                    </div>
                </div>
            </footer>

            <style jsx global>{`
                html { scroll-behavior: smooth; }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.333%); }
                }
                .animate-marquee { animation: marquee 30s linear infinite; }
            `}</style>
        </div>
    );
}
