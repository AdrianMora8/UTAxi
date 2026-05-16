# pyrefly: ignore [missing-import]
from selenium import webdriver
# pyrefly: ignore [missing-import]
from selenium.webdriver.common.by import By
import time

driver = webdriver.Chrome()
driver.get("http://localhost:4278/login")
time.sleep(2)

correo = driver.find_element(By.NAME, "email")
correo.send_keys("oriofrio0126@uta.edu.ec")
time.sleep(2)

password = driver.find_element(By.NAME, "password")
password.send_keys("MiPassword123")
time.sleep(2)

btn = driver.find_element(By.XPATH, "//button[contains(text(),'Iniciar Sesión')]")
btn.click()
time.sleep(3)
