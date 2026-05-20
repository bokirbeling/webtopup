# Issues

## 2026-04-22 14.25.05 - Execution gotcha
- Initial append attempt used a PowerShell here-string in a one-line command and failed with ParserError.
- Resolution: switched to sequential Add-Content lines (append-only), then completed notepad logging successfully.
