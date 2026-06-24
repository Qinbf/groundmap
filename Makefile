PYTHON ?= python
PIP ?= pip
NPM ?= npm

# Local dev servers listen on localhost. When a system/terminal proxy is on
# (e.g. Clash/V2Ray exporting http_proxy), tools that honor it would route
# loopback traffic through the proxy and fail. Force loopback to bypass the
# proxy so `make web` / `make dev` work whether or not a proxy is active.
NOPROXY := localhost,127.0.0.1,::1
PROXY_BYPASS := no_proxy="$(NOPROXY)" NO_PROXY="$(NOPROXY)"

.PHONY: setup install-python install-web hooks test test-python lint-web build-web typecheck-web health web dev clean

setup: install-python install-web hooks

install-python:
	$(PYTHON) -m pip install -r requirements-dev.txt

install-web:
	cd web && $(NPM) install

hooks:
	bash scripts/install_hooks.sh

test: test-python lint-web build-web health

test-python:
	$(PYTHON) -m pytest scripts/tests

lint-web:
	cd web && $(NPM) run lint

# WARNING: build-web runs `next build`, which shares web/.next/ with the dev server.
# If a local `make web` / `npm run dev` is running, stop it first or it may serve 404s.
# For a types-only check that is safe to run alongside a dev server, use: make typecheck-web
build-web:
	cd web && $(NPM) run build

typecheck-web:
	cd web && npx tsc --noEmit

health:
	$(PYTHON) scripts/k.py health --json

# Web console only (:3006).
web:
	cd web && $(PROXY_BYPASS) $(NPM) run dev

# Web console (:3006) + debug console (:3100) together; Ctrl-C stops both.
# Both inherit the loopback proxy bypass above.
dev:
	cd web && $(PROXY_BYPASS) $(NPM) run dev:all

clean:
	rm -rf .pytest_cache web/.next web/tsconfig.tsbuildinfo
