import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/context/app-context';

export interface SectionAccess {
  canViewTasks: boolean;
  canViewCalendar: boolean;
  canViewShopping: boolean;
  canViewDevices: boolean;
  canViewAnalytics: boolean;
}

// Owners and admins always have unrestricted access
const FULL_ACCESS: SectionAccess = {
  canViewTasks: true,
  canViewCalendar: true,
  canViewShopping: true,
  canViewDevices: true,
  canViewAnalytics: true,
};

/**
 * Returns which sections the currently logged-in user can view.
 *
 * Rules:
 *  - owner / admin  → FULL_ACCESS (cannot be restricted)
 *  - member         → whatever flags are set in their permissions JSONB
 *                     (missing flag = default true, same as before)
 *
 * Uses the same React Query keys as settings.tsx and App.tsx so the data is
 * served from cache — no extra network calls.
 */
export function useSectionPermissions(): SectionAccess {
  const { currentHouse, user: firebaseUser } = useAppContext();

  const { data: dbUser } = useQuery({
    queryKey: ['/api/users/me', firebaseUser?.uid],
    queryFn: async () => {
      if (!firebaseUser) return null;
      const res = await fetch(`/api/users/me?uid=${firebaseUser.uid}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!firebaseUser,
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: [`/api/houses/${currentHouse?.id}/members`],
    queryFn: async () => {
      if (!currentHouse) return [];
      const res = await fetch(`/api/houses/${currentHouse.id}/members`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentHouse,
  });

  // While loading, grant full access so there is no flash of "restricted"
  if (!dbUser || !currentHouse) return FULL_ACCESS;

  const member = members.find((m) => m.userId === dbUser.id);
  if (!member) return FULL_ACCESS;

  // Owners and admins are never restricted
  if (member.role === 'owner' || member.role === 'admin') return FULL_ACCESS;

  const perms = (member.permissions as Record<string, boolean>) ?? {};

  return {
    canViewTasks:     perms.canViewTasks     !== false,
    canViewCalendar:  perms.canViewCalendar  !== false,
    canViewShopping:  perms.canViewShopping  !== false,
    canViewDevices:   perms.canViewDevices   !== false,
    canViewAnalytics: perms.canViewAnalytics !== false,
  };
}
