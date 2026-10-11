# 리텐션 하락 진단 — 결과 페이지

<https://cwforest.github.io/retention-drop-page/>

KKBox 청취 로그로 **리텐션 하락의 원인 집단을 자동으로 찾는** 방법을 실험한 결과임.
이 리포는 **페이지 파일만** 담고 있고, 분석 코드와 연구 노트는 따로 있음.

- `index.html` — 페이지
- `web/style.css`, `web/app.js` — 모양과 동작
- `web/data/*.json` — 미리 계산해 둔 숫자 (페이지는 계산하지 않고 읽기만 함)

데이터 원본(KKBox, 1.4GB)은 대회 규정상 재배포하지 않음.

> 이 리포의 파일은 `scripts/publish_page.py` 가 만들어 넣음. 여기서 직접 고치면
> 다음 배포 때 덮어써짐.
