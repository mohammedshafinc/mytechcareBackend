# Local PBKDF2 evidence

Date: 2026-10-20. Runtime: local Node 22, Web Crypto. Three rounds each performed one v1 hash and one verify at PBKDF2-HMAC-SHA-256, 600,000 iterations, 16-byte salt, 32-byte key.

- Median: 153.78 ms
- p95: 155.15 ms
- Maximum: 155.15 ms

This is wall-clock local evidence, not Cloudflare billed CPU. Deployed Worker median/p95/max and a short login spike remain a mandatory release gate. Parameters were not weakened.

Cloudflare prohibits random generation at module-global evaluation. The memory-only dummy record is therefore generated lazily on the first login handled by an isolate and then reused only in that isolate; salt and comparison bytes are generated independently and never persisted, logged, returned, or snapshotted.
