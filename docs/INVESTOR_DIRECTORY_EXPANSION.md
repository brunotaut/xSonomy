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
