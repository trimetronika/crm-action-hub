import os
import sys
import json
import re
import subprocess
import requests
from bs4 import BeautifulSoup
import urllib3
from PIL import Image

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class AbsenkuScraper:
    def __init__(self, username, password):
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        self.csrf_token = ""
        
        # Restore hardcoded ps path for seamless experience
        self.ps_path = r"c:\Users\ThinkPad\OneDrive - Universitas Diponegoro\Absenku\.agents\skills\absenku-portal-accessor\scripts\run_ocr.ps1"
        self.temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
        os.makedirs(self.temp_dir, exist_ok=True)
        
        self.raw_image_path = os.path.join(self.temp_dir, "captcha_raw.png")
        self.processed_image_path = os.path.join(self.temp_dir, "captcha_processed.png")

    def _solve_captcha(self):
        captcha_url = "https://prof-dev.absenku.com/web/login/captcha"
        try:
            r = self.session.get(captcha_url, timeout=10)
            with open(self.raw_image_path, "wb") as f:
                f.write(r.content)
            
            img = Image.open(self.raw_image_path).convert("RGBA")
            bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
            combined = Image.alpha_composite(bg, img)
            w, h = combined.size
            resized = combined.resize((w * 4, h * 4), Image.Resampling.LANCZOS)
            resized.convert("RGB").save(self.processed_image_path, "PNG")
            
            result = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", self.ps_path, self.processed_image_path],
                capture_output=True, text=True, timeout=15
            )
            
            try:
                if os.path.exists(self.raw_image_path): os.remove(self.raw_image_path)
                if os.path.exists(self.processed_image_path): os.remove(self.processed_image_path)
            except:
                pass
                
            return re.sub(r'[^a-zA-Z0-9]', '', result.stdout.strip())
        except Exception as e:
            print(f"Error solving captcha: {e}", file=sys.stderr)
            return ""

    def login(self, max_attempts=5):
        login_url = "https://prof-dev.absenku.com/web/login"
        resp = self.session.get(login_url)
        soup = BeautifulSoup(resp.text, 'html.parser')
        csrf_meta = soup.find('meta', {'name': 'csrf-token'})
        self.csrf_token = csrf_meta['content'] if csrf_meta else ""
        
        for attempt in range(1, max_attempts + 1):
            captcha_val = self._solve_captcha()
            if not captcha_val: continue
            
            post_headers = {
                'Csrf-Token': self.csrf_token, 
                'CustomCrsf': 'Custom CRSF',
                'X-Requested-With': 'XMLHttpRequest', 
                'Referer': login_url,
                'Accept': 'application/json, text/javascript, */*; q=0.01'
            }
            post_data = {'username': self.username, 'password': self.password, 'captcha': captcha_val}
            
            login_resp = self.session.post("https://prof-dev.absenku.com/web/login/proses", data=post_data, headers=post_headers, allow_redirects=True)
            
            if "dashboard" in login_resp.url or ("web" in login_resp.url and "login" not in login_resp.url):
                return True
                
            try:
                res_json = login_resp.json()
                if res_json.get('success'): return True
                if 'csrf_token' in res_json: self.csrf_token = res_json['csrf_token']
            except:
                test_dash = self.session.get("https://prof-dev.absenku.com/web")
                if "Dashboard" in test_dash.text: return True
                
        return False

    def fetch_kanban_data(self, start_month=None, end_month=None):
        import datetime
        now = datetime.datetime.now()
        
        start = start_month if start_month else now.strftime("%Y-%m")
        end = end_month if end_month else now.strftime("%Y-%m")
        
        start_date = datetime.datetime.strptime(start, "%Y-%m")
        end_date = datetime.datetime.strptime(end, "%Y-%m")
        
        periods = []
        curr = start_date
        while curr <= end_date:
            periods.append(curr.strftime("%Y-%m"))
            if curr.month == 12:
                curr = curr.replace(year=curr.year+1, month=1)
            else:
                curr = curr.replace(month=curr.month+1)
                
        all_data = []
        for periode in periods:
            url = f"https://prof-dev.absenku.com/web/sales-activity/kanban-board/data/{periode}/all/all/all"
            resp = self.session.get(url)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            spans = [span for span in soup.find_all('span') if span.get('style') and 'color:#FFFFFF' in span.get('style')]
            
            for span in spans:
                stage_name = span.text.strip()
                column_container = span.find_parent('div', class_='card')
                if not column_container:
                    column_container = span.find_parent('li')
                    if not column_container:
                        column_container = span.parent.parent.parent
                    
                if not column_container: continue
                    
                cards = column_container.find_all('div', class_=lambda c: c and 'shadow-card' in c)
                for card in cards:
                    try:
                        name_tag = card.find('h6')
                        name = name_tag.text.strip() if name_tag else ''
                        
                        pic = ""
                        pic_tr = card.find('i', class_=lambda c: c and 'fa-id-card' in c)
                        if pic_tr and pic_tr.find_parent('td'):
                            pic_td = pic_tr.find_parent('td').find_next_sibling('td')
                            pic = pic_td.text.strip() if pic_td else ''
                            
                        phone = ""
                        phone_tr = card.find('i', class_=lambda c: c and 'fa-phone' in c)
                        if phone_tr and phone_tr.find_parent('td'):
                            phone_td = phone_tr.find_parent('td').find_next_sibling('td')
                            phone = phone_td.text.strip() if phone_td else ''
                            
                        deal = ""
                        deal_tr = card.find('i', class_=lambda c: c and 'fa-money' in c)
                        if deal_tr and deal_tr.find_parent('td'):
                            deal_td = deal_tr.find_parent('td').find_next_sibling('td')
                            deal = deal_td.text.strip() if deal_td else ''
                            
                        layanan = ""
                        layanan_tr = card.find('i', class_=lambda c: c and 'fa-tags' in c)
                        if layanan_tr and layanan_tr.find_parent('td'):
                            layanan_td = layanan_tr.find_parent('td').find_next_sibling('td')
                            layanan = layanan_td.text.strip() if layanan_td else ''
                            
                        update_terakhir = ""
                        update_tr = card.find('i', class_=lambda c: c and 'fa-calendar-o' in c)
                        if update_tr and update_tr.find_parent('td'):
                            update_td = update_tr.find_parent('td').find_next_sibling('td')
                            update_terakhir = update_td.text.strip() if update_td else ''
                            
                        all_data.append({
                            "Nama Perusahaan": name,
                            "PIC": pic,
                            "Telepon": phone,
                            "Layanan": layanan,
                            "Nilai Deal": deal,
                            "Tahapan": stage_name,
                            "Bulan": periode,
                            "Update Terakhir": update_terakhir
                        })
                    except:
                        pass
                        
        return all_data

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--user", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--start", required=False)
    parser.add_argument("--end", required=False)
    parser.add_argument("--check-login-only", action="store_true", help="Only verify login credentials")
    args = parser.parse_args()
    
    try:
        scraper = AbsenkuScraper(args.user, args.password)
        if scraper.login():
            if args.check_login_only:
                print(json.dumps({"success": True, "message": "Login verified successfully"}))
            else:
                data = scraper.fetch_kanban_data(args.start, args.end)
                print(json.dumps({"success": True, "data": data}))
        else:
            print(json.dumps({"success": False, "error": "Login gagal. Pastikan kredensial benar atau CAPTCHA gagal di-bypass."}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
