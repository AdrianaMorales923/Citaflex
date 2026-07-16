import { useCallback, useEffect, useState } from "react";
import { Calendar, UserPlus, Star, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import supabase from "./supabase";
import { useAuth } from "./auth-context";

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
    if (!user) { setLoading(false); return; }

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
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearAll = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);
    setNotifs([]);
  }, [user]);

  return { notifs, unread, loading, markAllRead, markRead, clearAll, refetch: fetchNotifs };
}

/**
 * Create a notification in the database.
 * Call this from any component that performs an action worth notifying about.
 */
export async function createNotification(
  userId: string,
  opts: { title: string; description: string; tone?: NotifTone; icon?: string }
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    title: opts.title,
    description: opts.description,
    tone: opts.tone ?? "primary",
    icon: opts.icon ?? "Calendar",
  });
}
