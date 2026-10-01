# Pages management

The admin sidebar now has **Pages**. Its searchable tree includes the public navigation, submenus, service detail pages, blog posts and simulation categories/details. Main admins with approved accounts can manage it.

## Setup

Apply `supabase/migrations/20261001000000_site_pages_cms.sql` to the same Supabase project used by the website, then deploy the code. The admin screen reports missing storage instead of pretending a save succeeded. Existing public pages continue rendering their original content while the new tables are absent.

The migration creates three tables: public menu/activation settings, private drafts, and published content. RLS restricts writes and draft reads to approved main admins. No production database migration is performed by the application itself.

## Editing

- **Menu visible/hidden** changes desktop and mobile navigation. **Active/inactive** on a page also controls direct URLs and descendant routes. Inactive groups/anchor links affect navigation only. Deactivating Home does not disable every other page.
- **Menu settings** changes the menu label and its order among siblings. A page's title/content is edited separately.
- **Edit page** opens an authenticated same-origin preview. Click text, images, links or containers; use **Select parent** for a containing section. Change text, image URLs/alt text, links, colors, font size/weight, alignment, padding and corners. Existing interactive widgets keep their data/actions.
- Hide existing elements or move directly nested existing sections with the arrow controls. Add sections above/below the existing page, reorder them by dragging or arrows, or remove them. Added sections support a heading, body, image and link button.
- Save a draft, preview desktop/tablet/mobile sizes, then publish. Undo/redo works within the editing session. Restore the published version or original design when needed, and publish to make that restoration live.
- Navigation and activation switches save immediately. Content edits only become public after publishing.

This is a section/element CMS, not the full Elementor product: arbitrary grid construction, embedded simulation internals, rich blog HTML and application logic stay in their existing specialist editors. Image fields accept image URLs. Navigation branding remains in Branding settings. Record-driven pages still use their existing content managers for full record creation/deletion.

## Development and verification

`CmsElement`, `CmsLink` and `CmsImage` preserve the underlying HTML/component structure and apply overrides during server rendering. Stable `cmsId` values live in the source; do not regenerate or rename existing IDs when refactoring. `CmsInstance` scopes repeated cards so their edits do not affect siblings. Do not reuse an ID for a different element.

`node scripts/instrument-cms.cjs` annotates new JSX in the supported public page/component graph and leaves existing IDs alone. Add new route namespaces to that script and the page registry when extending the site. Custom interactive component internals need explicit annotation; scripted simulations are deliberately excluded.

Run `node --test scripts/test-cms.cjs`, the TypeScript check and the production build. For authenticated acceptance testing: save a draft and verify a signed-out visitor sees the old page; publish and verify the new content; hide a submenu and inspect desktop/mobile navigation; deactivate a parent page and verify its direct/detail URLs are unavailable; restore the page. Also verify an unapproved user or sub-admin cannot save or read a draft.

Page availability depends on database access. After setup, availability lookup failures fail closed instead of accidentally serving a deactivated page. The request middleware overwrites internal path/preview headers; a preview additionally verifies the signed-in main-admin profile on the server.
