#!/usr/bin/env python3
"""
Calculate fitment score based on available features vs gaps/customizations.
Score ranges from 0.0 to 1.0, representing how much of the requirement is met.
"""

import json
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def calculate_fitment_score(ekg_status, available_features, gaps_customizations, requirement_text=""):
    """
    Calculate fitment score (0.0 to 1.0) based on EKG analysis.
    
    Args:
        ekg_status: 'fully_available', 'partially_available', or 'not_available'
        available_features: List of available features
        gaps_customizations: List of gaps or customizations needed
        requirement_text: Original requirement text (optional, for context)
    
    Returns:
        float: Fitment score between 0.0 and 1.0
    """
    try:
        # Parse JSON strings if needed
        if isinstance(available_features, str):
            try:
                available_features = json.loads(available_features) if available_features else []
            except:
                available_features = []
        
        if isinstance(gaps_customizations, str):
            try:
                gaps_customizations = json.loads(gaps_customizations) if gaps_customizations else []
            except:
                gaps_customizations = []
        
        # Ensure they are lists
        if not isinstance(available_features, list):
            available_features = []
        if not isinstance(gaps_customizations, list):
            gaps_customizations = []
        
        # Base score on status
        if ekg_status == 'fully_available':
            # If fully available, score is 1.0 (or slightly less if there are minor gaps)
            if len(gaps_customizations) == 0:
                return 1.0
            # If there are some gaps but status is fully_available, reduce slightly
            # Each gap reduces score by 0.05, minimum 0.9
            gap_penalty = min(len(gaps_customizations) * 0.05, 0.1)
            return max(1.0 - gap_penalty, 0.9)
        
        elif ekg_status == 'not_available':
            # If not available, score is 0.0 (or slightly higher if there are some features)
            if len(available_features) == 0:
                return 0.0
            # If there are some features but status is not_available, give small credit
            # Each feature adds 0.1, maximum 0.3
            feature_credit = min(len(available_features) * 0.1, 0.3)
            return min(feature_credit, 0.3)
        
        elif ekg_status == 'partially_available':
            # For partially available, calculate based on ratio of features to gaps
            total_items = len(available_features) + len(gaps_customizations)
            
            if total_items == 0:
                # No data available, default to 0.5
                return 0.5
            
            # Base score starts at 0.5 (partial)
            base_score = 0.5
            
            # Calculate feature ratio
            feature_ratio = len(available_features) / total_items
            
            # Adjust score based on feature ratio
            # If more features than gaps, increase score
            # If more gaps than features, decrease score
            adjustment = (feature_ratio - 0.5) * 0.4  # Scale adjustment to ±0.2
            
            # Final score ranges from 0.3 to 0.7 for partial
            final_score = base_score + adjustment
            
            # Clamp to reasonable bounds for partial status
            final_score = max(0.3, min(0.7, final_score))
            
            return round(final_score, 2)
        
        else:
            # Unknown status, default to 0.5
            logger.warning(f"Unknown EKG status: {ekg_status}, defaulting to 0.5")
            return 0.5
    
    except Exception as e:
        logger.error(f"Error calculating fitment score: {str(e)}")
        # Default fallback based on status
        if ekg_status == 'fully_available':
            return 1.0
        elif ekg_status == 'not_available':
            return 0.0
        else:
            return 0.5


def main():
    """Main function for command-line usage."""
    if len(sys.argv) < 4:
        print(json.dumps({
            "success": False,
            "error": "Usage: calculate_fitment_score.py <ekg_status> <available_features_json> <gaps_customizations_json> [requirement_text]"
        }))
        sys.exit(1)
    
    ekg_status = sys.argv[1] or ""
    available_features_str = sys.argv[2] or "[]"
    gaps_customizations_str = sys.argv[3] or "[]"
    requirement_text = sys.argv[4] if len(sys.argv) > 4 else ""
    
    try:
        score = calculate_fitment_score(
            ekg_status,
            available_features_str,
            gaps_customizations_str,
            requirement_text
        )
        
        print(json.dumps({
            "success": True,
            "fitment_score": score
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()





