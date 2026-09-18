import { useAuth } from '@clerk/clerk-react';
import { useGetDashboard } from '@workspace/api-client-react';
import { getGetDashboardQueryKey } from '@workspace/api-client-react';

export type PortalRole = 'agency_admin' | 'agency_member' | 'client';

export function useRoleAccess() {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: dashboard } = useGetDashboard({ 
    query: { queryKey: getGetDashboardQueryKey() },
    enabled: isLoaded && isSignedIn 
  });

  const user = dashboard?.user;
  const role = user?.role as PortalRole | undefined;
  const agencyId = dashboard?.agency?.id;
  const clientId = user?.clientId;
  const projectIds = user?.projectIds || [];

  const isAgencyAdmin = role === 'agency_admin';
  const isAgencyMember = role === 'agency_member';
  const isAgencyStaff = isAgencyAdmin || isAgencyMember;
  const isClient = role === 'client';

  const canManageTeam = isAgencyAdmin;
  const canInviteClients = isAgencyStaff;
  const canMutateWorkspace = isAgencyStaff;
  const canAccessAllProjects = isAgencyStaff;
  const canAccessOnlyInvitedProjects = isClient;

  const canAccessProject = (projectId: string) => {
    if (isAgencyStaff) return true;
    if (isClient) return projectIds.includes(projectId);
    return false;
  };

  const canAccessClient = (accessClientId: string) => {
    if (isAgencyStaff) return true;
    if (isClient) return clientId === accessClientId;
    return false;
  };

  return {
    role,
    agencyId,
    clientId,
    projectIds,
    isAgencyAdmin,
    isAgencyMember,
    isAgencyStaff,
    isClient,
    canManageTeam,
    canInviteClients,
    canMutateWorkspace,
    canAccessAllProjects,
    canAccessOnlyInvitedProjects,
    canAccessProject,
    canAccessClient,
    isLoaded: isLoaded && !!dashboard,
  };
}
