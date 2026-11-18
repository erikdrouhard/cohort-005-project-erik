// PROTOTYPE — throwaway. Mock Notifications for the feed prototype
// ("What does the Notification feed look like, with role labels?").
// In-memory only; nothing here talks to Knock or the database.

export type NotificationRole =
  | "Student"
  | "Instructor"
  | "Team Admin"
  | "Platform Admin";

export type MockNotification = {
  id: string;
  kind:
    | "refund-request-raised"
    | "refund-request-decided"
    | "refund-issued"
    | "refund-failed"
    | "lesson-question"
    | "comment-reply"
    | "seat-claimed";
  role: NotificationRole;
  title: string;
  body: string;
  href: string;
  ago: string;
  bucket: "Today" | "Earlier";
  read: boolean;
};

export type Persona = "carl" | "admin";

export const PERSONAS: Record<Persona, string> = {
  carl: "Carl: Student + Instructor + Team Admin",
  admin: "Priya: Platform Admin",
};

export const ROLE_STYLES: Record<
  NotificationRole,
  { chip: string; stripe: string; dot: string }
> = {
  Student: {
    chip: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
    stripe: "border-l-sky-500",
    dot: "bg-sky-500",
  },
  Instructor: {
    chip: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
    stripe: "border-l-violet-500",
    dot: "bg-violet-500",
  },
  "Team Admin": {
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    stripe: "border-l-amber-500",
    dot: "bg-amber-500",
  },
  "Platform Admin": {
    chip: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    stripe: "border-l-rose-500",
    dot: "bg-rose-500",
  },
};

export function initialNotifications(persona: Persona): MockNotification[] {
  if (persona === "admin") {
    return [
      {
        id: "a1",
        kind: "refund-request-raised",
        role: "Platform Admin",
        title: "New Refund Request",
        body: "Dana Lee asked for a refund on “TypeScript Foundations”: “Course wasn’t what I expected.”",
        href: "/admin/refunds",
        ago: "4m",
        bucket: "Today",
        read: false,
      },
      {
        id: "a2",
        kind: "refund-failed",
        role: "Platform Admin",
        title: "Refund failed",
        body: "The $49.00 Refund to Sam Ortiz for “React Patterns” couldn’t be sent.",
        href: "/admin/refunds",
        ago: "1h",
        bucket: "Today",
        read: false,
      },
      {
        id: "a3",
        kind: "refund-request-raised",
        role: "Platform Admin",
        title: "New Refund Request",
        body: "Acme Corp (Team Licence, 10 Seats) asked for a refund on “Node at Scale”.",
        href: "/admin/refunds",
        ago: "2d",
        bucket: "Earlier",
        read: true,
      },
    ];
  }

  return [
    {
      id: "c1",
      kind: "lesson-question",
      role: "Instructor",
      title: "New question on your course",
      body: "Maya asked in “Hooks in Depth › useEffect cleanup”: “Why does the cleanup run twice in dev?”",
      href: "/instructor/questions",
      ago: "2m",
      bucket: "Today",
      read: false,
    },
    {
      id: "c2",
      kind: "comment-reply",
      role: "Student",
      title: "Reply to your comment",
      body: "Jordan (Instructor) replied in “SQL Basics › Joins”: “Good catch, the LEFT JOIN keeps unmatched rows…”",
      href: "/courses/sql-basics",
      ago: "25m",
      bucket: "Today",
      read: false,
    },
    {
      id: "c3",
      kind: "seat-claimed",
      role: "Team Admin",
      title: "Seat claimed",
      body: "Alex Kim claimed a Seat on your “Node at Scale” Team Licence. 7 of 10 Seats are claimed.",
      href: "/team",
      ago: "1h",
      bucket: "Today",
      read: false,
    },
    {
      id: "c4",
      kind: "comment-reply",
      role: "Instructor",
      title: "Reply in a thread on your course",
      body: "Maya replied to your answer in “Hooks in Depth › Custom hooks”: “That makes sense, thanks!”",
      href: "/instructor/questions",
      ago: "3h",
      bucket: "Today",
      read: true,
    },
    {
      id: "c5",
      kind: "refund-request-decided",
      role: "Student",
      title: "Refund Request approved",
      body: "Your Refund Request for “Design Systems 101” was approved. Your Refund of $39.00 is on its way.",
      href: "/dashboard",
      ago: "1d",
      bucket: "Earlier",
      read: true,
    },
    {
      id: "c6",
      kind: "refund-issued",
      role: "Student",
      title: "Refund issued",
      body: "$39.00 for “Design Systems 101” has been sent back to you.",
      href: "/dashboard",
      ago: "1d",
      bucket: "Earlier",
      read: true,
    },
    {
      id: "c7",
      kind: "lesson-question",
      role: "Instructor",
      title: "New question on your course",
      body: "Ravi asked in “Hooks in Depth › Context”: “Should I memoise the provider value?”",
      href: "/instructor/questions",
      ago: "3d",
      bucket: "Earlier",
      read: true,
    },
  ];
}

// Simulated realtime arrivals, used by "Simulate new" in the switcher.
let counter = 0;
export function simulatedArrival(persona: Persona): MockNotification {
  counter += 1;
  if (persona === "admin") {
    return {
      id: `live-${counter}`,
      kind: "refund-request-raised",
      role: "Platform Admin",
      title: "New Refund Request",
      body: `Live #${counter}: Chris P. asked for a refund on “CSS Grid Mastery”.`,
      href: "/admin/refunds",
      ago: "now",
      bucket: "Today",
      read: false,
    };
  }
  const options: MockNotification[] = [
    {
      id: "",
      kind: "lesson-question",
      role: "Instructor",
      title: "New question on your course",
      body: `Live #${counter}: Sam asked in “Hooks in Depth › Refs”: “When should I reach for useRef?”`,
      href: "/instructor/questions",
      ago: "now",
      bucket: "Today",
      read: false,
    },
    {
      id: "",
      kind: "comment-reply",
      role: "Student",
      title: "Reply to your comment",
      body: `Live #${counter}: Lee replied in “SQL Basics › Indexes”: “Same question here!”`,
      href: "/courses/sql-basics",
      ago: "now",
      bucket: "Today",
      read: false,
    },
    {
      id: "",
      kind: "seat-claimed",
      role: "Team Admin",
      title: "Seat claimed",
      body: `Live #${counter}: Robin claimed a Seat on your “Node at Scale” Team Licence.`,
      href: "/team",
      ago: "now",
      bucket: "Today",
      read: false,
    },
  ];
  return { ...options[counter % options.length], id: `live-${counter}` };
}
