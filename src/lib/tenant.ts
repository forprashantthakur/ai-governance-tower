/**
 * Tenant-isolation helpers.
 *
 * Every record a request touches must belong to the caller's organization
 * (taken from the verified JWT, never from the request). Child records that
 * have no organizationId column of their own are checked through their
 * parent. Callers return 404 when a helper returns null, so other tenants'
 * ids are indistinguishable from ids that do not exist.
 */
import type { OrgMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** The project, if it belongs to the organization. */
export function findProjectInOrg(projectId: string | undefined, organizationId: string) {
  if (!projectId) return Promise.resolve(null);
  return prisma.project.findFirst({ where: { id: projectId, organizationId } });
}

/** The AI model, if it belongs to the organization. */
export function findModelInOrg(modelId: string | undefined | null, organizationId: string) {
  if (!modelId) return Promise.resolve(null);
  return prisma.aIModel.findFirst({ where: { id: modelId, organizationId } });
}

/** The data asset, if it belongs to the organization. */
export function findDataAssetInOrg(dataAssetId: string | undefined | null, organizationId: string) {
  if (!dataAssetId) return Promise.resolve(null);
  return prisma.dataAsset.findFirst({ where: { id: dataAssetId, organizationId } });
}

/** True when the user is an active member of the organization. */
export async function isActiveMember(userId: string | undefined | null, organizationId: string) {
  if (!userId) return false;
  const m = await prisma.organizationMember.findFirst({
    where: { userId, organizationId, isActive: true },
    select: { id: true },
  });
  return !!m;
}

/**
 * True when every non-empty user id is an active member of the organization
 * (optionally holding one of `roles`).
 */
export async function allActiveMembers(
  userIds: (string | undefined | null)[],
  organizationId: string,
  roles?: OrgMemberRole[]
) {
  const ids = Array.from(new Set(userIds.filter((u): u is string => !!u)));
  if (ids.length === 0) return true;
  const count = await prisma.organizationMember.count({
    where: { organizationId, isActive: true, userId: { in: ids }, ...(roles && { role: { in: roles } }) },
  });
  return count === ids.length;
}

/**
 * Where-clause for approval workflows visible to an organization.
 * Older rows were created without organizationId; those linked to a model
 * stay visible to the model's organization.
 */
export function approvalWorkflowsInOrg(organizationId: string) {
  return {
    OR: [
      { organizationId },
      { organizationId: null, model: { organizationId } },
      // Model-less rows created before organizationId was stored are hidden
      // until backfilled by scripts/security-backfill.sql.
    ],
  };
}
