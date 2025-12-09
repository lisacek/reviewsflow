import asyncio
import time
from playwright.sync_api import sync_playwright
from app.config import settings


PANEL_SELECTOR = "div.m6QErb.XiKgde.kA9KIf.dS8AEf.XiKgde"
CARD_SELECTOR = "div[data-review-id]"


def _parse_rating(card) -> float | None:
    star_el = card.query_selector(".kvMYJc")
    if not star_el:
        return None

    label = star_el.get_attribute("aria-label")
    if not label:
        return None

    try:
        return float(label.split()[0])
    except Exception:
        return None


def _sort_reviews(reviews: list[dict], mode: str) -> list[dict]:
    if mode == "best":
        return sorted(reviews, key=lambda r: r["stars"], reverse=True)
    if mode == "worst":
        return sorted(reviews, key=lambda r: r["stars"])
    if mode == "oldest":
        return list(reversed(reviews))
    return reviews


def _scrape_sync(
    place_url: str,
    locale: str,
    cfg: dict,
    min_rating: float,
    max_reviews: int,
    sort: str,
):
    print(f"[SCRAPER] START {locale}")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=settings.HEADLESS,
            args=["--no-sandbox", f"--lang={locale}"],
        )

        context = browser.new_context(
            locale=locale,
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            extra_http_headers={"Accept-Language": cfg["accept"]},
            viewport={"width": 1920, "height": 1080},
        )

        page = context.new_page()

        # basic stealth
        page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'languages', { get: () => ['cs-CZ', 'cs'] });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
        """)

        url = f"{place_url}&hl={cfg['hl']}&gl={cfg['gl']}"
        page.goto(url, timeout=60000)

        # cookies
        try:
            page.click('button[jsname="b3VHJd"]', timeout=5000)
        except Exception:
            pass

        page.wait_for_selector(PANEL_SELECTOR, timeout=30000)

        # scroll reviews until growth stalls (collect enough after filtering later)
        last_height = -1
        panel = PANEL_SELECTOR
        stall_count = 0
        STALL_LIMIT = 5
        MAX_SCROLLS = max(60, int(max_reviews * 2))

        for _ in range(MAX_SCROLLS):
            page.eval_on_selector(panel, "el => el.scrollTo(0, el.scrollHeight)")
            time.sleep(0.6)

            height = page.eval_on_selector(panel, "el => el.scrollHeight")
            if height == last_height:
                stall_count += 1
            else:
                stall_count = 0
            last_height = height
            if stall_count >= STALL_LIMIT:
                break

        cards = page.query_selector_all(CARD_SELECTOR)
        print(f"[SCRAPER] Cards found: {len(cards)}")

        # Collect unique reviews (dedupe by data-review-id)
        reviews: list[dict] = []
        seen_ids: set[str] = set()

        for c in cards:
            review_id = c.get_attribute("data-review-id")
            if not review_id or review_id in seen_ids:
                continue

            rating = _parse_rating(c)
            if rating is None or rating < min_rating:
                continue

            reviews.append({
                "reviewId": review_id,
                "name": c.query_selector(".d4r55").inner_text() if c.query_selector(".d4r55") else "",
                "date": c.query_selector(".rsqaWe").inner_text() if c.query_selector(".rsqaWe") else "",
                "stars": rating,
                "text": c.query_selector(".wiI7pd").inner_text() if c.query_selector(".wiI7pd") else "",
                "avatar": c.query_selector(".NBa7we").get_attribute("src") if c.query_selector(".NBa7we") else "",
                "profileLink": c.get_attribute("data-href") or "",
            })
            seen_ids.add(review_id)

            if len(reviews) >= max_reviews:
                break

        browser.close()

        reviews = _sort_reviews(reviews, sort)
        print(f"[SCRAPER] DONE {locale} "+"' "+ str(len(reviews))+" reviews")

        return reviews


async def scrape(
    place_url: str,
    locale: str,
    cfg: dict,
    min_rating: float,
    max_reviews: int,
    sort: str,
):
    return await asyncio.to_thread(
        _scrape_sync,
        place_url,
        locale,
        cfg,
        min_rating,
        max_reviews,
        sort,
    )

