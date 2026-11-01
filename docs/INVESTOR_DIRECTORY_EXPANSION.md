# Investor directory expansion — 31 October 2026

Authorised by Nazar: show more funds, publish an investor list, incorporate the Ukraine workbook, and include unverified candidates with reduced information.

The build merges `scripts/lib/investor-directory.json` with the approved database projection by stable slug. Approved database fields win; Ukraine linkage is retained. The database is unchanged. This supplement remains versioned until the database owner reconciles it.

## Workbook reconciliation

22 populated organisation rows; the second sheet repeats outreach targets and creates no additional identities. Twelve rows match existing research identities: D3, Green Flag Ventures, Darkstar, NATO Innovation Fund, Keen Venture Partners, Expeditions, Freedom Fund VC, MITS Capital, Brave1, Coinvest Capital, Angel One and Vsquared.

Nine standalone additions: UA1 VC, Ukraine Phoenix Tech Fund, ZAS Ventures, Varangians, Shield Capital, Lux Capital, In-Q-Tel, Defender Ventures and Flyer One Ventures. Row 24 groups three separate organisations: R-G.AI, Radius Capital and Network VC. These become three separate unverified candidates, with no attribution of shared deals.

Result: 106 existing + 12 new = 118 research records. Twenty-six carry a Ukraine linkage (the supplied list plus prior Ukraine-associated records). This is not a count of Ukrainian-headquartered VC funds: programmes, strategic investors and international investors retain separate types. Brave1 remains a programme.

No independent web verification of the new workbook assertions was performed in this integration pass. Candidate details intentionally omit fund sizes, deal counts, named people, portfolio claims, check sizes and private OSY Fly fit/outreach notes. The input workbook is unchanged.

## Geography

Published cities retain source-backed approximate locations. Records with no city use clearly labelled country-association markers; these are research-index positions, not offices or headquarters. US-only candidates remain available in the directory outside the European map. The Ukraine-linked filter operates independently of office country.

## Database handoff

Import the twelve new slugs idempotently into research staging; reconcile identity first. Preserve watchlist/unverified status and source row. Store Ukraine linkage independently of HQ and investment eligibility. Broaden the public research projection to include labelled candidates/programmes and zero-location records without changing the companies publication gate. Once the DB exports this full set, remove the supplement only after comparing stable IDs, fields and counts. Do not replace verified data with workbook claims.

## Supplement retired — 1 November 2026

`scripts/lib/investor-directory.json` and `scripts/lib/investor-profiles.mjs` are **deleted**.
Everything they carried is now in the database and reaches the site through
`v_landscape_investors`:

- the twelve workbook additions are `investor_research` rows with `evidence_status='watchlist'`;
- Ukraine linkage is `investor_research.ukraine_related`, independent of office country and
  of investment eligibility;
- the workbook row reference is `investor_research.source_reference`;
- the public projection was broadened from the 21 `deal`/`mandate` records that had a city
  location to the whole reviewed directory of 118, each keeping its own `evidence_status`, so
  unverified candidates stay labelled and programmes stay programmes. The companies
  publication gate was not touched.

Portfolio links are no longer computed at build time by unique exact name match against
published companies. They are stored relationships in `investor_companies`, each with its own
evidence status, source URL and review date, and each pointing at a persistent company id.
Holdings that could not be resolved are listed in `investor_portfolio_unresolved` with the
reason, rather than silently dropped.

Parity was proved before deletion: 118 records in and 118 out, no slug lost or gained, the
Ukraine count unchanged at 26, every holding name from the previous export still present
(case-insensitively) either as a resolved relationship or as a listed unresolved holding, and
both `portfolioSource` URLs still present as relationship sources. The previous export carried
78 portfolio entries; the new one represents 87.
