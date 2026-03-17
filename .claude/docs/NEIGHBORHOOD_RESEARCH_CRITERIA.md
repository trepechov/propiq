# Neighborhood Research Criteria

> Saved 2026-03-17. Reuse this doc when adding new neighborhood entities to keep data consistent in structure and depth.

---

## Purpose

Each neighborhood record in PropIQ exists to help the user understand:
1. **Buyer profile** — who buys here and why (demographics, motivations)
2. **Unit preferences** — apartment sizes, floor preferences, garage/parking need
3. **Development volume** — how many active/planned projects exist
4. **Investment signals** — rental demand, yield indicators, price trends

---

## Research prompt (reuse verbatim or adapt)

```
Research the neighborhood "[NAME]" in Sofia, Bulgaria for a real estate analytics tool.
Cover the following in Bulgarian or English (whichever gives richer results):

1. TRANSPORT — metro lines, bus/trolleybus numbers, road/motorway access
2. AMENITIES — supermarkets, schools, hospitals, parks, shopping centers within walking/driving distance
3. NEW CONSTRUCTION — active projects (names, developer, scale, unit types, price/sqm range, completion dates)
4. BUYER PROFILE — who buys here: families, young professionals, investors, students, retirees?
   - What apartment sizes/types are most in demand (studio, 2-room, 3-room)?
   - Is a garage/parking space a priority for buyers here? Why?
   - Is this primarily owner-occupier or investor/rental demand?
5. PRICE SIGNALS — current €/sqm range for new builds, rental price range if available

Search terms to try (Bulgarian):
- "[квартал] Sofia ново строителство купувачи апартаменти 2025 2026"
- "[квартал] квартал София купувачи профил инвестиции"
- "[квартал] Sofia new construction projects buyer profile"
```

---

## Search queries used (2026-03-17)

| Neighborhood | Query |
|---|---|
| Младост 4 | `Младост 4 София ново строителство купувачи апартаменти 2025 2026` |
| Манастирски ливади изток | `Манастирски ливади изток София ново строителство проекти купувачи 2025 2026` |
| Малинова долина | `Малинова долина София ново строителство купувачи апартаменти 2025 2026` |
| Дружба | `Дружба квартал София ново строителство апартаменти купувачи профил 2025` |
| Selection of 5th | `Sofia top neighborhoods most new construction development projects 2025 2026 квартали ново строителство` + `best neighborhoods Sofia new construction 2025 2026 Студентски Витоша Лозенец` |
| Лозенец (5th pick) | covered in overview searches above |

---

## Selection criteria for "top 5 neighborhoods"

A neighborhood qualifies if it meets **at least 3 of these 5 signals**:

| Signal | What to look for |
|---|---|
| **Volume of projects** | 10+ new-build listings on alo.bg / address.bg / bulgarianproperties.bg |
| **Named active projects** | At least 2 developer-named projects (e.g. "Sky City", "Synera Residence") |
| **Investment mentions** | Described as "investment attractive" or "buy-to-let" in market reports |
| **Completion pipeline** | Projects completing 2025–2027 (Act 14 → Act 16 stage) |
| **Price momentum** | Rising €/sqm or cited in top-10 construction permits / market reports |

---

## `target_buyers` vocabulary (allowed values)

These map directly to the `BuyerProfile` enum in `src/config/domain.ts`:

| Value | Use when |
|---|---|
| `families` | Area has schools, kindergartens, parks; larger 3-4 room units dominate |
| `young_professionals` | Near business parks, metro, lively F&B scene; 2-room units popular |
| `investors` | Strong rental demand, buy-to-let mentions, low vacancy, near universities or business hubs |
| `students` | Near university campuses or student housing |
| `retirees` | Quiet, green, good healthcare proximity, no major transport noise |

---

## `neighbourhood_notes` writing guide

Write 3–5 sentences covering:
1. **Character** — what makes this area distinctive
2. **Development activity** — specific project names and scale if known
3. **Buyer motivation** — why people choose this area over alternatives
4. **Garage/parking signal** — explicitly note if parking is scarce (= garages are in high demand and add significant value)
5. **Price anchor** — current €/sqm or price range for reference

---

## Data sources used

- [novitesgradi.bg](https://novitesgradi.bg) — map of new-build projects by neighborhood
- [address.bg](https://address.bg) — new-build project listings with floor plans
- [alo.bg](https://www.alo.bg) — listing counts by area (volume signal)
- [bulgarianproperties.bg](https://www.bulgarianproperties.bg) — English-language listings and reports
- [investropa.com](https://investropa.com) — investment-focused market analysis
- [fortonhomes.com](https://fortonhomes.com) — developer blog with market trend articles
- [capital.bg/biznes/imoti](https://www.capital.bg) — Top 10 construction permits, market journalism
- [novinite.com](https://www.novinite.com) — English-language Sofia real estate news

---

## Entities seeded

| File | Contents |
|---|---|
| `supabase/seeds/001_neighborhoods.sql` | Младост 4, Манастирски ливади - изток, Малинова долина, Дружба, Лозенец |
