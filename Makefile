PYTHON ?= python
PIP ?= pip
NPM ?= npm

.PHONY: setup install-python install-web hooks test test-python lint-web build-web typecheck-web health web clean

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

web:
	cd web && $(NPM) run dev

clean:
	rm -rf .pytest_cache web/.next web/tsconfig.tsbuildinfo
