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
  PlayCircle,
  CheckCircle2,
  Star,
  ArrowUpRight,
  Search,
  MessageSquare,
  Cpu,
  MousePointer2,
  Lock
} from 'lucide-react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { saasApi, SubscriptionPlan } from "@/lib/api";

const features = [
  {
    title: "AI-Powered Adaptive Learning",
    description: "Our proprietary AI engine analyzes student performance in real-time to adjust difficulty and content delivery.",
    icon: BrainCircuit,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    detail: "98% Accuracy in prediction"
  },
  {
    title: "Multi-Tenant Enterprise Core",
    description: "Deploy separate instances for each school with custom branding, domains, and isolated database schemas.",
    icon: ShieldCheck,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    detail: "Enterprise-grade security"
  },
  {
    title: "Unified Communication Hub",
    description: "Integrated messaging, notices, and progress reports keep parents, teachers, and students perfectly aligned.",
    icon: Users,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    detail: "Real-time sync"
  },
];

const testimonials = [
  {
    name: "Dr. Sarah Jenkins",
    role: "Principal, Global Academy",
    content: "Neo-Learn has transformed how our teachers track student progress. The AI insights are genuinely game-changing.",
    avatar: "SJ",
  },
  {
    name: "Mark Thompson",
    role: "EdTech Director",
    content: "Scaling to 20+ branches was seamless thanks to the multi-tenant architecture. Best LMS we've ever used.",
    avatar: "MT",
  },
  {
    name: "Elena Rodriguez",
    role: "Advanced Mathematics Teacher",
    content: "The automated grading and lesson planning tools save me over 10 hours every single week.",
    avatar: "ER",
  }
];

type LandingPricingCard = {
  name: string;
  price: string;
  description: string;
  features: string[];
  button: string;
  popular: boolean;
  billingSuffix?: string;
  yearlyNote?: string;
};

const fallbackPricing: LandingPricingCard[] = [
  {
    name: "Starter",
    price: "$49",
    description: "Perfect for small training centers",
    features: ["Up to 100 students", "Basic AI Analytics", "Single Tenant", "Standard Support"],
    button: "Start Free Trial",
    popular: false
  },
  {
    name: "Professional",
    price: "$199",
    description: "The sweet spot for growing schools",
    features: ["Up to 1000 students", "Advanced AI Tutoring", "Custom Domains", "24/7 Priority Support"],
    button: "Get Pro Now",
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large institutions & university groups",
    features: ["Unlimited Students", "Proprietary AI Models", "Full White-labeling", "Dedicated Success Manager"],
    button: "Contact Sales",
    popular: false
  }
];

const getCurrencyPrefix = (currency?: string) => {
  const normalized = (currency || "USD").toUpperCase();
  if (normalized === "NPR") return "Rs. ";
  if (normalized === "USD") return "$";
  return `${normalized} `;
};

const formatAmount = (value: number | string, currency?: string) => {
  const numericValue = Number(value) || 0;
  return `${getCurrencyPrefix(currency)}${numericValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const toReadableLimit = (value: number, label: string) => {
  if (!Number.isFinite(value) || value <= 0) return `Unlimited ${label}`;
  return `Up to ${value.toLocaleString("en-US")} ${label}`;
};

const mapPlanToCard = (plan: SubscriptionPlan, index: number, total: number): LandingPricingCard => {
  const baseFeatures = [
    toReadableLimit(Number(plan.student_limit), "students"),
    toReadableLimit(Number(plan.teacher_limit), "teachers"),
    `${Number(plan.storage_limit_gb) || 0} GB storage`,
  ];

  if ((Number(plan.ai_token_limit) || 0) > 0) {
    baseFeatures.push(`${Number(plan.ai_token_limit).toLocaleString("en-US")} AI tokens/month`);
  }
  if (plan.has_ai_tutor) baseFeatures.push("AI Tutor included");
  if (plan.has_ai_eval) baseFeatures.push("AI Evaluation included");
  if (plan.has_parent_portal) baseFeatures.push("Parent Portal included");
  if (plan.has_analytics) baseFeatures.push("Advanced Analytics included");
  if (plan.has_career_guidance) baseFeatures.push("Career Guidance included");

  const middleIndex = Math.floor((total - 1) / 2);
  const name = plan.name || "Plan";
  const keywordPopular = /professional|pro|business|growth/i.test(name);
  const popular = keywordPopular || (total > 1 && index === middleIndex);

  return {
    name,
    price: formatAmount(plan.price_monthly, plan.currency),
    description: plan.description || "Includes core LMS with plan-based limits and features.",
    features: baseFeatures.slice(0, 6),
    button: keywordPopular ? "Get Pro Now" : "Start Free Trial",
    popular,
    billingSuffix: "/MO",
    yearlyNote: `${formatAmount(plan.price_yearly, plan.currency)} /YEAR`,
  };
};

export default function LandingPage() {
  const targetRef = useRef(null);
  const [pricingCards, setPricingCards] = useState<LandingPricingCard[]>(fallbackPricing);
  const [isPricingFallback, setIsPricingFallback] = useState(false);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, -100]);

  useEffect(() => {
    let isMounted = true;

    const loadPublicPlans = async () => {
      try {
        const plans = await saasApi.getPublicPlans();
        if (!isMounted) return;

        const activePlans = plans
          .filter((plan) => plan && plan.is_active !== false)
          .sort((a, b) => Number(a.price_monthly || 0) - Number(b.price_monthly || 0));

        if (activePlans.length === 0) {
          setPricingCards(fallbackPricing);
          setIsPricingFallback(true);
          return;
        }

        setPricingCards(activePlans.map((plan, index) => mapPlanToCard(plan, index, activePlans.length)));
        setIsPricingFallback(false);
      } catch (error) {
        console.error("Failed to load public subscription plans for landing page", error);
        if (!isMounted) return;
        setPricingCards(fallbackPricing);
        setIsPricingFallback(true);
      }
    };

    loadPublicPlans();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#020205] text-white selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#020205]/60 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              NEO-LEARN
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            {['Features', 'Intelligence', 'Case Studies', 'Pricing'].map((item) => (
              <Link key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-sm font-semibold text-slate-400 hover:text-white transition-all hover:translate-y-[-1px]">
                {item}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5 font-bold transition-all">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-none rounded-full px-8 font-black transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
                Join Now
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative">
        {/* Hero Section */}
        <section ref={targetRef} className="relative pt-40 pb-20 lg:pt-56 lg:pb-32 overflow-hidden">
          {/* Dynamic Background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1440px] h-[1000px] pointer-events-none">
            <div className="absolute top-[-100px] left-[5%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[160px] animate-pulse" />
            <div className="absolute top-[200px] right-[5%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[160px] animate-pulse delay-1000" />
            <div className="absolute top-[50%] left-[30%] w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          </div>

          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center space-y-10 relative z-10">
              <motion.div
                style={{ opacity, scale, y }}
                className="space-y-10"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-black text-indigo-400 uppercase tracking-[0.2em] backdrop-blur-xl shadow-2xl"
                >
                  <Cpu className="w-4 h-4" />
                  <span>AI-Powered Education Network v2.0</span>
                </motion.div>

                <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-black leading-[0.85] tracking-tighter text-white">
                  THE <span className="bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400">SMARTER</span> <br />
                  WAY TO TEACH.
                </h1>

                <p className="max-w-3xl mx-auto text-lg md:text-2xl text-slate-400 leading-relaxed font-medium px-4">
                  A multi-tenant SaaS infrastructure designed for institutions that demand
                  excellence. Powered by the most advanced AI learning models.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-6 justify-center pt-8">
                  <Link href="/register">
                    <Button size="lg" className="h-16 px-12 bg-white text-black hover:bg-slate-200 rounded-full text-xl font-black shadow-2xl shadow-white/10 group transition-all">
                      Create Your School <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" className="h-16 px-12 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full text-xl font-black backdrop-blur-2xl">
                    Watch AI Agent <PlayCircle className="ml-2 w-6 h-6 text-indigo-400" />
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 1 }}
                className="pt-24 relative max-w-6xl mx-auto"
              >
                <div className="absolute inset-0 bg-indigo-500/10 blur-[120px] rounded-full scale-110" />
                <div className="relative rounded-[40px] border border-white/10 bg-black/40 p-4 backdrop-blur-3xl shadow-[0_0_100px_-20px_rgba(79,70,229,0.3)]">
                  <Image
                    src="/hero-dashboard.png"
                    alt="Neo Learn Dashboard"
                    width={1200}
                    height={800}
                    className="rounded-[32px] shadow-2xl"
                    priority
                  />

                  {/* Real-time stats badges */}
                  <motion.div
                    animate={{ y: [0, -15, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute -top-6 -right-6 md:-top-12 md:-right-12 p-5 bg-white/10 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl hidden md:block"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Users</p>
                        <p className="text-xl font-black">124,582</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, 15, 0] }}
                    transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                    className="absolute -bottom-6 -left-6 md:-bottom-12 md:-left-12 p-5 bg-white/10 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl hidden md:block"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                        <MousePointer2 className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">AI Responses</p>
                        <p className="text-xl font-black">4.8M+</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Brands Slider (Marquee) */}
        <div className="py-20 overflow-hidden bg-white/[0.01] border-y border-white/5">
          <div className="flex whitespace-nowrap gap-20 animate-marquee items-center opacity-20 grayscale">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-20">
                <span className="text-2xl font-black tracking-tighter">STANFORD UNIVERSITY</span>
                <span className="text-2xl font-black tracking-tighter">MIT TECHNOLOGY</span>
                <span className="text-2xl font-black tracking-tighter">GOOGLE ED</span>
                <span className="text-2xl font-black tracking-tighter">OXFORD ACADEMY</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="py-32 lg:py-48 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row justify-between items-end gap-8 mb-24">
              <div className="space-y-4 text-left">
                <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] text-xs">Core Intelligence</p>
                <h2 className="text-5xl lg:text-7xl font-black tracking-tighter max-w-2xl leading-none">
                  DESIGNED FOR THE <br /> <span className="text-slate-500">NEXT GENERATION.</span>
                </h2>
              </div>
              <p className="text-slate-400 max-w-sm text-lg font-medium lg:pb-2">
                We've re-engineered the LMS from the ground up, placing AI at the heart of the experience.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  whileHover={{ y: -10 }}
                  className="relative p-10 rounded-[40px] bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all group overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                    <feature.icon className={`w-32 h-32 ${feature.color}`} />
                  </div>

                  <div className={`w-16 h-16 rounded-3xl ${feature.bg} flex items-center justify-center mb-10 ring-1 ring-white/10 group-hover:ring-white/40 transition-all`}>
                    <feature.icon className={`w-8 h-8 ${feature.color}`} />
                  </div>

                  <div className="space-y-4 relative z-10">
                    <h3 className="text-2xl font-black">{feature.title}</h3>
                    <p className="text-slate-500 font-medium leading-relaxed text-lg">{feature.description}</p>
                    <div className="pt-6 flex items-center text-indigo-400 text-sm font-bold gap-2">
                      {feature.detail} <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Tutoring Interaction Preview */}
        <section id="intelligence" className="py-32 bg-indigo-600/5 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Real-time AI Guidance</span>
              </div>
              <h2 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[0.9]">
                AN AI TUTOR <br /> THAT NEVER <br /> SLEEPS.
              </h2>
              <p className="text-xl text-slate-400 font-medium leading-relaxed">
                Our AI isn't just a chatbot. It identifies learning gaps, generates
                custom study schedules, and provides 24/7 support tailored to each
                student's specific curriculum.
              </p>
              <div className="space-y-4">
                {[
                  "Individualized progress tracking per student",
                  "Automated lesson planning for teachers",
                  "Predictive analytics for performance risk"
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full scale-125 pointer-events-none" />
              <div className="bg-[#0a0a10] border border-white/10 rounded-[40px] p-8 shadow-2xl relative">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0" />
                    <div className="p-4 bg-white/5 rounded-2xl rounded-tl-none border border-white/10 text-slate-300 text-sm font-medium animate-in fade-in slide-in-from-left duration-500">
                      Can you explain the difference between Mitochondria and Chloroplasts?
                    </div>
                  </div>
                  <div className="flex gap-4 justify-end">
                    <div className="p-4 bg-indigo-600 rounded-2xl rounded-tr-none text-white text-sm font-bold shadow-lg shadow-indigo-600/20 max-w-[80%] animate-in fade-in slide-in-from-right duration-700 delay-300">
                      Great question! Think of it like this: Mitochondria are the "power plants" that break down fuel, while Chloroplasts are the "solar panels" that create it. 🔋☀️
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="h-2 w-1/2 bg-white/5 rounded-full animate-pulse mx-auto opacity-50" />
                </div>
                <div className="mt-8 pt-8 border-t border-white/5 flex gap-4">
                  <div className="flex-1 bg-white/5 rounded-xl border border-white/10 h-12 flex items-center px-4 text-slate-500 text-xs font-bold">
                    Type your question...
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-32 lg:py-48">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-24 space-y-4">
              <h2 className="text-5xl lg:text-7xl font-black tracking-tighter">PRICING BUILT <br /> <span className="text-indigo-500 uppercase">For Scale</span>.</h2>
              <p className="text-slate-400 font-medium">No hidden fees. Every plan includes our core AI engine.</p>
              {isPricingFallback && (
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Live plan pricing temporarily unavailable</p>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {pricingCards.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative p-10 rounded-[40px] border transition-all ${plan.popular ? 'bg-indigo-600 border-indigo-400' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-10 -translate-y-1/2 px-4 py-1 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
                  <p className={`${plan.popular ? 'text-indigo-100' : 'text-slate-500'} text-sm font-medium mb-8`}>{plan.description}</p>
                  <div className="flex items-baseline gap-2 mb-10">
                    <span className="text-5xl font-black">{plan.price}</span>
                    {plan.billingSuffix && <span className={`${plan.popular ? 'text-indigo-200' : 'text-slate-500'} text-xs font-bold`}>{plan.billingSuffix}</span>}
                  </div>
                  {plan.yearlyNote && <p className={`${plan.popular ? 'text-indigo-100' : 'text-slate-500'} text-xs font-bold mb-6`}>{plan.yearlyNote}</p>}
                  <div className="space-y-4 mb-10">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-3">
                        <CheckCircle2 className={`w-4 h-4 ${plan.popular ? 'text-white' : 'text-indigo-500'}`} />
                        <span className={`text-sm font-bold ${plan.popular ? 'text-white' : 'text-slate-300'}`}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Button className={`w-full h-14 rounded-2xl font-black text-lg ${plan.popular ? 'bg-white text-indigo-600 hover:bg-slate-100' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/20'}`}>
                    {plan.button}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-32 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-4xl font-black text-center mb-20 tracking-tighter">FREQUENTLY ASKED <span className="text-indigo-500">QUESTIONS</span></h2>
            <div className="space-y-6">
              {[
                { q: "How does the multi-tenancy work?", a: "Each institution receives its own isolated database and file storage. Subdomains like 'school.neo-learn.com' are provisioned instantly." },
                { q: "Is our data used to train your AI?", a: "No. Your data is private, secure, and used only for your own institution's analytics and student guidance." },
                { q: "Can we integrate with our existing systems?", a: "Yes, we offer a robust API and support WebHooks for deep integration with and other school management tools." },
                { q: "Do you offer offline learning?", a: "Our mobile apps support offline syncing, allowing students to download materials and upload assignments later." }
              ].map((item, i) => (
                <div key={i} className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold group-hover:text-indigo-400 transition-colors">{item.q}</h4>
                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">+</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-32 lg:py-48 bg-white/[0.01]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-3 gap-12">
              {testimonials.map((t, idx) => (
                <div key={idx} className="space-y-8 relative">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-indigo-500 text-indigo-500" />)}
                  </div>
                  <p className="text-xl font-bold italic leading-relaxed text-slate-200">"{t.content}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-black text-white">{t.avatar}</div>
                    <div>
                      <p className="font-black text-white">{t.name}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 lg:py-48 relative overflow-hidden">
          <div className="absolute inset-0 bg-indigo-600 mix-blend-overlay opacity-30" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/30 rounded-full blur-[160px]" />

          <div className="max-w-6xl mx-auto px-6 relative z-10 text-center space-y-12">
            <div className="flex justify-center -space-x-4 mb-20 animate-in fade-in duration-1000">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="w-16 h-16 rounded-full border-4 border-[#020205] bg-slate-800 flex items-center justify-center overflow-hidden grayscale hover:grayscale-0 transition-all cursor-pointer">
                  <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900" />
                </div>
              ))}
            </div>

            <h2 className="text-6xl md:text-8xl lg:text-[12rem] font-black tracking-tighter leading-none">
              BUILD THE <br /> <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">FUTURE</span>.
            </h2>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-10">
              <Link href="/register">
                <Button size="lg" className="h-20 px-16 bg-white text-black hover:bg-slate-200 rounded-full text-2xl font-black shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)] hover:scale-105 transition-all">
                  Deploy Instantly
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-20 px-12 border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-full text-2xl font-black backdrop-blur-2xl">
                  Speak to Sales
                </Button>
              </Link>
            </div>

            <div className="pt-20 flex flex-wrap justify-center gap-10 opacity-40">
              <div className="flex items-center gap-2 font-bold text-sm"><CheckCircle2 className="w-4 h-4" /> NO CREDIT CARD</div>
              <div className="flex items-center gap-2 font-bold text-sm"><Lock className="w-4 h-4" /> 256-BIT ENCRYPTION</div>
              <div className="flex items-center gap-2 font-bold text-sm"><ShieldCheck className="w-4 h-4" /> GDPR COMPLIANT</div>
            </div>
          </div>
        </section>

        {/* Footer Section */}
        <footer className="py-32 bg-[#020205] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-16">
              <div className="lg:col-span-2 space-y-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-2xl font-black tracking-tighter">NEO-LEARN</span>
                </div>
                <p className="text-slate-500 max-w-sm text-lg font-medium leading-relaxed">
                  Next-generation intelligence for educational institutions. Scale faster, learn smarter, and build the future of education together.
                </p>
                <div className="flex gap-4">
                  {['Twitter', 'GitHub', 'LinkedIn', 'Instagram'].map(s => (
                    <div key={s} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition-all cursor-pointer">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <h5 className="font-black text-xs uppercase tracking-widest text-slate-500">Platform</h5>
                <ul className="space-y-5 text-slate-400 font-bold">
                  <li className="hover:text-white transition-colors"><Link href="#">AI Tutoring</Link></li>
                  <li className="hover:text-white transition-colors"><Link href="#">Multi-Tenancy</Link></li>
                  <li className="hover:text-white transition-colors"><Link href="#">Analytics Engine</Link></li>
                  <li className="hover:text-white transition-colors"><Link href="#">Security Protocol</Link></li>
                </ul>
              </div>

              <div className="space-y-8">
                <h5 className="font-black text-xs uppercase tracking-widest text-slate-500">Resources</h5>
                <ul className="space-y-5 text-slate-400 font-bold">
                  <li className="hover:text-white transition-colors"><Link href="#">Documentation</Link></li>
                  <li className="hover:text-white transition-colors"><Link href="#">Help Center</Link></li>
                  <li className="hover:text-white transition-colors"><Link href="#">Release Notes</Link></li>
                  <li className="hover:text-white transition-colors"><Link href="#">API Reference</Link></li>
                </ul>
              </div>

              <div className="space-y-8">
                <h5 className="font-black text-xs uppercase tracking-widest text-slate-500">Company</h5>
                <ul className="space-y-5 text-slate-400 font-bold">
                  <li className="hover:text-white transition-colors"><Link href="#">About Us</Link></li>
                  <li className="hover:text-white transition-colors"><Link href="#">Privacy Policy</Link></li>
                  <li className="hover:text-white transition-colors"><Link href="#">Terms of Service</Link></li>
                  <li className="hover:text-white transition-colors"><Link href="#">Ethical AI</Link></li>
                </ul>
              </div>
            </div>

            <div className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
              <p className="text-xs text-slate-600 font-black tracking-widest">© 2026 NEO-LEARN SaaS PLATFORM. AN APEESYS LABS PRODUCTION.</p>
              <div className="flex items-center gap-10">
                <span className="flex items-center gap-2 text-[10px] font-black text-emerald-500 tracking-widest uppercase">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> SYSTEM OPERATIONAL
                </span>
                <span className="text-[10px] font-black text-slate-700 tracking-widest uppercase cursor-pointer hover:text-white">BACK TO TOP ↑</span>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* Global Smooth Scroll Support */}
      <style jsx global>{`
                html {
                   scroll-behavior: smooth;
                }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 40s linear infinite;
                }
                .perspective-1000 {
                    perspective: 1000px;
                }
                .rotate-y-[-10deg] {
                    transform: rotateY(-10deg);
                }
                .rotate-x-[5deg] {
                    transform: rotateX(5deg);
                }
            `}</style>
    </div>
  );
}
