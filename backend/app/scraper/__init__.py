import asyncio
import time
import os
from datetime import datetime
from playwright.sync_api import sync_playwright
from app.config import settings


class ScrapeError(Exception):
    def __init__(self, message: str, screenshot: str | None = None):
        super().__init__(message)
        self.message = message
        self.screenshot = screenshot


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
    max_reviews: int | None,
    sort: str,
):
    print(f"[SCRAPER] START {locale}")

    screenshot_path: str | None = None
    with sync_playwright() as p:
        browser = None
        context = None
        page = None
        try:
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

            # Ensure panel is present; if not, capture screenshot and raise a nice error
            try:
                page.wait_for_selector(PANEL_SELECTOR, timeout=30000)
            except Exception as e:
                screenshots_dir = os.path.join(os.getcwd(), "screenshots")
                os.makedirs(screenshots_dir, exist_ok=True)
                ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
                filename = f"no-panel-{locale}-{ts}.png"
                screenshot_path = os.path.join(screenshots_dir, filename)
                try:
                    page.screenshot(path=screenshot_path, full_page=True)
                except Exception:
                    screenshot_path = None
                msg = (
                    "Could not locate reviews panel on the page. "
                    "The site structure may have changed or content failed to load."
                )
                rel = os.path.join("screenshots", filename) if screenshot_path else None
                print(f"[SCRAPER] ERROR {locale}: {msg} | screenshot={rel}")
                raise ScrapeError(msg, screenshot=rel) from e

            # Aggressive scroll until card growth stalls; aim to exceed desired count by a buffer
            panel = PANEL_SELECTOR
            collect_all = False
            try:
                collect_all = (max_reviews is None) or (int(max_reviews) <= 0)
            except Exception:
                collect_all = False
            try:
                desired = None if collect_all else max(int(max_reviews) + 30, 50)
            except Exception:
                desired = 100
            STALL_LIMIT = 8
            MAX_SCROLLS = 1500 if collect_all else max(200, int((int(max_reviews) if max_reviews else 100) * 12))
            last_count = -1
            no_growth = 0
            for _ in range(MAX_SCROLLS):
                page.eval_on_selector(panel, "el => el.scrollTo(0, el.scrollHeight)")
                time.sleep(0.5)
                cards_now = page.query_selector_all(CARD_SELECTOR)
                cnt = len(cards_now)
                if not collect_all and desired is not None and cnt >= desired:
                    break
                if cnt == last_count:
                    no_growth += 1
                else:
                    no_growth = 0
                last_count = cnt
                if no_growth >= STALL_LIMIT:
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

                if not collect_all:
                    try:
                        if len(reviews) >= int(max_reviews):
                            break
                    except Exception:
                        pass

            reviews = _sort_reviews(reviews, sort)
            print(f"[SCRAPER] DONE {locale} " + str(len(reviews)) + " reviews")
            return reviews
        except ScrapeError:
            # Already handled with screenshot and message; rethrow
            raise
        except Exception as e:
            # Generic failure: capture page screenshot for debugging
            try:
                screenshots_dir = os.path.join(os.getcwd(), "screenshots")
                os.makedirs(screenshots_dir, exist_ok=True)
                ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
                filename = f"error-{locale}-{ts}.png"
                screenshot_path = os.path.join(screenshots_dir, filename)
                if page is not None:
                    page.screenshot(path=screenshot_path, full_page=True)
            except Exception:
                screenshot_path = None
            msg = f"Failed to scrape reviews: {str(e)}"
            rel = os.path.join("screenshots", filename) if screenshot_path else None
            print(f"[SCRAPER] ERROR {locale}: {msg} | screenshot={rel}")
            raise ScrapeError(msg, screenshot=rel) from e
        finally:
            try:
                if context is not None:
                    context.close()
            except Exception:
                pass
            try:
                if browser is not None:
                    browser.close()
            except Exception:
                pass


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

