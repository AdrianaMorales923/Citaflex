import { useCallback, useEffect, useState } from "react";
import { Calendar, UserPlus, Star, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import supabase from "./supabase";
import { useAuth } from "./auth-context";

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

export type NotifTone = "primary" | "success" | "warning";

export interface Notification {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  time: string;
  read: boolean;
  tone: NotifTone;
}

interface DbNotification {
  id: string;
  user_id: string;
  title: string;
  description: string;
  tone: string;
  icon: string;
  read: boolean;
  created_at: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Calendar,
  UserPlus,
  Star,
  Clock,
  AlertCircle,
  CheckCircle2,
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Ahora mismo";
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 172800) return "Ayer";
  return `Hace ${Math.floor(seconds / 86400)} días`;
}

function mapDbNotif(row: DbNotification): Notification {
  return {
    id: row.id,
    icon: ICON_MAP[row.icon] ?? Calendar,
    title: row.title,
    description: row.description,
    time: timeAgo(row.created_at),
    read: row.read,
    tone: (row.tone as NotifTone) ?? "primary",
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setNotifs((data ?? []).map(mapDbNotif));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  // Realtime: las notificaciones llegan sin recargar. RLS garantiza que solo
  // veas las tuyas (user_id = auth.uid()).
  useEffect(() => {
    if (!user) return;

    const onInsert = (payload: RealtimePayload) => {
      const row = payload.new as DbNotification | null;
      if (!row) return;
      setNotifs((prev) => [mapDbNotif(row), ...prev.filter((n) => n.id !== row.id)].slice(0, 50));
    };
    const onUpdate = (payload: RealtimePayload) => {
      const row = payload.new as DbNotification | null;
      if (!row) return;
      setNotifs((prev) => prev.map((n) => (n.id === row.id ? mapDbNotif(row) : n)));
    };
    const onDelete = (payload: RealtimePayload) => {
      const id = (payload.old as { id?: string } | null)?.id;
      if (!id) return;
      setNotifs((prev) => prev.filter((n) => n.id !== id));
    };
    const filter = `user_id=eq.${user.id}`;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter },
        onInsert,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter },
        onUpdate,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter },
        onDelete,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unread = notifs.filter((n) => !n.read).length;

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearAll = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifs([]);
  }, [user]);

  return { notifs, unread, loading, markAllRead, markRead, clearAll, refetch: fetchNotifs };
}

/**
 * Create a notification in the database.
 * Uses the `create_notification` RPC (security definer) so it works for any
 * acting user (auth or anon, e.g. the public `/book` page) and can target
 * other users (admin, staff) without needing INSERT on their feed.
 */
export async function createNotification(
  userId: string,
  opts: { title: string; description: string; tone?: NotifTone; icon?: string },
) {
  const { error } = await supabase.rpc("create_notification", {
    user_id: userId,
    title: opts.title,
    description: opts.description,
    tone: opts.tone ?? "primary",
    icon: opts.icon ?? "Calendar",
  });
  if (error) console.warn("create_notification:", error.message);
}

type NotifyRole = "admin" | "staff";

/**
 * Notify every registered user of the given roles (defaults to admins + staff).
 * Recipients are resolved server-side by the `notify_roles` RPC (security
 * definer), so it also works from the public anon `/book` page where RLS
 * blocks reading `users`.
 */
export async function notifyRoles(
  opts: { title: string; description: string; tone?: NotifTone; icon?: string },
  roles: NotifyRole[] = ["admin", "staff"],
) {
  const { error } = await supabase.rpc("notify_roles", {
    roles,
    title: opts.title,
    description: opts.description,
    tone: opts.tone ?? "primary",
    icon: opts.icon ?? "Calendar",
  });
  if (error) console.warn("notify_roles:", error.message);
}
