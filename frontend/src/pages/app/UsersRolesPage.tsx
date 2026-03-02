import React from 'react';
import { apiClient } from '../../lib/api';
import { withFallback } from '../../lib/apiClient';
import { useAsync } from '../../lib/query';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './ui';

export default function AppUsersRolesPage() {
  const [message, setMessage] = React.useState<string | null>(null);

  const state = useAsync(async () => {
    return withFallback(
      async () => {
        const [usersResp, rolesResp] = await Promise.all([apiClient.listRbacUsers(), apiClient.listRbacRoles()]);
        const users = Array.isArray(usersResp) ? usersResp : (usersResp?.items || usersResp?.users || []);
        const roles = Array.isArray(rolesResp) ? rolesResp : (rolesResp?.items || rolesResp?.roles || []);
        return {
          users: [...users].sort((a: any, b: any) => String(a.email || a.id).localeCompare(String(b.email || b.id))),
          roles: [...roles].sort((a: any, b: any) => String(a.name || a.id).localeCompare(String(b.name || b.id))),
        };
      },
      () => ({ users: [], roles: [] }),
      'users.roles'
    );
  }, []);

  const assignRole = async (userId: string, roleId: string) => {
    if (!roleId) return;
    setMessage(null);
    try {
      await apiClient.assignRbacRole(userId, roleId);
      setMessage('Role assignment updated.');
      await state.refetch();
    } catch (error: any) {
      setMessage(error?.message || 'Role assignment failed.');
    }
  };

  return (
    <div className="deco-page">
      <PageHeader title="Users / Roles" subtitle="Role matrix and permission assignments." />
      {message ? <div className="text-xs text-slate-600">{message}</div> : null}

      {state.loading ? <LoadingState title="Loading users and roles" /> : null}
      {!state.loading && state.error ? <ErrorState message={state.error} onRetry={state.refetch} /> : null}

      {!state.loading && !state.error && state.data && state.data.users.length === 0 ? <EmptyState title="No users found" description="Users appear after auth registrations." /> : null}

      {!state.loading && !state.error && state.data && state.data.users.length > 0 ? (
        <div className="deco-panel">
          <div className="deco-table-wrap">
            <table className="deco-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Assign Role</th>
                </tr>
              </thead>
              <tbody>
                {state.data.users.map((user: any) => {
                  const currentRoleId = String(user.roleId || user.role?.id || '');
                  return (
                    <tr key={user.id}>
                      <td className="font-semibold">{user.name || user.email}</td>
                      <td>{user.email || '—'}</td>
                      <td>{user.role?.name || user.role || '—'}</td>
                      <td>
                        <select
                          className="deco-input"
                          value={currentRoleId}
                          onChange={(event) => assignRole(String(user.id), event.target.value)}
                        >
                          <option value="">Select role</option>
                          {state.data.roles.map((role: any) => (
                            <option key={role.id} value={role.id}>{role.name || role.id}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
