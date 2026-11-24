# Shared local SOA backend

Existing workspace versions, preserved with all local edits. Used by SOA Request, SOA Manager, and Collector.

- [SOA API](soa_api_server_script.py)
- [SOA workflow API](soa_workflow_api_server_script.py)
- [Daily collections scheduler](collections_daily_build.py)

Dashboard folders also retain the API sources downloaded from ERP. Keep shared changes consistent when preparing an ERP update.

## 24 Nov 2026 · request names by type, safe PDF rebuilds

- **Names:** new SOA Requests are named by type: `SOA-` (Outstanding SOA), `CBC-` (Customer Balance Confirmation), `LDG-` (Customer Ledger).
  - The SOA Request DocType now uses `format:{naming_prefix}-{customer}-{####}`. `naming_prefix` is a hidden field set by `soa_api` (`NAME_PREFIX`).
  - The number still comes from the site-wide counter.
  - Older records keep their `SOA-` name. The SOA Manager and SOA Request dashboards show them with the type prefix, but links use the real name.
- **Missing PDFs (fixed):** rebuilding a PDF used to delete the old file from disk before the new one was saved. If the request then failed and rolled back, the File record came back pointing at a deleted PDF.
  - This happened to two Balance Confirmations (RTCC – Wadi Laban, 21113 and 21114). Both are rebuilt.
  - Old generated PDFs are now only detached, and deleted on the next rebuild once they are no longer referenced (`purge_old_files`).
  - "Open PDF preview" rebuilds a statement or ledger whose PDF is missing.
  - Opening a missing file shows a clear message instead of a server error.
- All three `soa_api_cca237a6.py` copies (Collector, SOA Manager, SOA Request Dashboard) were updated to match.

