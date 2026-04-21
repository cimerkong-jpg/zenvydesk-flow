"""
Standalone test script for prompt system.
Tests without requiring full environment setup.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Test imports directly
from app.services.prompt_templates import get_template, get_supported_types, DEFAULT_TEMPLATE
from app.services.prompt_builder import PromptBuilder, PromptContext


def test_promotion_template():
    """TEST 1: Promotion template selection."""
    print("\n" + "="*70)
    print("TEST 1: Promotion Template")
    print("="*70)
    
    context = PromptContext(
        product_name="Summer Sale T-Shirt",
        product_description="Premium cotton t-shirt with vibrant summer colors",
        selling_points=["50% off", "Limited time only", "Free shipping"],
        tone="enthusiastic",
        target_audience="Young adults 18-35",
        cta="Shop now before it's gone!"
    )
    
    final_prompt, template_used = PromptBuilder.build_prompt("promotion", context)
    
    print(f"\nRequested content_type: promotion")
    print(f"Selected template: {template_used}")
    print(f"\nFinal Prompt ({len(final_prompt)} chars):")
    print("-" * 70)
    print(final_prompt)
    print("-" * 70)
    
    # Verify
    print("\nVerification:")
    if template_used == "promotion":
        print("✓ Selected template was 'promotion'")
    if "promotional" in final_prompt.lower():
        print("✓ Prompt contains promotional language")
    if "Summer Sale T-Shirt" in final_prompt:
        print("✓ Product name included")
    if "50% off" in final_prompt:
        print("✓ Selling points included")
    
    return template_used == "promotion"


def test_unknown_content_type():
    """TEST 2: Unknown content type fallback."""
    print("\n" + "="*70)
    print("TEST 2: Unknown Content Type Fallback")
    print("="*70)
    
    context = PromptContext(
        product_name="Test Product"
    )
    
    final_prompt, template_used = PromptBuilder.build_prompt("unknown_type_xyz", context)
    
    print(f"\nRequested content_type: unknown_type_xyz")
    print(f"Selected template: {template_used}")
    print(f"\nFinal Prompt ({len(final_prompt)} chars):")
    print("-" * 70)
    print(final_prompt)
    print("-" * 70)
    
    # Verify
    print("\nVerification:")
    if template_used == "general_post":
        print("✓ Fallback template was 'general_post'")
    if "Test Product" in final_prompt:
        print("✓ Product name included")
    
    return template_used == "general_post"


def test_missing_optional_fields():
    """TEST 3: Missing optional fields."""
    print("\n" + "="*70)
    print("TEST 3: Missing Optional Fields")
    print("="*70)
    
    # Only required field
    context = PromptContext(
        product_name="Community Discussion"
        # All optional fields omitted
    )
    
    try:
        final_prompt, template_used = PromptBuilder.build_prompt("engagement", context)
        
        print(f"\nRequested content_type: engagement")
        print(f"Selected template: {template_used}")
        print(f"\nFinal Prompt ({len(final_prompt)} chars):")
        print("-" * 70)
        print(final_prompt)
        print("-" * 70)
        
        # Verify
        print("\nVerification:")
        print("✓ No crash with missing optional fields")
        if template_used == "engagement":
            print("✓ Template was 'engagement'")
        if len(final_prompt) > 0:
            print(f"✓ Prompt was built ({len(final_prompt)} chars)")
        if "Community Discussion" in final_prompt:
            print("✓ Product name included")
        
        return True
    except Exception as e:
        print(f"\n✗ FAIL: {str(e)}")
        return False


def show_all_templates():
    """Show all template examples."""
    print("\n" + "="*70)
    print("ALL TEMPLATE EXAMPLES")
    print("="*70)
    
    templates = get_supported_types()
    
    for template_name in templates:
        context = PromptContext(
            product_name=f"Example {template_name.replace('_', ' ').title()}",
            product_description="High-quality product with great features",
            selling_points=["Feature 1", "Feature 2", "Feature 3"],
            tone="professional yet friendly",
            target_audience="Tech enthusiasts",
            cta="Learn more on our website"
        )
        
        prompt, _ = PromptBuilder.build_prompt(template_name, context)
        
        print(f"\n--- {template_name.upper()} ---")
        print(prompt)
        print()


def main():
    """Run all tests."""
    print("\n" + "="*70)
    print("PROMPT SYSTEM STANDALONE TESTS")
    print("="*70)
    
    # Test 1
    test1_pass = test_promotion_template()
    
    # Test 2
    test2_pass = test_unknown_content_type()
    
    # Test 3
    test3_pass = test_missing_optional_fields()
    
    # Show all templates
    show_all_templates()
    
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"\nTest 1 (Promotion Template): {'PASS' if test1_pass else 'FAIL'}")
    print(f"Test 2 (Unknown Type Fallback): {'PASS' if test2_pass else 'FAIL'}")
    print(f"Test 3 (Missing Optional Fields): {'PASS' if test3_pass else 'FAIL'}")
    
    # Show supported types
    print("\nSupported Content Types:")
    supported = get_supported_types()
    for content_type in supported:
        print(f"  - {content_type}")
    
    print(f"\nDefault Fallback Template: {DEFAULT_TEMPLATE}")


if __name__ == "__main__":
    main()
