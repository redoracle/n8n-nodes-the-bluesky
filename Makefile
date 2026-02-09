.PHONY: help install clean build dev pack lint lintfix format format-ts test deps update-deps docker-build docker-up dev-bind dev-plugin

SHELL := /bin/sh

NODE ?= node
PNPM ?= pnpm
NPM ?= npm

help: ## Show available targets
	@printf "Usage: make <target>\n\nTargets:\n"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies (pnpm)
	$(PNPM) install

deps: ## Ensure build/test tooling dependencies
	$(NPM) run deps:ensure

clean: ## Remove build artifacts and dependencies
	$(NPM) run clean

build: ## Build TypeScript and icons
	$(NPM) run build

dev: ## Start TypeScript watch mode
	$(NPM) run dev

pack: ## Build and npm pack
	$(NPM) run pack

lint: ## Run ESLint
	$(NPM) run lint

lintfix: ## Run ESLint with fixes
	$(NPM) run lintfix

format: ## Format all files with Prettier
	$(NPM) run format

format-ts: ## Format TypeScript files with Prettier
	$(NPM) run format:ts

test: ## Run Jest tests
	$(NPM) run test

update-deps: ## Update dependencies within semver ranges
	$(PNPM) update

# Docker helpers

docker-build: ## Build dev Docker image
	$(NPM) run docker:build

docker-up: ## Start dev Docker stack
	$(NPM) run docker:up

# Dev environment helpers

dev-bind: ## Run bind-mounted dev compose
	$(NPM) run dev:bind

dev-plugin: ## Run plugin compose (requires built tarball)
	$(NPM) run dev:plugin
