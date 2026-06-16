# Security Policy

## Supported Versions

The default branch is the only supported development line until the project starts publishing tagged releases.

## Reporting a Vulnerability

Please do not open a public issue for security vulnerabilities.

Once the public repository exists, report vulnerabilities through GitHub Security Advisories. If advisories are not enabled yet, contact the maintainer through the contact method listed in the repository profile.

Useful reports include:

- affected commit or release,
- reproduction steps,
- expected impact,
- whether private files, raw documents, or locked pages can be read or written,
- relevant logs or screenshots.

## Security Boundaries

The core repository should not contain embedded LLM SDK calls, API keys, hosted credentials, or private customer data.

Protected content rules:

- `raw/**` source files are read-only for agents.
- `my_thoughts/**` is human-only.
- files with `locked: true` frontmatter are read-only.
- files tagged `human-only` are read-only.

Please treat bypasses of those rules as security bugs.
