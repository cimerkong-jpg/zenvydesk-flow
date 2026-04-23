from app.models.product import Product
from app.services.ai.prompt_builder import build_prompt
from app.services.market_profiles import get_market_profile, normalize_market


def test_normalize_market_falls_back_to_th():
    assert normalize_market(None) == "TH"
    assert normalize_market("unknown") == "TH"


def test_get_market_profile_for_vn_returns_vietnamese_defaults():
    profile = get_market_profile("VN")

    assert profile.code == "VN"
    assert profile.language == "vi"
    assert "Vietnamese buyers" in profile.audience


def test_build_prompt_includes_market_specific_guidance():
    product = Product(name="Serum Pro", description="Brightening serum", price="299000 VND")

    prompt = build_prompt(
        product=product,
        market="VN",
        tone="marketing",
        language="vi",
    )

    assert "Target market: Vietnam (VN)" in prompt
    assert "Language: vi" in prompt
    assert "Vietnam" in prompt
    assert "Vietnamese" in prompt
