import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast, Toaster } from "sonner";
import {
  Sparkles,
  Copy as CopyIcon,
  ExternalLink,
  RefreshCw,
  Star,
  Users,
  ShieldCheck,
  Scissors,
  Loader2,
  Settings,
  X,
  AlertCircle,
} from "lucide-react";
import { generateReview, type ReviewInput, type ReviewOutput } from "@/lib/review.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JazzUp Salon Review Assistant — Write a genuine review in 60 seconds" },
      {
        name: "description",
        content:
          "Real customers of JazzUp Salon Wakad can craft an authentic Google review in under 60 seconds. Pick what you loved, get three polished versions, post in one tap.",
      },
      { property: "og:title", content: "JazzUp Salon Review Assistant" },
      {
        property: "og:description",
        content: "Write a genuine Google review for JazzUp Salon Wakad in under 60 seconds.",
      },
    ],
  }),
  component: Index,
});

/* ----------------------------- Config & types ----------------------------- */

type Config = {
  salonName: string;
  tagline: string;
  logoUrl: string;
  placeId: string;
  primary: string;
  brand: string;
  showFooter: boolean;
  services: string[];
};

const DEFAULT_CONFIG: Config = {
  salonName: "JazzUp Salon Wakad",
  tagline: "Pune's Premier Beauty Destination for Hair, Skin & Style",
  logoUrl: "https://jazzupsalon.in/storage/local/aajv/app/theme/58/logo-jazzup.png",
  placeId: "ChIJiS3G9nW5wjsR_Ff6aBHnZAw",
  primary: "#0F172A",
  brand: "#F97316",
  showFooter: true,
  services: [
    "Haircut & Styling",
    "Hair Color/Balayage",
    "Keratin/Smoothing/Rebonding",
    "Waxing",
    "Bridal Services",
    "Nails",
    "Skin/Acne Treatment",
    "Other",
  ],
};

const TONES = ["Delighted", "Happy", "Satisfied", "Relaxed"];
const WHO = ["First-time visitor", "Regular customer", "Visited for an occasion"];
const WHY = ["Nearby location", "Recommended by friend", "Good reviews", "Fair pricing", "Expert stylists"];
const LIKED = [
  "Clean & hygienic",
  "Expert stylists",
  "Friendly staff",
  "Fair pricing",
  "Premium products",
  "Quick service",
  "Relaxing ambience",
];
const IMPACT = ["Loved the result", "Got compliments", "Will visit again", "Recommended to friends"];

type FormState = {
  visitType: string;
  tone: string;
  whoAreYou: string;
  whyChose: string;
  liked: string[];
  impact: string;
  staffName: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  visitType: "",
  tone: "",
  whoAreYou: "",
  whyChose: "",
  liked: [],
  impact: "",
  staffName: "",
  notes: "",
};

const FORM_KEY = "jazzup-review-form-v1";
const CONFIG_KEY = "jazzup-review-config-v1";

/* --------------------------------- Page ---------------------------------- */

type View = "form" | "generating" | "results" | "error";

function Index() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [view, setView] = useState<View>("form");
  const [results, setResults] = useState<ReviewOutput | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [adminOpen, setAdminOpen] = useState(false);

  const generate = useServerFn(generateReview);

  // hydrate config + form + admin flag
  useEffect(() => {
    try {
      const cfgRaw = localStorage.getItem(CONFIG_KEY);
      if (cfgRaw) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(cfgRaw) });
      const formRaw = localStorage.getItem(FORM_KEY);
      if (formRaw) setForm({ ...EMPTY_FORM, ...JSON.parse(formRaw) });
      const params = new URLSearchParams(window.location.search);
      if (params.get("admin") === "1") setAdminOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  // persist form
  useEffect(() => {
    try {
      localStorage.setItem(FORM_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form]);

  const reviewUrl = useMemo(
    () => `https://search.google.com/local/writereview?placeid=${encodeURIComponent(config.placeId)}`,
    [config.placeId],
  );

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.visitType) e.visitType = "Pick a service";
    if (!form.tone) e.tone = "Choose how it felt";
    if (!form.whoAreYou) e.whoAreYou = "Tell us about you";
    if (!form.whyChose) e.whyChose = "Pick a reason";
    if (form.liked.length === 0) e.liked = "Select at least one";
    if (!form.impact) e.impact = "Pick an outcome";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onGenerate() {
    if (!validate()) {
      toast.error("Please complete the highlighted fields");
      return;
    }
    setView("generating");
    setErrorMsg("");
    try {
      const payload: ReviewInput = {
        ...form,
        salonName: config.salonName,
        salonLocation: "Wakad, Pune",
      };
      const out = await generate({ data: payload });
      setResults(out);
      setView("results");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setView("error");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="top-center" richColors />
      <Header
        logoUrl={config.logoUrl}
        salonName={config.salonName}
        onAdmin={() => setAdminOpen(true)}
      />

      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6 sm:pt-10">
        {view === "form" && (
          <FormView
            config={config}
            form={form}
            setForm={setForm}
            errors={errors}
            onGenerate={onGenerate}
          />
        )}
        {view === "generating" && <GeneratingView />}
        {view === "results" && results && (
          <ResultsView
            results={results}
            reviewUrl={reviewUrl}
            onRegenerate={onGenerate}
            onEdit={() => setView("form")}
          />
        )}
        {view === "error" && (
          <ErrorView message={errorMsg} onRetry={onGenerate} onBack={() => setView("form")} />
        )}
      </main>

      {config.showFooter && <Footer />}

      {adminOpen && (
        <AdminPanel
          config={config}
          onClose={() => setAdminOpen(false)}
          onSave={(c) => {
            setConfig(c);
            try {
              localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
            } catch {
              /* ignore */
            }
            toast.success("Settings saved");
            setAdminOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* --------------------------------- Header --------------------------------- */

function Header({
  logoUrl,
  salonName,
  onAdmin,
}: {
  logoUrl: string;
  salonName: string;
  onAdmin: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt={`${salonName} logo`}
            className="h-12 w-12 rounded-xl object-cover ring-1 ring-border shadow-card"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="hidden sm:block">
            <div className="text-sm font-semibold leading-tight">{salonName}</div>
            <div className="text-xs text-muted-foreground">Review Assistant</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by AI
          </span>
          <button
            type="button"
            onClick={onAdmin}
            aria-label="Open admin settings"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------- Hero ---------------------------------- */

function Hero({ tagline }: { tagline: string }) {
  return (
    <section className="rounded-3xl bg-gradient-hero px-6 py-8 text-primary-foreground shadow-card">
      <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
        JazzUp Salon{" "}
        <span className="bg-gradient-brand bg-clip-text text-transparent">Review Assistant</span>
      </h1>
      <p className="mt-2 text-base text-primary-foreground/80">
        Write a genuine review in under 60 seconds.
      </p>
      <p className="mt-1 text-xs text-primary-foreground/60">{tagline}</p>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatItem icon={<Users className="h-4 w-4" />} label="1000+" sub="Happy customers" />
        <StatItem icon={<Star className="h-4 w-4 fill-current" />} label="4.8★" sub="Avg. rating" />
        <StatItem icon={<Scissors className="h-4 w-4" />} label="Top" sub="Styling • Keratin" />
        <StatItem icon={<ShieldCheck className="h-4 w-4" />} label="Safe" sub="Hygiene first" />
      </div>
    </section>
  );
}

function StatItem({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-primary-foreground/5 px-3 py-2.5 ring-1 ring-primary-foreground/10">
      <div className="flex items-center gap-1.5 text-[color:var(--brand)]">
        {icon}
        <span className="text-sm font-bold text-primary-foreground">{label}</span>
      </div>
      <div className="mt-0.5 text-[11px] leading-tight text-primary-foreground/70">{sub}</div>
    </div>
  );
}

/* --------------------------------- Form ---------------------------------- */

function FormView({
  config,
  form,
  setForm,
  errors,
  onGenerate,
}: {
  config: Config;
  form: FormState;
  setForm: (f: FormState) => void;
  errors: Partial<Record<keyof FormState, string>>;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-6">
      <Hero tagline={config.tagline} />

      <div className="space-y-6 rounded-3xl bg-card p-5 shadow-card sm:p-6">
        <Field label="Which service did you have?" error={errors.visitType}>
          <ChipGroup
            options={config.services}
            value={form.visitType}
            onChange={(v) => setForm({ ...form, visitType: v })}
          />
        </Field>

        <Field label="How was the experience?" error={errors.tone}>
          <ChipGroup options={TONES} value={form.tone} onChange={(v) => setForm({ ...form, tone: v })} />
        </Field>

        <Field label="Who are you?" error={errors.whoAreYou}>
          <ChipGroup
            options={WHO}
            value={form.whoAreYou}
            onChange={(v) => setForm({ ...form, whoAreYou: v })}
          />
        </Field>

        <Field label="Why did you choose us?" error={errors.whyChose}>
          <ChipGroup
            options={WHY}
            value={form.whyChose}
            onChange={(v) => setForm({ ...form, whyChose: v })}
          />
        </Field>

        <Field label="What did you like most? (pick a few)" error={errors.liked}>
          <ChipGroup
            multi
            options={LIKED}
            values={form.liked}
            onToggle={(v) => {
              const has = form.liked.includes(v);
              setForm({
                ...form,
                liked: has ? form.liked.filter((x) => x !== v) : [...form.liked, v],
              });
            }}
          />
        </Field>

        <Field label="The outcome" error={errors.impact}>
          <ChipGroup
            options={IMPACT}
            value={form.impact}
            onChange={(v) => setForm({ ...form, impact: v })}
          />
        </Field>

        <Field label="Stylist name (optional)">
          <input
            type="text"
            value={form.staffName}
            onChange={(e) => setForm({ ...form, staffName: e.target.value })}
            placeholder="e.g. Riya"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none ring-ring/40 focus:ring-2"
          />
        </Field>

        <Field label="Anything else you'd like to add? (optional)">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="A detail that made your visit special…"
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-base outline-none ring-ring/40 focus:ring-2"
          />
        </Field>

        <div className="pt-2">
          <button
            type="button"
            onClick={onGenerate}
            className="group flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-6 text-base font-semibold text-brand-foreground shadow-brand transition active:scale-[0.98]"
          >
            <Sparkles className="h-5 w-5 transition group-hover:rotate-12" />
            Generate My Reviews
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Keep it honest — this tool just helps you express it better.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-foreground">{label}</label>
      {children}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}

function ChipGroup(
  props:
    | { options: string[]; value: string; onChange: (v: string) => void; multi?: false }
    | { options: string[]; values: string[]; onToggle: (v: string) => void; multi: true },
) {
  return (
    <div className="flex flex-wrap gap-2">
      {props.options.map((opt) => {
        const selected = props.multi ? props.values.includes(opt) : props.value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => (props.multi ? props.onToggle(opt) : props.onChange(opt))}
            className={cn(
              "min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.97]",
              selected
                ? "border-transparent bg-gradient-brand text-brand-foreground shadow-brand"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
            aria-pressed={selected}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------- Generating ------------------------------- */

function GeneratingView() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 animate-ping rounded-full bg-gradient-brand opacity-30" />
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-brand shadow-brand">
          <Sparkles className="h-10 w-10 animate-pulse text-brand-foreground" />
        </div>
      </div>
      <h2 className="mt-6 text-xl font-bold">Crafting your review…</h2>
      <p className="mt-1 text-sm text-muted-foreground">Polishing your words. Just a moment.</p>
      <div className="mt-8 w-full max-w-md space-y-3">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 rounded-2xl bg-card p-4 shadow-card">
      <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-5/6 animate-pulse rounded-full bg-muted" />
    </div>
  );
}

/* --------------------------------- Results -------------------------------- */

function ResultsView({
  results,
  reviewUrl,
  onRegenerate,
  onEdit,
}: {
  results: ReviewOutput;
  reviewUrl: string;
  onRegenerate: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your reviews are ready ✨</h2>
          <p className="text-sm text-muted-foreground">Pick the one that sounds most like you.</p>
        </div>
        <button
          onClick={onEdit}
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Edit
        </button>
      </div>

      <ReviewCard label="SHORT" text={results.short} reviewUrl={reviewUrl} />
      <ReviewCard label="MEDIUM" text={results.medium} reviewUrl={reviewUrl} />
      <ReviewCard label="DETAILED" text={results.detailed} reviewUrl={reviewUrl} />

      <div className="rounded-3xl bg-card p-5 shadow-card">
        <h3 className="text-sm font-semibold">How to post in 4 quick steps</h3>
        <ol className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { n: 1, t: "Tap Post" },
            { n: 2, t: "Choose rating" },
            { n: 3, t: "Paste review" },
            { n: 4, t: "Submit" },
          ].map((s) => (
            <li key={s.n} className="rounded-2xl bg-muted/50 p-3 text-center">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-brand-foreground shadow-brand">
                {s.n}
              </div>
              <p className="mt-2 text-xs font-medium">{s.t}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onRegenerate}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" /> Regenerate
        </button>
      </div>

      <p className="px-4 text-center text-xs text-muted-foreground">
        Your words are your own. This tool only helps you express your experience clearly. Please post
        honest feedback.
      </p>
    </div>
  );
}

function ReviewCard({ label, text, reviewUrl }: { label: string; text: string; reviewUrl: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied! ✅");
    } catch {
      toast.error("Couldn't copy. Please select and copy manually.");
    }
  }

  async function post() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied! Opening Google…");
    } catch {
      /* still open */
    }
    window.open(reviewUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <article className="rounded-3xl bg-card p-5 shadow-card transition hover:shadow-brand/40 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold tracking-wider text-accent-foreground">
          {label}
        </span>
        <div className="flex gap-0.5 text-[color:var(--brand)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" />
          ))}
        </div>
      </div>
      <p className="mt-3 text-base leading-relaxed text-foreground">{text}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          onClick={copy}
          className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted"
        >
          <CopyIcon className="h-4 w-4" /> Copy
        </button>
        <button
          onClick={post}
          className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-gradient-brand text-sm font-semibold text-brand-foreground shadow-brand transition active:scale-[0.98]"
        >
          <ExternalLink className="h-4 w-4" /> Post on Google
        </button>
      </div>
    </article>
  );
}

/* ---------------------------------- Error --------------------------------- */

function ErrorView({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-xl font-bold">Couldn't generate right now.</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {message || "Please try again in a moment."}
      </p>
      <div className="mt-6 flex gap-2">
        <button
          onClick={onBack}
          className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Back
        </button>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-5 py-2 text-sm font-semibold text-brand-foreground shadow-brand"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- Footer --------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-border/60 py-6 text-center">
      <p className="text-xs text-muted-foreground">
        ⚡ Powered by Bhavya Rai Batra
      </p>
    </footer>
  );
}

/* --------------------------------- Loader --------------------------------- */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _loaderShim = Loader2; // keep import for future use

/* ----------------------------- Admin Panel ------------------------------- */

function AdminPanel({
  config,
  onClose,
  onSave,
}: {
  config: Config;
  onClose: () => void;
  onSave: (c: Config) => void;
}) {
  const [draft, setDraft] = useState<Config>(config);
  const [servicesText, setServicesText] = useState(config.services.join("\n"));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-6 shadow-card sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Admin Settings</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <AdminInput
            label="Salon name"
            value={draft.salonName}
            onChange={(v) => setDraft({ ...draft, salonName: v })}
          />
          <AdminInput
            label="Tagline"
            value={draft.tagline}
            onChange={(v) => setDraft({ ...draft, tagline: v })}
          />
          <AdminInput
            label="Logo URL"
            value={draft.logoUrl}
            onChange={(v) => setDraft({ ...draft, logoUrl: v })}
          />
          <AdminInput
            label="Google Place ID"
            value={draft.placeId}
            onChange={(v) => setDraft({ ...draft, placeId: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <AdminInput
              label="Primary color"
              value={draft.primary}
              onChange={(v) => setDraft({ ...draft, primary: v })}
            />
            <AdminInput
              label="Brand color"
              value={draft.brand}
              onChange={(v) => setDraft({ ...draft, brand: v })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Services (one per line)</label>
            <textarea
              rows={8}
              value={servicesText}
              onChange={(e) => setServicesText(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.showFooter}
              onChange={(e) => setDraft({ ...draft, showFooter: e.target.checked })}
            />
            Show "Powered by Bhavya Rai Batra" footer
          </label>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-background py-3 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const services = servicesText
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
              onSave({ ...draft, services: services.length ? services : DEFAULT_CONFIG.services });
            }}
            className="flex-1 rounded-xl bg-gradient-brand py-3 text-sm font-semibold text-brand-foreground shadow-brand"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
    </div>
  );
}
