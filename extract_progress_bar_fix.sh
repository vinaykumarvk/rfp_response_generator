#!/bin/bash
set -e

echo "===== RFP Response Generator - Progress Bar Fix Extractor ====="
echo "This script extracts just the progress bar fix for MOA model generation."

# Extract the files relevant to the progress bar fix
extract_dir="progress_bar_fix"
mkdir -p "$extract_dir"

# Get the current version of ViewData.tsx that has the fix
cp client/src/pages/ViewData.tsx "$extract_dir/"

# Create a README explaining the fix
cat > "$extract_dir/README.md" << 'EOD'
# MOA Progress Bar Fix

This fix addresses the issue where the progress bar continues to be displayed even after the MOA (Mixture of Agents) response generation is complete.

## The Problem

When using the MOA model to generate responses, the progress bar at the top of the page would not disappear after the response was generated, leading to confusion for users.

## The Solution

The fix adds multiple safeguards to ensure the progress indicator state variables are properly reset:

1. Added code to reset progress indicators before starting MOA generation
2. Added code to explicitly clear progress indicators after MOA generation completes
3. Made sure all related state variables are properly reset when any operation completes
4. Added cleanup for single-item MOA generation in addition to bulk generation

## Files Changed

- `ViewData.tsx` - Updated the progress indicator handling in multiple functions

## How to Apply

Copy the `ViewData.tsx` file to your project's `client/src/pages/` directory.
EOD

# Create a small patch file that shows just the changes
cat > "$extract_dir/progress_bar_fix.patch" << 'EOD'
--- ViewData.tsx.original
+++ ViewData.tsx.fixed
@@ -794,9 +794,15 @@
   const handleGenerateLlmResponse = async (requirementId: number, model: string = 'moa') => {
     if (!requirementId) return;
     
+    // Clear any lingering progress indicators first
+    setBulkGenerationProgress({
+      total: 0,
+      completed: 0,
+      isProcessing: false,
+      model: ''
+    });
+    
     try {
-      // Set both the single response indicator and the progress tracking for visual feedback
       setIsGeneratingResponse(true);
       setIsGenerating(true);
       setProcessingItems([requirementId]);
EOD

# Create a tar of the extracted fix
tar -zcf "progress_bar_fix.tar.gz" "$extract_dir"

echo "=== Progress bar fix extracted to: progress_bar_fix.tar.gz ==="
ls -lh "progress_bar_fix.tar.gz"
echo ""
echo "This archive contains just the fix for the progress bar issue."
echo "You can apply this fix independently to any branch or version."

# Let's list all the artifacts we've created for GitHub preparation
echo ""
echo "=== GitHub Preparation Artifacts ==="
ls -lh rfp_response_generator_v1.2_github_ready.tar.gz progress_bar_fix.tar.gz
echo ""
echo "=== Helper Scripts ==="
ls -lh merge_with_github.sh push_to_github.sh extract_progress_bar_fix.sh
