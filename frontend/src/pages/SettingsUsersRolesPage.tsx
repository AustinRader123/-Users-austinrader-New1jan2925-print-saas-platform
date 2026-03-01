import React from 'react';
import { apiClient } from '../lib/api';

export default function SettingsUsersRolesPage() {
  const [permissions, setPermissions] = React.useState<any[]>([]);
  const [roles, setRoles] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selectedPermissionKeys, setSelectedPermissionKeys] = React.useState<Record<string, boolean>>({});
  const [assignUserId, setAssignUserId] = React.useState('');
  const [assignRoleId, setAssignRoleId] = React.useState('');

  const load = React.useCallback(async () => {
    const [permRows, roleRows, userRows] = await Promise.all([
      apiClient.listRbacPermissions(),
      apiClient.listRbacRoles(),
      apiClient.listRbacUsers(),
    ]);

    setPermissions(Array.isArray(permRows) ? permRows : []);
    setRoles(Array.isArray(roleRows) ? roleRows : []);
    setUsers(Array.isArray(userRows) ? userRows : []);

    if (!assignUserId && Array.isArray(userRows) && userRows[0]?.user?.id) {
      setAssignUserId(userRows[0].user.id);
    }
    if (!assignRoleId && Array.isArray(roleRows) && roleRows[0]?.id) {
      setAssignRoleId(roleRows[0].id);
    }
  }, [assignRoleId, assignUserId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const createRole = async () => {
    if (!name.trim()) return;
    const permissionKeys = Object.keys(selectedPermissionKeys).filter((key) => selectedPermissionKeys[key]);
    await apiClient.createRbacRole({ name: name.trim(), description: description.trim(), permissionKeys });
    setName('');
    setDescription('');
    setSelectedPermissionKeys({});
    await load();
  };

  const assignRole = async () => {
    if (!assignUserId || !assignRoleId) return;
    await apiClient.assignRbacRole(assignUserId, assignRoleId);
    await load();
  };

  const togglePermission = (key: string) => {
    setSelectedPermissionKeys((state) => ({ ...state, [key]: !state[key] }));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Users & Roles</h1>

      <div className="rounded border bg-white p-4 space-y-3">
        <div className="text-sm font-medium">Create role</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input className="input-base" placeholder="Role name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input-base" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
          {permissions.map((permission) => (
            <label key={permission.id} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(selectedPermissionKeys[permission.name])}
                onChange={() => togglePermission(permission.name)}
              />
              <span>{permission.name}</span>
            </label>
          ))}
        </div>
        <button className="btn btn-primary" onClick={createRole}>Create Role</button>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="text-sm font-medium">Assign role</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select className="input-base" value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}>
            <option value="">Select user</option>
            {users.map((row) => (
              <option key={row.user.id} value={row.user.id}>
                {row.user.email}
              </option>
            ))}
          </select>
          <select className="input-base" value={assignRoleId} onChange={(e) => setAssignRoleId(e.target.value)}>
            <option value="">Select role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={assignRole}>Assign</button>
        </div>
      </div>

      <div className="rounded border bg-white divide-y">
        {roles.map((role) => (
          <div key={role.id} className="p-3 text-sm">
            <div className="font-medium">{role.name}</div>
            <div className="text-slate-500">{role.description || 'No description'}</div>
            <div className="mt-1 text-xs text-slate-600">
              Permissions: {(role.permissions || []).map((p: any) => p.permission?.name).filter(Boolean).join(', ') || 'None'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
