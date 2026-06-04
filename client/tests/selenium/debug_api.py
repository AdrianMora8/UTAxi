import requests

def call(url):
    try:
        r = requests.post(url, json={'email':'selenium-debug@uta.edu.ec','password':'Test12345','fullName':'debug'}, timeout=5)
        print(url, r.status_code, r.text)
    except Exception as e:
        print(url, 'ERROR', e)

if __name__ == '__main__':
    call('http://localhost:4278/api/auth/register')
    call('http://localhost:4000/api/auth/register')
