from __future__ import annotations

from dataclasses import dataclass


SUPPORTED_MARKETS = ("VN", "TH", "PH", "MY")


@dataclass(frozen=True)
class MarketProfile:
    code: str
    label: str
    language: str
    audience: str
    content_guidance: str
    image_guidance: str


MARKET_PROFILES: dict[str, MarketProfile] = {
    "VN": MarketProfile(
        code="VN",
        label="Vietnam",
        language="vi",
        audience="Vietnamese buyers who respond well to concise benefits, social proof, urgency, and direct calls to action.",
        content_guidance="Write naturally in Vietnamese. Use a social-commerce tone that fits Vietnam: clear benefit-first messaging, practical pricing/value framing, trust cues, promotions, bundles, livestream/comment inbox style CTAs when relevant, and mobile-friendly sentence length.",
        image_guidance="Visuals should feel authentic for the Vietnam market: Vietnamese language on visible text, local lifestyle cues, mobile-first shopping energy, warm conversion-focused composition, and promotional styling that suits social selling in Vietnam.",
    ),
    "TH": MarketProfile(
        code="TH",
        label="Thailand",
        language="th",
        audience="Thai buyers who prefer friendly, polished messaging, clear value, trust, and culturally natural social selling language.",
        content_guidance="Write naturally in Thai. Match Thailand social selling behavior: friendly but persuasive tone, clear value proposition, trust-building details, promo-led framing, easy-to-scan copy, and CTAs suited to Facebook commerce in Thailand.",
        image_guidance="Visuals should feel made for Thailand: Thai language on visible text, Thai-friendly retail and lifestyle context, polished Facebook-selling aesthetics, and strong but approachable promotional composition.",
    ),
    "PH": MarketProfile(
        code="PH",
        label="Philippines",
        language="en",
        audience="Filipino buyers who engage with conversational, upbeat, trust-based, promo-aware social commerce content.",
        content_guidance="Write in English tailored for the Philippines, with light Filipino social-commerce flavor when natural. Emphasize affordability, convenience, bundles, proof, seller responsiveness, and enthusiastic but credible CTAs common in Philippine online selling.",
        image_guidance="Visuals should fit the Philippines market: English-first copy, upbeat accessible retail energy, community-driven social shopping feel, approachable aspirational lifestyle context, and promo-friendly composition.",
    ),
    "MY": MarketProfile(
        code="MY",
        label="Malaysia",
        language="ms",
        audience="Malaysian buyers who respond to clear value, practical everyday benefits, trust, and clean marketplace-ready presentation.",
        content_guidance="Write naturally for Malaysia, primarily in Malay unless a different language is explicitly required. Reflect Malaysian online buying behavior: practical benefits, trust and convenience, promo/value framing, and polished social-commerce wording suitable for Facebook selling.",
        image_guidance="Visuals should fit the Malaysia market: Malay-friendly text treatment, clean marketplace presentation, practical lifestyle cues, trustworthy commercial styling, and value-oriented retail composition.",
    ),
}


def normalize_market(value: str | None) -> str:
    if not value:
        return "TH"
    candidate = value.upper().strip()
    return candidate if candidate in MARKET_PROFILES else "TH"


def get_market_profile(value: str | None) -> MarketProfile:
    return MARKET_PROFILES[normalize_market(value)]

