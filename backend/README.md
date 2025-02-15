# InstaVid Backend

FastAPI 기반의 비디오 생성 서버입니다.

## 설치 방법

```bash
poetry install
```

## 실행 방법

```bash
poetry run uvicorn app.main:app --reload --port 8001
```

## 주요 기능

- 이미지를 비디오로 변환
- 자막 추가
- 배경음악 추가
- GPU 가속 처리 지원 