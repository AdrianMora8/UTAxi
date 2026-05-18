from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
import time

driver = webdriver.Chrome()
driver.get("http://localhost:4278/register")
time.sleep(2)

nombre = driver.find_element(By.NAME, "fullName")
nombre.send_keys("Carol Cañizares")
time.sleep(2)

correo = driver.find_element(By.NAME, "email")
correo.send_keys("ccanizares3014@uta.edu.ec")
time.sleep(2)

carrera = Select(driver.find_element(By.NAME, "career"))
carrera.select_by_visible_text("Ingeniería en Sistemas")
time.sleep(2)

password = driver.find_element(By.NAME, "password")
password.send_keys("C12345678")
time.sleep(2)

btn = driver.find_element(By.XPATH, "//button[contains(text(),'Crear Cuenta Institucional')]")
btn.click()

time.sleep(3)


