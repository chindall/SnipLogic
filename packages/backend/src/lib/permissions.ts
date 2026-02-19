import { prisma } from './prisma';

/**
 * Returns true if the user can create/edit/delete content in the given workspace.
 *
 * Rules:
 *  - Personal workspace: owner always has full write access regardless of any roles.
 *  - Shared workspace: user must have EDITOR or WORKSPACE_ADMIN role.
 *  - Global admins are handled upstream (caller should short-circuit with isGlobalAdmin).
 */
export async function canWriteWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      isPersonal: true,
      ownerId: true,
      workspaceRoles: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!workspace) return false;

  // Personal workspace — owner always has full access
  if (workspace.isPersonal && workspace.ownerId === userId) return true;

  // Shared workspace — must have a write-capable role
  const role = workspace.workspaceRoles[0]?.role;
  return role === 'EDITOR' || role === 'WORKSPACE_ADMIN';
}

/**
 * Resolves the workspaceId for a given folderId.
 */
export async function getWorkspaceIdForFolder(folderId: string): Promise<string | null> {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { workspaceId: true },
  });
  return folder?.workspaceId ?? null;
}
