# UGP-2.1 — Customer-facing Product Information Architecture

Status: implementation candidate on `initiative-universal-growth-platform`

## Goal

SEO ENGINE should present a simple product model to a business owner, SEO manager, marketer, or operator while keeping the existing evidence, governance, verification, and advanced workspaces available underneath.

The primary navigation is intentionally limited to eight customer domains:

1. **Home**
2. **Opportunities**
3. **Content**
4. **Site Audit**
5. **Authority**
6. **Automation**
7. **Performance**
8. **Settings**

This is an information-architecture change only. It does not grant execution authority, enable providers, change database state, or alter the existing Shopify execution gates.

## Customer domain map

| Customer domain | Purpose | Existing capabilities surfaced underneath |
| --- | --- | --- |
| Home | Current search-growth state and next areas requiring attention | Dashboard snapshot, data health, coverage, opportunities, verification, measurement |
| Opportunities | Evidence-backed improvement candidates | Existing opportunity queue and evidence drawer |
| Content | Search research and content-growth workflows | Search intelligence, rankings status, AI visibility; article automation remains explicitly future |
| Site Audit | Technical health, crawl/indexing evidence, internal linking | Technical SEO workspace, crawl coverage, internal-link status |
| Authority | Backlink and competitor authority research | Backlink-gap and competitor evidence from search intelligence; outreach remains future |
| Automation | Review, control, history, and safety of changes | Approvals, actions, deployments, governance |
| Performance | Search performance and measured outcomes | Performance, impact, reports, experiments, learning |
| Settings | Connections and workspace safeguards | Connections plus existing configuration state |

## Routing strategy

Customer-friendly routes are added without deleting established engineering/certification URLs.

Examples:

- `/site-audit/technical` → existing Technical SEO surface;
- `/automation/review` → existing Approvals surface;
- `/automation/history` → existing Deployments surface;
- `/content/research` → existing Search Intelligence surface;
- `/settings/connections` → existing Connections surface.

Legacy URLs remain mounted so bookmarks, certification tests, and advanced inspection are not broken.

## Primary navigation rules

- exactly eight primary destinations;
- no Task identifiers or engineering milestone labels;
- no Governance / Actions / Approvals / Deployments / Connections entries in the default sidebar;
- advanced routes inherit the active state of their customer domain;
- pending approval count is summarized on **Automation**, not exposed as a separate primary workspace;
- desktop and mobile navigation use the same information architecture.

## Truth and availability rules

A simpler interface must not imply capabilities that do not exist.

Therefore:

- live data is never fabricated;
- synthetic research remains visibly marked in the underlying research workspace;
- unavailable ranking/internal-link capabilities remain explicit;
- future article automation and outreach are labelled as coming next;
- connection availability never implies permission to mutate a live site;
- Automation is a customer organization layer over existing safeguards, not a bypass around them.

## Certification strategy

Browser accessibility and responsive product-polish certification runs once for every distinct rendered surface. Customer aliases that point to an already-certified component are validated through route-mapping contracts rather than repeating identical browser suites.

This retains coverage while avoiding duplicate certification work created solely by friendly URLs.

## Next boundary

UGP-2.2 will add progressive disclosure:

1. customer view;
2. evidence view;
3. advanced/technical view.

UGP-2.1 does not remove the underlying evidence or advanced workspaces; it only gives them a customer-facing home.
