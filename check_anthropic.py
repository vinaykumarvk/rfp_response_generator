import os
import sys

# Check if Anthropic API key is available
anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")

print(f"Checking Anthropic API key:")
if not anthropic_api_key:
    print("❌ ANTHROPIC_API_KEY not found in environment variables")
    sys.exit(1)

print(f"✅ ANTHROPIC_API_KEY found with length: {len(anthropic_api_key)}")
print(f"  Key preview: {anthropic_api_key[:5]}...")

try:
    print("\nTesting Anthropic API import:")
    from anthropic import Anthropic
    print("✅ Successfully imported Anthropic module")
    
    # Create client
    client = Anthropic(api_key=anthropic_api_key)
    print("✅ Successfully created Anthropic client")
    
    # Test a simple API call with minimal tokens
    print("\nMaking a simple API call (this may take a few seconds)...")
    model = "claude-3-5-sonnet-20240620"  # Using newer model
    print(f"Using model: {model}")
    response = client.messages.create(
        model=model,
        max_tokens=10,
        messages=[
            {"role": "user", "content": "Hello, can you say hi?"}
        ]
    )
    
    print(f"✅ API call successful! Response preview: {response.content[0].text[:30]}...")
    print("\nAnthropic API is working correctly!")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
    sys.exit(1)