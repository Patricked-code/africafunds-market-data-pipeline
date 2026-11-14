# Source candidate — Bank Al-Maghrib API (issue #16, 2026-11-14)

Status: **DISCOVERY_ONLY / BLOCKED_LICENSE / NO_INGESTION**. This is an additive research note, not a source registration or authorization.

- Primary institution: Bank Al-Maghrib (Morocco), existing Moroccan FX family already represented in original registry; verify existing source ID before any addition to avoid duplication.
- Official developer portal: https://apihelpdesk.centralbankofmorocco.ma/ — explicitly advertises API discovery/documentation and a **free API key subscription**. This establishes an official developer entry point, **not** a reusable open-data licence or a working FX endpoint.
- Official API contract/FX endpoint: **NOT_VERIFIED** (API catalog endpoint, authentication scopes, pagination, date semantics, quota, format and permitted redistribution need direct documentation review).
- Rights: **NOT_VERIFIED**. A free API key is not a licence to redistribute, bulk archive or republish. No credential requested or stored.
- Frequency: **NOT_VERIFIED against primary API docs**. Do not infer from third-party mirrors.
- Observation witness (primary publisher, exact date/value, retrieval response, checksum): **NOT_OBTAINED**. No financial rate, historical coverage or ingestion claim.
- Third-party redistributors are **not authoritative primary evidence**; their MIT SDK licence does not license the underlying central-bank observations.

Acceptance before adding any endpoint: official FX API specification + publisher's permitted access/retention/redistribution terms + legal/robots review + exact request/response with publication/economic dates + raw SHA-256 + parser/normalizer tests + non-regression of 44 original sources. Existing source must be checked for duplication first.

**BLOCK_REASON:** official API specification and data reuse terms, credentials if needed, and a verified primary observation are absent. **NEXT_ACTION:** inspect official API catalog and licence with authorized access; capture one permitted primary witness; only then add an endpoint/parser to existing modules and test it. Do not bypass access controls.
