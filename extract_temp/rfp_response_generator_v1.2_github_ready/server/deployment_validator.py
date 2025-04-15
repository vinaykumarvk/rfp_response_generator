#!/usr/bin/env python3
"""
Deployment Validator for RFP Response Generator

This script validates the deployment environment for the RFP Response Generator,
checking for required files, API keys, and Python packages. It's designed to be
run as a standalone script or as part of a deployment process.
"""

import os
import sys
import json
import importlib.util
import traceback
from pathlib import Path

def validate_file_exists(file_path):
    """Check if a file exists and get its size."""
    path = Path(file_path)
    if path.exists() and path.is_file():
        return {
            "exists": True,
            "size_mb": round(path.stat().st_size / (1024 * 1024), 2),
            "permissions": oct(path.stat().st_mode)[-3:]
        }
    return {"exists": False}

def check_api_keys():
    """Check if required API keys are set in environment variables."""
    keys = {
        "OPENAI_API_KEY": bool(os.environ.get("OPENAI_API_KEY")),
        "ANTHROPIC_API_KEY": bool(os.environ.get("ANTHROPIC_API_KEY")),
        "DEEPSEEK_API_KEY": bool(os.environ.get("DEEPSEEK_API_KEY"))
    }
    return keys

def check_package(package_name):
    """Check if a Python package can be imported."""
    try:
        spec = importlib.util.find_spec(package_name)
        if spec is None:
            return {"available": False, "reason": "Module not found"}
        
        # Try to actually import it to catch any import errors
        module = importlib.import_module(package_name)
        version = getattr(module, "__version__", "Unknown")
        return {"available": True, "version": version}
    except Exception as e:
        return {"available": False, "reason": str(e)}

def check_embedding_file(base_paths=None):
    """
    Check for the embeddings file in multiple possible locations.
    
    Args:
        base_paths: List of base directories to check. If None, uses current directory 
                   and common deployment locations.
    """
    if base_paths is None:
        base_paths = [
            os.getcwd(),
            "/home/runner/workspace",
            "/home/runner/rfp-embeddings",
            "/tmp",
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Parent dir of script
        ]
    
    results = {}
    for base in base_paths:
        full_path = os.path.join(base, "rfp_embeddings.pkl")
        results[full_path] = validate_file_exists(full_path)
    
    return results

def check_database():
    """Check if database configuration is available."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return {"available": False, "reason": "DATABASE_URL not set"}
    
    # We don't actually test the connection to avoid potential side effects
    return {
        "available": True,
        "type": "postgresql" if db_url.startswith("postgres") else "unknown"
    }

def run_validation():
    """Run all validation checks and return results as a dictionary."""
    try:
        # Get the absolute path of the current script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(script_dir)
        
        results = {
            "timestamp": os.environ.get("REPL_SLUG", "") + "-" + os.environ.get("REPL_OWNER", ""),
            "environment": os.environ.get("NODE_ENV", "development"),
            "python_version": sys.version,
            "platform": sys.platform,
            "cwd": os.getcwd(),
            "script_dir": script_dir,
            "project_root": project_root
        }
        
        # Check critical files
        results["critical_files"] = {
            "rfp_response_generator.py": validate_file_exists(os.path.join(script_dir, "rfp_response_generator.py")),
            "moa_synthesis.py": validate_file_exists(os.path.join(script_dir, "moa_synthesis.py")),
            "previous_responses.xlsx": validate_file_exists(os.path.join(project_root, "attached_assets", "previous_responses.xlsx"))
        }
        
        # Check embeddings file in various locations
        results["embeddings_file"] = check_embedding_file()
        
        # Check API keys
        results["api_keys"] = check_api_keys()
        
        # Check required packages
        required_packages = ["openai", "anthropic", "pandas", "numpy", "sklearn", "openpyxl"]
        results["packages"] = {pkg: check_package(pkg) for pkg in required_packages}
        
        # Check database
        results["database"] = check_database()
        
        # Try to load embeddings (without fully importing the module)
        try:
            embedding_paths = [path for path, info in results["embeddings_file"].items() if info["exists"]]
            if embedding_paths:
                try:
                    import pickle
                    with open(embedding_paths[0], 'rb') as f:
                        # Just try to read the first few bytes to see if it's a valid pickle
                        pickle.load(f)
                    results["pickle_test"] = {"valid": True, "path": embedding_paths[0]}
                except Exception as e:
                    results["pickle_test"] = {"valid": False, "error": str(e), "path": embedding_paths[0]}
            else:
                results["pickle_test"] = {"valid": False, "error": "No embeddings file found"}
        except Exception as e:
            results["pickle_test"] = {"valid": False, "error": str(e)}
            
        return results
    except Exception as e:
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }

if __name__ == "__main__":
    results = run_validation()
    print(json.dumps(results, indent=2))