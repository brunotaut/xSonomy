# Map places

`src/assets/atlas/places-20261102.js` is a small GeoNames gazetteer snapshot, checked
2026-11-02. It contains all 32 landscape-country capitals and the city names matched
from existing published landscape HQ records. No company memberships or research
verdicts are changed by city lookup.

Source: https://download.geonames.org/export/dump/cities500.zip
Format/licence: https://download.geonames.org/export/dump/readme.txt
GeoNames data is CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
The landscape footer provides attribution. The public-domain Natural Earth country
outlines remain unchanged.

Two smaller localities supplement cities500:
- Wappenham (GeoNames 2634799): 52.10629, -1.08833,
  https://www.geonames.org/2634799/wappenham.html
- Heerbrugg (GeoNames 2660395): 47.41488, 9.62684,
  https://www.geonames.org/search.html?q=Switzerland&startRow=750

Matching is exact, accent-insensitive and constrained by ISO country. Retained
aliases include the published HQ spelling and GeoNames names. Empty names cannot
match. A name with multiple candidates is accepted only when the largest candidate
has at least five times the population of the next candidate. This is used only
when preparing this reviewed snapshot, never as runtime fuzzy geocoding.

The runtime prefers gazetteer locality centres, then existing published coordinates
paired with a city name. A missing/unmatched city falls back to the country centre
and is explicitly labelled as city not established, with a dashed circle. It never
inherits a capital's coordinates. Boston/UA, Aaronia/DE and the region names
Lincolnshire/GB and Norfolk/GB are deliberately not resolved as cities. Underlying
company data remains untouched. New city names without published coordinates need
a gazetteer extension; they remain country-only until then.

Country shading uses matching company/investor/hub identities, not office counts.
City group sizes count distinct identities within each visible layer. One identity
may have several cities; city counts must not be summed to infer organisation totals.
Hub office/contact and meeting locations retain their type in the city details and
map tooltip. Dashed country association markers are never presented as offices.
Only labels are decluttered; dots stay anchored while panning and zooming.
