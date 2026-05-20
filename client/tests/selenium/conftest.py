import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


@pytest.fixture(scope="session")
def base_url():
    return os.environ.get("BASE_URL", "http://localhost:4278")


@pytest.fixture(scope="function")
def driver():
    options = Options()
    headless = os.environ.get("HEADLESS", "true").lower() in ("1", "true", "yes")
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")

    # Selenium 4.6+ includes selenium-manager which can download drivers automatically.
    driver = webdriver.Chrome(options=options)
    yield driver
    try:
        driver.quit()
    except Exception:
        pass
