# ERP source utilities

Run these commands from the repository root.

```powershell
python tools/erp/export_erp_dashboards.py --dashboards tools/erp/dashboard_selection.json
python tools/erp/organize_dashboards.py --source .local/erp_exports/EXPORT_TIMESTAMP
```

Credentials are read from `config/erpapi.env` and are excluded from Git. New exports go under `.local/erp_exports/`. The organizer refuses to replace existing dashboard folders, preserving local edits.

`dashboard_hierarchy.json` maps department folders and display names to exact ERP block names. `dashboard_directory_manifest.json` records the organized source inventory and file hashes. Original ERP records remain in each dashboard?s `source.json`.
