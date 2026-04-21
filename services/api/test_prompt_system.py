"""
Test script for prompt system with templates.
Tests promotion template, unknown type fallback, and missing optional fields.
"""
import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ai_generation import generate_post_content
from app.services.prompt_builder import PromptBuilder


def test_promotion_template():
    """TEST 1: Generate with mock using promotion template."""
    print("\n" + "="*70)
    print("TEST 1: Mock Provider with Promotion Template")
    print("="*70)
    
    result = generate_post_content(
        content_type="promotion",
        product_name="Summer Sale T-Shirt",
        product_description="Premium cotton t-shirt with vibrant summer colors",
        selling_points=["50% off", "Limited time only", "Free shipping"],
        tone="enthusiastic",
        target_audience="Young adults 18-35",
        cta="Shop now before it's gone!",
        provider="mock",
        model="test-model"
    )
    
    print("\nAPI Response JSON:")
    response_json = {
        "success": result.success,
        "content": result.content,
        "provider": result.provider,
        "model": result.model,
        "provider_response": result.provider_response,
        "error": result.error
    }
    print(json.dumps(response_json, indent=2))
    
    # Verify
    print("\nVerification:")
    if result.success:
        print("✓ success=true")
    
    if result.provider_response and result.provider_response.get("template_used") == "promotion":
        print("✓ Selected template was 'promotion'")
    
    if "[template:promotion]" in result.content:
        print("✓ Content confirms promotion template")
    
    return result


def test_unknown_content_type():
    """TEST 2: Generate with unknown content_type."""
    print("\n" + "="*70)
    print("TEST 2: Unknown Content Type Fallback")
    print("="*70)
    
    result = generate_post_content(
        content_type="unknown_type_xyz",
        product_name="Test Product",
        provider="mock",
        model="test-model"
    )
    
    print("\nAPI Response JSON:")
    response_json = {
        "success": result.success,
        "content": result.content,
        "provider": result.provider,
        "model": result.model,
        "provider_response": result.provider_response,
        "error": result.error
    }
    print(json.dumps(response_json, indent=2))
    
    # Verify
    print("\nVerification:")
    if result.success:
        print("✓ success=true (fallback worked)")
    
    if result.provider_response and result.provider_response.get("template_used") == "general_post":
        print("✓ Fallback template was 'general_post'")
    
    if "[template:general_post]" in result.content:
        print("✓ Content confirms general_post fallback")
    
    return result


def test_missing_optional_fields():
    """TEST 3: Generate with missing optional fields."""
    print("\n" + "="*70)
    print("TEST 3: Missing Optional Fields")
    print("="*70)
    
    # Only provide required fields
    result = generate_post_content(
        content_type="engagement",
        product_name="Community Discussion",
        # No optional fields provided
        provider="mock",
        model="test-model"
    )
    
    print("\nAPI Response JSON:")
    response_json = {
        "success": result.success,
        "content": result.content,
        "provider": result.provider,
        "model": result.model,
        "provider_response": result.provider_response,
        "error": result.error
    }
    print(json.dumps(response_json, indent=2))
    
    # Verify
    print("\nVerification:")
    if result.success:
        print("✓ success=true (prompt builder handled missing fields)")
    
    if result.provider_response and result.provider_response.get("template_used") == "engagement":
        print("✓ Template was 'engagement'")
    
    if result.provider_response and result.provider_response.get("prompt_length") > 0:
        print(f"✓ Prompt was built ({result.provider_response.get('prompt_length')} chars)")
    
    print("✓ No crash with missing optional fields")
    
    return result


def show_example_prompts():
    """Show example final prompts for each template."""
    print("\n" + "="*70)
    print("EXAMPLE FINAL PROMPTS")
    print("="*70)
    
    from app.services.prompt_builder import PromptContext
    
    templates = [
        ("product_intro", "New Wireless Headphones"),
        ("promotion", "Summer Sale Item"),
        ("engagement", "Customer Feedback"),
        ("general_post", "Brand Update")
    ]
    
    for template_name, product in templates:
        context = PromptContext(
            product_name=product,
            product_description="High-quality product with great features",
            selling_points=["Feature 1", "Feature 2", "Feature 3"],
            tone="professional yet friendly",
            target_audience="Tech enthusiasts",
            cta="Learn more on our website"
        )
        
        prompt, _ = PromptBuilder.build_prompt(template_name, context)
        
        print(f"\n--- {template_name.upper()} ---")
        print(prompt[:300] + "..." if len(prompt) > 300 else prompt)


def main():
    """Run all tests."""
    print("\n" + "="*70)
    print("PROMPT SYSTEM TESTS")
    print("="*70)
    
    # Test 1
    test1_result = test_promotion_template()
    
    # Test 2
    test2_result = test_unknown_content_type()
    
    # Test 3
    test3_result = test_missing_optional_fields()
    
    # Show examples
    show_example_prompts()
    
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"\nTest 1 (Promotion Template): {'PASS' if test1_result.success else 'FAIL'}")
    print(f"Test 2 (Unknown Type Fallback): {'PASS' if test2_result.success else 'FAIL'}")
    print(f"Test 3 (Missing Optional Fields): {'PASS' if test3_result.success else 'FAIL'}")
    
    # Show supported types
    print("\nSupported Content Types:")
    supported = PromptBuilder.get_supported_content_types()
    for content_type in supported:
        print(f"  - {content_type}")


if __name__ == "__main__":
    main()
