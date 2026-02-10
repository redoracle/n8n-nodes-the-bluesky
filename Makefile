.PHONY: help install clean build dev pack lint lintfix format format-ts test deps update-deps docker-build docker-up dev-bind dev-plugin

SHELL := /bin/sh

NODE ?= node
PNPM ?= pnpm

help: ## Show available targets
	@printf "Usage: make <target>\n\nTargets:\n"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies (pnpm)
	$(PNPM) install

deps: ## Ensure build/test tooling dependencies
	$(PNPM) run deps:ensure

clean: ## Remove build artifacts and dependencies
	$(PNPM) run clean

build: ## Build TypeScript and icons
	$(PNPM) run build

dev: ## Start TypeScript watch mode
	$(PNPM) run dev

pack: ## Build and pnpm pack
	$(PNPM) run pack

lint: ## Run ESLint
	$(PNPM) run lint

lintfix: ## Run ESLint with fixes
	$(PNPM) run lintfix

format: ## Format all files with Prettier
	$(PNPM) run format

format-ts: ## Format TypeScript files with Prettier
	$(PNPM) run format:ts

test: ## Run Jest tests
	$(PNPM) run test

update-deps: ## Update dependencies within semver ranges
	$(PNPM) update

# Docker helpers

docker-build: ## Build dev Docker image
	$(PNPM) run docker:build

docker-up: ## Start dev Docker stack
	$(PNPM) run docker:up

# Dev environment helpers

dev-bind: ## Run bind-mounted dev compose
	$(PNPM) run dev:bind

dev-plugin: ## Run plugin compose (requires built tarball)
	$(PNPM) run dev:plugin
