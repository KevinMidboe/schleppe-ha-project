#!/usr/bin/env bash

set -euo pipefail

########################################
# CONFIG
########################################
COMPOSE_FILE_NAME="docker-compose.yml"

########################################
# ARGUMENT CHECK
########################################
if [[ $# -ne 1 ]]; then
  echo "Usage: $0 {up|down}"
  exit 1
fi

ACTION="$1"

if [[ "$ACTION" != "up" && "$ACTION" != "down" ]]; then
  echo "Invalid action: $ACTION"
  echo "Allowed actions: up, down"
  exit 1
fi

########################################
# SAVE STARTING DIRECTORY
########################################
START_DIR="$(pwd)"

########################################
# FIND COMPOSE FILES
########################################
mapfile -t COMPOSE_DIRS < <(
  find . -type f -name "$COMPOSE_FILE_NAME" -print0 \
  | xargs -0 -n1 dirname | sort
)

########################################
# LOOP THROUGH DIRECTORIES
########################################
for DIR in "${COMPOSE_DIRS[@]}"; do
  echo "----------------------------------------"
  echo "Processing: $DIR"
  echo "Action: docker-compose $ACTION"
  echo "----------------------------------------"

  cd "$DIR"

  if [[ "$ACTION" == "up" ]]; then
    docker-compose up -d
  else
    docker-compose down
  fi

  cd "$START_DIR"
done

echo "========================================"
echo "Completed docker-compose $ACTION for all stacks"
echo "========================================"

