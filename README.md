# 2025-NASA-Space-Apps-Challenge

사용 방법

1) Git소스를 다운 받는다
2) /spacebio/index.html 더블클릭
3) 검색창에 관심 키워드를 입력 → 결과 리스트/빈도 확인
4) 데이터 표에서 제목을 눌러 원문 링크로 이동

* 앱화면 확인 필요 시 spacebio_mobile_singlefile_v3.html 을 실행한다.

화면 구성

- Overview(개요)
  Top Topics: 논문 제목을 토큰화(불용어 제외)해서 자주 등장하는 단어들을 막대 그래프로 보여줌
  Topic Filter를 통해 상위 30, 50, 80, 전체 등의 Chip을 볼 수 있으며
  해당 Chip을 클릭 시 Keyword Search 탭으로 넘어가 해당 문서를 확인할 수 있음

- Explore Publications(논문 탐색)
  상단 검색창(실시간 필터)
  리스트 카드에서 제목을 클릭하면 상세 요약이 화면에 표기됨.

- Keyword Search(키워드 검색)
  여러 키워드를 ANY/ALL 모드로 검색
  검색 세트를 로컬에 저장/삭제(브라우저 localStorage 사용).
  작은 미니차트와 결과 리스트 제공.
