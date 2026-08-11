# index.html의 ?v=... 버전 표시를 현재 시각으로 갱신합니다.
# GitHub Pages가 css/js를 10분(max-age=600) 캐시하므로, 배포해도 옛 파일이 보일 수 있습니다.
# 커밋 전에 `py stamp.py` 를 실행하면 브라우저가 새 파일을 즉시 받아옵니다.
import re, pathlib, datetime

p = pathlib.Path(__file__).parent / "index.html"
html = p.read_text(encoding="utf-8")
ver = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
new, n = re.subn(r'\?v=[0-9a-zA-Z]+', f'?v={ver}', html)
p.write_text(new, encoding="utf-8")
print(f"버전 {ver} 로 {n}개 갱신")
