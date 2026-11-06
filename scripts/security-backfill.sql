-- One-off data fixes that go with the security hardening release.
-- Run once against production (inside a transaction), ideally right after deploying.
-- Review the SELECT output before committing.

BEGIN;

-- 1. Approval workflows created before organization_id was stored.
--    Rows linked to a model take the model's organization.
UPDATE approval_workflows w
SET organization_id = m.organization_id
FROM ai_models m
WHERE w.organization_id IS NULL
  AND w.model_id = m.id
  AND m.organization_id IS NOT NULL;

--    Model-less rows take the requester's earliest active membership outside the
--    old shared demo organization. Check the rows below by hand if a requester
--    belongs to more than one organization.
SELECT w.id, w.title, w.requested_by, COUNT(om.id) AS memberships
FROM approval_workflows w
JOIN organization_members om ON om.user_id = w.requested_by AND om.is_active
JOIN organizations o ON o.id = om.organization_id AND o.slug <> 'demo-bank-cio'
WHERE w.organization_id IS NULL AND w.model_id IS NULL
GROUP BY w.id, w.title, w.requested_by
HAVING COUNT(om.id) > 1;

UPDATE approval_workflows w
SET organization_id = (
  SELECT om.organization_id
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = w.requested_by
    AND om.is_active
    AND o.slug <> 'demo-bank-cio'
  ORDER BY om.joined_at ASC
  LIMIT 1
)
WHERE w.organization_id IS NULL AND w.model_id IS NULL;

-- 2. The old CIO demo organization was shared by every customer who loaded it.
--    Demos are now per user (slug demo-bank-cio-<userId>); deactivate the shared one.
UPDATE organization_members
SET is_active = false
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'demo-bank-cio');

UPDATE organizations SET is_active = false WHERE slug = 'demo-bank-cio';

COMMIT;
