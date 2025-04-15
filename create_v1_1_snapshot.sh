#!/bin/bash

# Create a snapshot of the current state as version 1.1
echo "Creating snapshot archive as version 1.1..."
timestamp=$(date +"%Y%m%d_%H%M%S")
backup_name="rfp_response_generator_v1.1_snapshot_${timestamp}.tar.gz"

# Exclude large directories and temporary files to keep the archive manageable
tar -czf "$backup_name" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.cache \
    --exclude=.pythonlibs \
    --exclude=__pycache__ \
    --exclude=*.pyc \
    --exclude=dist \
    --exclude=build \
    .

echo "Snapshot archive created: $backup_name"
echo "Archive size: $(du -h "$backup_name" | cut -f1)"
echo
echo "This archive contains the complete state of version 1.1 and can be used for backup or reference purposes."
echo "To push to GitHub, use the 'merge_with_github.sh' script after cloning the repository."