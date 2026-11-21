# NCH frontend

React 19 + Rsbuild + React Router + Axios, JavaScript only. Deployed on Vercel.
Full context: the plans in the backend repo, docs/NCH_Architecture_Plan.md and docs/NCH_Development_Plan.md.

## Commands
- Build: `npm run build`
- Format only the files you changed: `npx prettier --write <files>`. Do not reformat other files; if a file was already not prettier-clean, re-apply only your edits and say so.

## Hard rules
- Never read, print or commit .env files with secrets. Rsbuild exposes only PUBLIC_* variables (PUBLIC_API_BASE_URL).
- No commit or push unless I ask. No new packages without approval.
- Plan first: inspect, show the plan, wait for approval, then implement. Do not guess UI or business rules; ask.
- Backend is authoritative for money, stock and validation. The frontend only mirrors it.
- Reuse existing components, styles and helpers. One routed component per workflow; no PageFixed/PageFinal duplicates.
- Every internal page has a left-aligned button whose text is exactly `Back`.
- Every API screen needs loading, error with retry, and empty states. Never show undefined, null or NaN. Disable buttons while saving.
- Responsive: check 360/390/430px, tablet and desktop. No page-level horizontal overflow, no nested cards on mobile, controls at least 40px, keep bottom clearance for the fixed mobile nav. Tables need a compact mobile layout; local scroll only inside a card.
- Mobile changes go in `@media (max-width: 768px)` blocks so desktop stays unchanged.
- Dates display as DD/MM/YY or dd Mon yyyy; business date is Asia/Kolkata.
- Do not touch print CSS unless the task is about printing.

## Finish every task with this report
Files changed, build and prettier results, what was not tested in a browser, known risks, live phone and desktop checks for me.