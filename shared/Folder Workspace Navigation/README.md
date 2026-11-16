# Folder Workspace Navigation

A reusable Custom HTML Block for folder workspaces. Flat navigation cards show each permitted direct child, with a small icon, short description and English/Arabic toggle. There are no business metrics or additional Server Scripts.

## Install once, reuse across folders

1. Open **Custom HTML Block**, create a record named **Folder Workspace Navigation**.
2. Paste all of [navigation.html](navigation.html) into **HTML**.
3. Paste all of [navigation.css](navigation.css) into **Style**.
4. Paste all of [navigation.js](navigation.js) into **Script**, without surrounding `<script>` tags. Save.
5. Open a folder Workspace, e.g. **Procurement & Supply Chain**. Edit its content and add the existing **Folder Workspace Navigation** Custom HTML Block at full width. Save the workspace.
6. Repeat step 5 for Leadership, Sales, Finance, HR and the other folder workspaces. Reuse the same block record; do not create a different script for every department.
7. Leave each child Workspace's native parent/role/module/domain settings in place. The children displayed here are the direct children of that folder in the native sidebar.
8. Hard-refresh and test with the actual reader roles, not only a Workspace Manager account.

No live record was created or updated during development. No API key, environment file or new API method is required in this block.

## Permission behavior

The sole data call is the authenticated native `frappe.desk.desktop.get_workspace_sidebar_items`. Frappe performs its workspace role/module/domain/private-user visibility filtering before the response reaches the block. The code filters that response to the current parent, the same public/private section and non-hidden direct children. It never uses a raw Workspace list or a local role-based grant as a fallback.

- Refresh rechecks the native sidebar response and clears stale cards before the request.
- A failed API check shows an error rather than cached or unrestricted cards.
- No workspace data is stored in local/session storage. Only the per-user language preference is persisted.
- Native Workspace Manager visibility is respected; managers may see workspaces ordinary readers do not. Hidden items are suppressed even for managers in this directory.
- Cards grant no additional access to the child workspace's reports, documents or Custom HTML Blocks. Those retain their own native permissions.
- Native permission caches can affect role changes, just as they affect the sidebar; use the normal site cache/session refresh when testing changed roles.

The server's actual response was checked read-only on the connected ERP. In that response Procurement & Supply Chain had three direct visible children. Inventory will only appear there if its native Workspace is actually parented under that folder and visible to the current reader; the block does not add guessed links.

## Routing and text

The block resolves the current public/private Workspace from the route, then filters `parent_page`. It follows folder route changes and respects the native sidebar order. Search appears for five or more cards, or while an existing search remains active. Browser links support normal click, new-tab and keyboard behavior.

The catalog near the top of the script supplies bilingual titles, descriptions and restrained icons for known dashboards. It does not determine which workspaces exist or who can see them. Newly added child Workspaces appear automatically using their native title and a generic bilingual description. Add an optional catalog entry when more specific editorial text is wanted.

For an unusual embedding where the active route cannot identify the intended folder, the HTML section accepts an optional `data-workspace="Exact visible Workspace name"`. Leave this absent for automatic operation. The pinned folder still must be present in the user's native sidebar response; it cannot override permissions.

## Validation

Sixteen headless-browser checks cover permission-filtered direct children, hidden/private exclusion, stale route context, native URLs, Arabic/RTL, automatic new children, search, refreshed permissions, API failure, folder navigation, empty state, private/public collisions, unknown parents, untrusted title escaping, mobile layout and reinitialization. Syntax was checked and desktop/mobile screenshots were inspected. These fixture checks do not replace a post-install check under your actual restricted ERP roles.

Run from the repository root after installing the tooling dependencies:

```powershell
npm --prefix tools/erp run test:folder-navigation
```

The browser test uses Edge on Windows by default; `PRODUCTION_TEST_BROWSER` can specify another executable. Test screenshots go to ignored `.local/audit/`.

Native behavior references: [server sidebar filtering](https://github.com/frappe/frappe/blob/version-14/frappe/desk/desktop.py), [Workspace routing and parent-child sidebar behavior](https://github.com/frappe/frappe/blob/version-14/frappe/public/js/frappe/views/workspace/workspace.js).
