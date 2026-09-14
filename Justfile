### START COMMON ###
import? 'common.just'

# Show these help docs
[default]
help:
    @just --list --unsorted --justfile {{ source_file() }}

# Pull latest common justfile recipes to local repo
[group("commons")]
sync-commons:
    -rm common.just
    curl -H 'Cache-Control: no-cache, no-store' \
        https://raw.githubusercontent.com/griceturrble/commons/main/common.just?cachebust={{ uuid() }} > common.just
### END COMMON ###

# bootstrap the dev environment
bootstrap:
    just sync-commons
    just bootstrap-commons
    just sync
    just typegen


# Sync project dependencies
sync:
    pnpm install


# Generated Next's ephemeral type stubs
typegen:
    pnpm exec next typegen


# Run dev server
up:
    pnpm dev
