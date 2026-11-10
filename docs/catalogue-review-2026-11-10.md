# Mercury Mumbai catalogue expansion — reviewed 10 November 2026

## Scope

Six **external** opportunities added to the already-reviewed nine: five `Running / Race` events and one `Chess / Tournament`. No native booking, payment integration, organizer endorsement, advertising imagery, or registration confirmation is implied.

These records are curated from published organizer brochures and event-registration partner listings, not live capacity feeds. Always confirm source freshness, fee changes and entry status with the organizer. The `checkedOn` field records a review of the publicly accessible facts on **2026-11-10**, not a guarantee that places remain.

| New Mercury slug | Event / scheduled date | Published primary/registration source | Review notes |
| --- | --- | --- | --- |
| `indianoil-wnc-navy-half-marathon-2026` | IndianOil WNC Navy Half Marathon / 22 Nov | [RaceMart race details](https://racemart.in/events/indianoil-wnc-navy-half-marathon-2026) | 5K/10K/21K; civilian 5K from ₹1,000; defence-only discounted tickets must not be confused with public fees; page says South Mumbai, so exact start point is explicitly unconfirmed. RaceMart calendar gives 21 Nov as deadline, which is not live capacity |
| `goflorun-women-mumbai-2026` | Stayfree GoFloRun Edition 3 / 29 Nov | [India Running registration listing](https://www.indiarunning.com/events/stayfree_goflorun_29082) | Women-only; 1K/3K/5K; ₹299 for 1K untimed, up to ₹699 for 5K timed; overview gives 20 Nov deadline; event-specific race start times are **not** inferred from placeholder midnight values |
| `nirmal-bang-malad-walkathon-2026` | Nirmal Bang Malad Walkathon 7.0 / 29 Nov | [India Running registration listing](https://www.indiarunning.com/events/nirmalbangmaladwalkathon70-23116) | **₹150 is student-specific** (3K/5K with ID, ages 10–21), not a general price. General 3K walk ₹600, Saree Walk ₹400. Directory sources disagree whether registration closes 22 or 28 Nov, so no definitive deadline is stored |
| `fit-mumbai-marathon-dec-2026` | Fit Mumbai Marathon / 6 Dec | [RaceMart published programme](https://www.racemart.in/events/fit-mumbai-marathon-26) | Ghatkopar EE Highway service road, exact start point unconfirmed; 3K ₹650, timed 5K/10K/21K ₹950. Reporting times described without inventing a start time for 3K |
| `tarabai-shinde-rapid-chess-2026` | 8th Tarabai Shinde FIDE Rapid Rating Chess Championship / 6 Dec | [Official AICF-hosted 5-page brochure](https://aicf.in/wp-content/uploads/2026/09/8th-Tarabai-2-1.pdf), [registration URL printed in brochure](https://circlechess.com/registration?id=54365) | Venue: Agri Koli Sanskruti Bhavan, Palm Beach Road, Sector 24, Nerul. Standard fee ₹1,500; +₹200 late after 3 Dec; AICF registration required and MCA registration for Maharashtra residents. CircleChess checkout was not independently opened during review; URL is verified from brochure |
| `rotary-queen-city-half-marathon-2026` | Rotary Queen City Half Marathon / 20 Dec | [India Running official event listing](https://www.indiarunning.com/events/rotaryqueencityhalfmarathon2026-38601) | Bharat Diamond Bourse, BKC; 2.5K fun ₹700, timed 5K ₹900, 10K ₹1,100, 21K ₹1,300. 5K requires 12+; 10K/21K requires 18+. City listing gives 12 Dec as deadline; availability can change |

## Publication safeguards

- `Race` is a newly supported external event format; native organizer creation remains unchanged. Explore's Format choices reflect the actual published records.
- All six destinations are event-specific HTTPS pages or registration URLs printed in an official federation document. No invented booking links.
- `sourceName` identifies the federation, organizer or race registration partner; none implies Mercury has an organizer partnership.
- Each displayed fee is accompanied by a `priceNote` stating exactly which category/participant unit it applies to.
- Venue ambiguity is expressly disclosed instead of fabricating a reporting point. For user safety, do not infer 12:00 AM race starts from registration platform placeholders.
- Event dates and published facts are a snapshot only. Do not advance `checkedOn` merely because a site responds with HTTP 200.

## Validate before release

```sh
pnpm check
pnpm test
pnpm typecheck
pnpm build
pnpm catalogue:review
pnpm links:check
```

Visual smoke: Explore search by `Chess`, `Running`; select `Race`; verify Fee, Area, Date, status and external details; confirm that five external Running records and the new Chess record link to appropriate details. Re-check all six outbound URLs, then confirm the official source has not changed critical facts.

Do **not** enable `MERCURY_PUBLIC_LAUNCH`, create native bookings or write to live Supabase as part of this catalogue update.
