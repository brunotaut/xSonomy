// Portfolio identity and investment evidence are separate. Only unique exact-name
// matches to published companies receive links; ambiguous/unmatched names need review.
export function enrichInvestorProfiles(payload, companies = []) {
  const key = s => String(s || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const names = new Map();
  for (const c of companies) {
    if (!c.slug || c.publication_status !== 'live') continue;
    const k = key(c.name); names.set(k, [...(names.get(k) || []), c]);
  }
  for (const i of payload.investors) {
    i.portfolio = (i.selectedPortfolio || []).map(name => {
      const matches = names.get(key(name)) || [];
      const c = matches.length === 1 ? matches[0] : null;
      return { name, companyId: c?.id || null, companySlug: c?.slug || null,
        url: c ? `/companies/${encodeURIComponent(c.slug)}/` : null,
        matchStatus: c ? 'unique_exact_name' : matches.length ? 'ambiguous' : 'needs_reconciliation',
        relationshipStatus: i.portfolioSource ? 'primary_portfolio_source' : 'research_record',
        sources: i.portfolioSource ? [{url:i.portfolioSource}] : i.sources || [],
        investorContribution: null, roundTotal: null };
    });
  }
  return payload;
}
