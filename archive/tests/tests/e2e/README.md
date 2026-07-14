# E2E Test Suite

This suite is rebuilt from scratch for real-backend coverage with API key authentication.

Run it with:

```bash
E2E_BACKEND_MODE=real E2E_API_KEY=your_api_key_here pnpm exec playwright test
```

The default `chromium` project excludes `debug-*.spec.ts` diagnostics so the
main suite stays focused on repeatable coverage. Run diagnostic specs
explicitly when needed:

```bash
E2E_BACKEND_MODE=real E2E_INCLUDE_DEBUG=1 E2E_API_KEY=your_api_key_here pnpm exec playwright test --project=debug-chromium
```
