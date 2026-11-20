# CodeShip1.0.27

Fix switching from a tenant session to explicit /sa/login: original shared login asks for credentials and requests the SA realm; unsuccessful login preserves the existing session, successful login returns to the dashboard and verifies permissions. No permission grant, shared dependency, database or Cloudflare change. Three route regression tests/typecheck passed; production build and tagged CI gate deployment. VPS only; local deployment remains stopped.
