// PROTOTYPE — throwaway. Three structurally different Notification feeds,
// switchable via ?variant=A|B|C with the floating bar at the bottom centre.
//   A: Bell dropdown. A bell in the sidebar header opens a popover; role shown as a chip.
//   B: Drawer with role tabs. A sidebar nav item opens a right-hand slide-over, filtered by role tabs.
//   C: Inbox page. A top bar in the main area with a bell; opens a full inbox grouped by role.
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import {
  PERSONAS,
  ROLE_STYLES,
  initialNotifications,
  simulatedArrival,
  type MockNotification,
  type NotificationRole,
  type Persona,
} from "./mock-data";

const VARIANTS = {
  A: "Bell dropdown",
  B: "Drawer with role tabs",
  C: "Inbox page",
} as const;
type VariantKey = keyof typeof VARIANTS;
const KEYS = Object.keys(VARIANTS) as VariantKey[];

type FeedState = {
  variant: VariantKey;
  items: MockNotification[];
  unread: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const FeedContext = createContext<FeedState | null>(null);
const useFeed = () => useContext(FeedContext)!;

export function NotificationsPrototypeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [params] = useSearchParams();
  const variant = (params.get("variant")?.toUpperCase() as VariantKey) || "A";
  const [persona, setPersona] = useState<Persona>("carl");
  const [items, setItems] = useState(() => initialNotifications("carl"));

  useEffect(() => setItems(initialNotifications(persona)), [persona]);

  const state: FeedState = {
    variant: KEYS.includes(variant) ? variant : "A",
    items,
    unread: items.filter((n) => !n.read).length,
    markRead: (id) =>
      setItems((xs) => xs.map((n) => (n.id === id ? { ...n, read: true } : n))),
    markAllRead: () => setItems((xs) => xs.map((n) => ({ ...n, read: true }))),
  };

  function simulate() {
    const n = simulatedArrival(persona);
    setItems((xs) => [n, ...xs]);
    toast(n.title, { description: `${n.role} · ${n.body}` });
  }

  return (
    <FeedContext.Provider value={state}>
      {children}
      {process.env.NODE_ENV !== "production" && (
        <PrototypeSwitcher
          current={state.variant}
          persona={persona}
          setPersona={setPersona}
          simulate={simulate}
          unread={state.unread}
        />
      )}
    </FeedContext.Provider>
  );
}

// ─── Shared bits ───

function RoleChip({ role }: { role: NotificationRole }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        ROLE_STYLES[role].chip
      )}
    >
      {role}
    </span>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}

// ─── Mount points (used by the layout / sidebar) ───

export function NotificationsSidebarHeaderSlot() {
  const { variant } = useFeed();
  return variant === "A" ? <VariantABell /> : null;
}

export function NotificationsSidebarNavSlot() {
  const { variant } = useFeed();
  return variant === "B" ? <VariantBNavItem /> : null;
}

export function NotificationsMainTopSlot() {
  const { variant } = useFeed();
  return variant === "C" ? <VariantCTopBar /> : null;
}

// ─── Variant A: Bell dropdown ───

function VariantABell() {
  const { items, unread, markRead, markAllRead } = useFeed();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative ml-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent"
        title="Notifications"
      >
        <Bell className="size-4" />
        <UnreadBadge count={unread} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-50 w-96 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-sm font-semibold">Notifications</span>
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            </div>
            <ul className="max-h-[28rem] divide-y overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                      navigate(n.href + window.location.search);
                    }}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left hover:bg-accent",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        n.read ? "bg-transparent" : "bg-primary"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <RoleChip role={n.role} />
                        <span className="ml-auto text-xs text-muted-foreground">
                          {n.ago}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm font-medium">
                        {n.title}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        {n.body}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Variant B: Drawer with role tabs ───

function VariantBNavItem() {
  const { unread } = useFeed();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Inbox className="size-4" />
        Notifications
        {unread > 0 && (
          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            {unread}
          </span>
        )}
      </button>
      {open && <VariantBDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

function VariantBDrawer({ onClose }: { onClose: () => void }) {
  const { items, markRead, markAllRead } = useFeed();
  const roles = Array.from(new Set(items.map((n) => n.role)));
  const [tab, setTab] = useState<NotificationRole | "All">("All");
  const shown = tab === "All" ? items : items.filter((n) => n.role === tab);
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[26rem] flex-col border-l bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">Notifications</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
            <button onClick={onClose} className="rounded p-1 hover:bg-accent">
              <X className="size-4" />
            </button>
          </div>
        </div>
        {roles.length > 1 && (
          <div className="flex gap-1 border-b px-3 py-2">
            {(["All", ...roles] as const).map((r) => {
              const count = (r === "All" ? items : items.filter((n) => n.role === r)).filter(
                (n) => !n.read
              ).length;
              return (
                <button
                  key={r}
                  onClick={() => setTab(r)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
                    tab === r ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60"
                  )}
                >
                  {r !== "All" && (
                    <span className={cn("size-2 rounded-full", ROLE_STYLES[r].dot)} />
                  )}
                  {r === "All" ? "All" : `As ${r}`}
                  {count > 0 && <span className="text-[10px] opacity-70">({count})</span>}
                </button>
              );
            })}
          </div>
        )}
        <ul className="flex-1 space-y-2 overflow-y-auto p-3">
          {shown.map((n) => (
            <li
              key={n.id}
              className={cn(
                "rounded-lg border p-3",
                n.read ? "opacity-70" : "border-primary/30 bg-primary/5"
              )}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{n.title}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {tab === "All" && <RoleChip role={n.role} />}
                    <span className="text-xs text-muted-foreground">{n.ago} ago</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    markRead(n.id);
                    onClose();
                    navigate(n.href + window.location.search);
                  }}
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                >
                  Open
                </button>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="rounded-md border px-2.5 py-1 text-xs"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

// ─── Variant C: Inbox page ───

function VariantCTopBar() {
  const { unread } = useFeed();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-end gap-3 border-b bg-background/95 px-6 backdrop-blur">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "relative flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
            open && "bg-accent"
          )}
        >
          <Bell className="size-4" />
          Inbox
          {unread > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </button>
      </div>
      {open && <VariantCInbox onClose={() => setOpen(false)} />}
    </>
  );
}

function VariantCInbox({ onClose }: { onClose: () => void }) {
  const { items, markRead, markAllRead } = useFeed();
  const navigate = useNavigate();
  const order: NotificationRole[] = ["Instructor", "Team Admin", "Student", "Platform Admin"];
  const groups = order
    .map((role) => ({ role, list: items.filter((n) => n.role === role) }))
    .filter((g) => g.list.length > 0);

  return (
    <div className="absolute inset-x-0 bottom-0 top-14 z-20 overflow-y-auto bg-background">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">Inbox</h1>
            <p className="text-sm text-muted-foreground">
              Grouped by the role each Notification is for.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={markAllRead} className="rounded-md border px-3 py-1.5 text-sm">
              Mark all read
            </button>
            <button onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm">
              Close
            </button>
          </div>
        </div>
        {groups.map((g) => (
          <section key={g.role} className="mb-8">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className={cn("size-2.5 rounded-full", ROLE_STYLES[g.role].dot)} />
              As {g.role}
              <span className="font-normal normal-case">
                · {g.list.filter((n) => !n.read).length} unread
              </span>
            </h2>
            <div className="divide-y rounded-lg border">
              {g.list.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    markRead(n.id);
                    onClose();
                    navigate(n.href + window.location.search);
                  }}
                  className={cn(
                    "flex w-full items-baseline gap-4 border-l-4 text-left px-4 py-3 hover:bg-accent",
                    ROLE_STYLES[n.role].stripe,
                    n.read ? "text-muted-foreground" : "bg-primary/5"
                  )}
                >
                  <span className={cn("w-56 shrink-0 truncate text-sm", !n.read && "font-semibold text-foreground")}>
                    {n.title}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{n.body}</span>
                  <span className="shrink-0 text-xs">{n.ago}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ─── Floating switcher (prototype chrome, not part of the design) ───

function PrototypeSwitcher({
  current,
  persona,
  setPersona,
  simulate,
  unread,
}: {
  current: VariantKey;
  persona: Persona;
  setPersona: (p: Persona) => void;
  simulate: () => void;
  unread: number;
}) {
  const [params, setParams] = useSearchParams();

  function go(delta: number) {
    const i = (KEYS.indexOf(current) + delta + KEYS.length) % KEYS.length;
    const next = new URLSearchParams(params);
    next.set("variant", KEYS[i]);
    setParams(next, { replace: true });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-zinc-900 px-2 py-1.5 text-xs text-white shadow-2xl ring-2 ring-fuchsia-500">
      <span className="pl-2 font-bold text-fuchsia-300">PROTOTYPE</span>
      <button onClick={() => go(-1)} className="rounded-full p-1 hover:bg-white/10">
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-40 text-center font-medium">
        {current} ({VARIANTS[current]})
      </span>
      <button onClick={() => go(1)} className="rounded-full p-1 hover:bg-white/10">
        <ChevronRight className="size-4" />
      </button>
      <select
        value={persona}
        onChange={(e) => setPersona(e.target.value as Persona)}
        className="rounded-full bg-white/10 px-2 py-1 text-xs"
      >
        {Object.entries(PERSONAS).map(([k, label]) => (
          <option key={k} value={k} className="text-black">
            {label}
          </option>
        ))}
      </select>
      <button onClick={simulate} className="rounded-full bg-fuchsia-600 px-3 py-1 font-medium hover:bg-fuchsia-500">
        Simulate new
      </button>
      <span className="pr-2 text-white/60">unread: {unread}</span>
    </div>
  );
}
