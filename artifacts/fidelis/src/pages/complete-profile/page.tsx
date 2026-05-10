import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Globe2,
  Home,
  Landmark,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default function CompleteProfilePage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    phone: "",
    dateOfBirth: "",
    addressLine1: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    employmentStatus: "",
    sourceOfFunds: "",
    investmentExperience: "",
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const completedFields = useMemo(() => {
    return Object.values(form).filter((value) => value.trim().length > 0).length;
  }, [form]);

  const progress = Math.round((completedFields / Object.keys(form).length) * 100);

  const mutation = useMutation({
    mutationFn: async () => {
      await adminApi.syncMe();
      return adminApi.updateProfile(form);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      navigate("/dashboard");
    },
    onError: (error) => {
      alert(error instanceof Error ? error.message : "Failed to save profile.");
    },
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050507] px-4 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,204,109,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(94,61,198,0.18),transparent_35%)]" />
      <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur">
            <Sparkles className="h-4 w-4 text-[#d6cc6d]" />
            Orion Secure Onboarding
          </div>

          <div className="space-y-5">
            <h1 className="max-w-xl text-4xl font-bold tracking-tight md:text-6xl">
              Finish your investor profile with confidence.
            </h1>

            <p className="max-w-lg text-base leading-7 text-white/60">
              Complete your registration details so Orion can personalize your
              account, protect your access, and prepare your trading dashboard.
            </p>
          </div>

          <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <TrustCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Secure"
              text="Protected account setup"
            />
            <TrustCard
              icon={<Landmark className="h-5 w-5" />}
              title="Bank-style"
              text="Structured user profile"
            />
            <TrustCard
              icon={<BadgeCheck className="h-5 w-5" />}
              title="Verified"
              text="Clean onboarding flow"
            />
          </div>

          <div className="max-w-xl rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-white/60">Profile completion</span>
              <span className="font-semibold text-[#d6cc6d]">{progress}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#d6cc6d] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </section>

        <Card className="border-white/10 bg-white/[0.06] text-white shadow-2xl backdrop-blur-xl">
          <CardContent className="p-5 md:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d6cc6d] text-black shadow-lg">
                  <UserRoundCheck className="h-6 w-6" />
                </div>

                <h2 className="text-2xl font-bold tracking-tight">
                  Complete Your Profile
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/55">
                  Add your registration details to complete your Orion account.
                </p>
              </div>

              <div className="hidden rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right md:block">
                <p className="text-xs text-white/45">Step</p>
                <p className="text-lg font-bold text-[#d6cc6d]">01 / 01</p>
              </div>
            </div>

            <div className="space-y-6">
              <SectionTitle
                icon={<Phone className="h-4 w-4" />}
                title="Personal details"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone Number"
                  placeholder="+1 202 555 0147"
                  value={form.phone}
                  onChange={(value) => update("phone", value)}
                />

                <Field
                  icon={<Calendar className="h-4 w-4" />}
                  label="Date of Birth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(value) => update("dateOfBirth", value)}
                />
              </div>

              <SectionTitle
                icon={<MapPin className="h-4 w-4" />}
                title="Residential address"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  icon={<Globe2 className="h-4 w-4" />}
                  label="Country"
                  placeholder="United States"
                  value={form.country}
                  onChange={(value) => update("country", value)}
                />

                <Field
                  icon={<Building2 className="h-4 w-4" />}
                  label="State"
                  placeholder="California"
                  value={form.state}
                  onChange={(value) => update("state", value)}
                />

                <Field
                  icon={<MapPin className="h-4 w-4" />}
                  label="City"
                  placeholder="Los Angeles"
                  value={form.city}
                  onChange={(value) => update("city", value)}
                />

                <Field
                  icon={<Home className="h-4 w-4" />}
                  label="Postal Code"
                  placeholder="90017"
                  value={form.postalCode}
                  onChange={(value) => update("postalCode", value)}
                />

                <Field
                  icon={<Home className="h-4 w-4" />}
                  label="Home Address"
                  placeholder="742 Evergreen Terrace, Downtown Los Angeles"
                  value={form.addressLine1}
                  onChange={(value) => update("addressLine1", value)}
                  className="md:col-span-2"
                />
              </div>

              <SectionTitle
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                title="Investor profile"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  icon={<BriefcaseBusiness className="h-4 w-4" />}
                  label="Employment Status"
                  placeholder="Self-Employed"
                  value={form.employmentStatus}
                  onChange={(value) => update("employmentStatus", value)}
                />

                <Field
                  icon={<CircleDollarSign className="h-4 w-4" />}
                  label="Source of Funds"
                  placeholder="Software Development & Investment Income"
                  value={form.sourceOfFunds}
                  onChange={(value) => update("sourceOfFunds", value)}
                />

                <Field
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Investment Experience"
                  placeholder="5 years trading stocks, ETFs, and crypto assets"
                  value={form.investmentExperience}
                  onChange={(value) => update("investmentExperience", value)}
                  className="md:col-span-2"
                />
              </div>

              <Button
                className="h-12 w-full rounded-2xl bg-[#d6cc6d] text-base font-bold text-black shadow-xl shadow-[#d6cc6d]/10 transition hover:bg-[#eee27a]"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  <>
                    Complete Profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-white/40">
                Your information is used to complete your Orion account setup.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon: React.ReactNode;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`group space-y-2 ${className}`}>
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white/45">
        <span className="text-[#d6cc6d]">{icon}</span>
        {label}
      </span>

      <div className="relative">
        <Input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 rounded-2xl border-white/10 bg-black/30 pl-4 text-white placeholder:text-white/25 focus-visible:ring-[#d6cc6d]"
        />
      </div>
    </label>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-white/10 pt-5 first:border-t-0 first:pt-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-[#d6cc6d]">
        {icon}
      </span>
      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">
        {title}
      </h3>
    </div>
  );
}

function TrustCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
      <div className="mb-3 text-[#d6cc6d]">{icon}</div>
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-xs text-white/45">{text}</p>
    </div>
  );
}