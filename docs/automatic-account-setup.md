# Automatic account setup

Verified Google and email sign-in now proceed directly to the requested page. The first authenticated Mercury API request creates the application profile if missing. Repeated requests keep the same profile, update a changed verified email, and preserve the player's chosen name. Authentication, event ownership and owner permissions still use server-verified identity.

The account-level age/policy checkbox form and its API route have been removed. No age confirmation or policy acceptance is inferred or written automatically. Existing historical account-notice records remain stored; they are no longer required for access or newly created. Event-specific rules and direct-payment acknowledgements belong to the event registration flow.

Account data downloads have been removed from Account, their JavaScript handlers, privacy copy and the server API. The former account consent and account export endpoints return 404. Account closure and privacy support requests remain available. No database migration is required.

Deploy the updated branch to apply this to the official website. Local checks cover new profiles, repeat sessions, chosen-name preservation, email changes, immediate saves, disabled account export endpoints, UI rendering and PostgreSQL behavior. No test account or private user data needs to be created in production for these checks.
