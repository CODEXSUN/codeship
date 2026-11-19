# MariaDB recovery diagnostic — 2026-11-19

Bounded read-only infrastructure audit requested during engine recovery. Actual MariaDB11.8.9, persistent volume mariadb-legacy-local_data, CRM source target mariadb:3307. This is separate from PostgreSQL.

Logs show crash recovery and ready04:06:41.238UTC, then Incorrect information in ./app_crm_source/crm_enquiry_activity.frm at04:06:44.322UTC. Earlier03:57:03.604UTC contains the same class of error for app_users.frm after a previous ready03:56:17.038UTC. These align with the CRM owner's startup failures but do not establish the underlying storage cause or persistent corruption.

Current information_schema opens both tables as InnoDB and reports65 InnoDB source tables. Both .frm and .ibd files exist with original Nov18 timestamps. Bounded3s read-only transaction successfully queries both tables (SELECT constant LIMIT1, no business rows returned); crm_enquiry_activity yields no row, app_users yields the constant1. Transaction rolled back. No new errors were returned by a subsequent bounded recent-error-log check. These checks establish current accessibility, not full-table or filesystem integrity. No CHECK/REPAIR/ALTER/reset/import/restart was performed, and no business data was changed. Existing volume and records retained.

Authentication used the existing in-container root-password secret file without printing its value. Initial MARIADB_ROOT_PASSWORD environment assumption failed access because this installation uses a secret file; corrected before diagnostic SQL. Keep any deeper investigation owner-reviewed, with concrete evidence and checked recovery backups before repairs. Do not attribute these .frm errors to PostgreSQL limits or simply extend retry budgets to hide them.
