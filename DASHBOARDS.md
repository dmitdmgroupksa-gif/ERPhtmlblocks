# Dashboard directory

Editable source files grouped by department. Backups are excluded.

Each dashboard contains `dashboard.js`, `dashboard.css`, `dashboard.html`, its original ERP record, and matching custom API scripts.

| Category | Exported dashboards |
| --- | --- |
| [01. Leadership & Corporate](01.%20Leadership%20%26%20Corporate/README.md) | 3 |
| [02. Sales & CRM](02.%20Sales%20%26%20CRM/README.md) | 4 |
| [03. Procurement & Supply Chain](03.%20Procurement%20%26%20Supply%20Chain/README.md) | 4 |
| [04. Finance & Credit Control](04.%20Finance%20%26%20Credit%20Control/README.md) | 16 |
| [05. HR & Administration](05.%20HR%20%26%20Administration/README.md) | 6 |
| [06. Technical & Projects](06.%20Technical%20%26%20Projects/README.md) | 4 |
| [07. IT & Digital Systems](07.%20IT%20%26%20Digital%20Systems/README.md) | 4 |
| [08. Operations & Logistics](08.%20Operations%20%26%20Logistics/README.md) | 9 |
| [09. Legal & Documentation](09.%20Legal%20%26%20Documentation/README.md) | 2 |
| [10. Communication & Productivity](10.%20Communication%20%26%20Productivity/README.md) | 2 |
| [11. To Be Classified](11.%20To%20Be%20Classified/README.md) | 0 |

Unused Customer Dashboard and PN Dashboard placeholders were removed. Customs & Post-Procurement is under Procurement & Supply Chain.

Quotation & SO Tracker maps to Sales CRM & Conversion Tracker Dashboard, whose source uses that displayed title. Blocked Customer Dashboard contains the six department-specific ERP blocks.

Finance Manager, Finance Internal Controller, Digital Marketing, Production, and Plant & Furniture are retained from the earlier requested selection, so some category totals exceed the example counts.

Existing local SOA working files are in each dashboard?s `local/` folder. Their shared backend is in `04. Finance & Credit Control/Shared Server Scripts/`. Executive Secretary is under HR & Administration.

Export and organization utilities are under [tools/erp](tools/erp/README.md). Credentials are in ignored `config/erpapi.env`; temporary exports, logs, and ERP map files are under ignored `.local/`.

Reusable folder navigation block: [Folder Workspace Navigation](shared/Folder%20Workspace%20Navigation/README.md). One block can be added to every folder; child cards follow native Workspace visibility.
