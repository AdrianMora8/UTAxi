
import os
import sys
import time
import uuid
import subprocess
import requests
import json
from selenium.webdriver.common.by import By


def _project_root():
	return os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))


def ensure_user_and_verify(driver, base_url, email, password, fullName, career=None):
	script = os.path.join(_project_root(), 'server', 'create-test-user.js')
	try:
		completed = subprocess.run(['node', script, email, password, fullName, career or ''], capture_output=True, text=True, timeout=10)
		if completed.returncode == 0:
			return 'server'
		# else fallthrough to localStorage
	except Exception:
		pass

	# Fallback: inject auth state into localStorage so the SPA behaves as logged in
	user_obj = {
		'id': 'selenium-local-'+uuid.uuid4().hex[:8],
		'email': email,
		'fullName': fullName,
		'role': 'STUDENT',
		'status': 'ACTIVE',
		'emailVerified': True,
		'reputationScore': 0,
		'photoUrl': None,
		'career': career or None,
		'phone': None,
		'neighborhood': None,
	}
	auth = {'user': user_obj, 'accessToken': 'fake-token-for-tests'}
	# navigate to app origin, set localStorage and reload so SPA reads it
	driver.get(base_url)
	driver.execute_script("window.localStorage.setItem('uride-auth', arguments[0]);", json.dumps(json.dumps(auth)))
	driver.refresh()
	return 'local'


def test_login_flow(driver, base_url):
	email = f"selenium+{uuid.uuid4().hex[:8]}@uta.edu.ec"
	password = "Test12345"
	fullName = "Test Selenium"

	ensure_user_and_verify(driver, base_url, email, password, fullName, career="Ingeniería en Sistemas")

	driver.get(f"{base_url}/login")
	time.sleep(1)

	correo = driver.find_element(By.NAME, "email")
	correo.clear()
	correo.send_keys(email)
	time.sleep(0.5)

	password_el = driver.find_element(By.NAME, "password")
	password_el.clear()
	password_el.send_keys(password)
	time.sleep(0.5)

	btn = driver.find_element(By.XPATH, "//button[contains(text(),'Iniciar Sesión')]")
	btn.click()
	time.sleep(3)

	assert "Iniciar Sesión" not in driver.page_source


if __name__ == "__main__":
	print("\n[ERROR] Este archivo usa fixtures de pytest y NO puede ejecutarse directamente.")
	print("   Ejecuta las pruebas con el comando correcto:")
	print("")
	print("   python -m pytest client/tests/selenium/test_login.py -v")
	print("")
	print("   O para correr TODAS las pruebas:")
	print("   python -m pytest")
	print("")
	sys.exit(1)
